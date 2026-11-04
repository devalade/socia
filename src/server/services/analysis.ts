import { and, desc, eq } from 'void/db'
import { analysisRuns, hypotheses, investigations, queries, timelineEvents } from '../../../db/schema'
import { parseAnalysis, type InvestigationAnalysis } from '../../lib/ai'
import { newId } from '../../lib/ids'
import { buildSystemPrompt, buildUserPrompt, type PromptInput, type PromptQuery } from '../../lib/prompt'
import { scanForPromptInjection } from '../../lib/prompt'
import type { AlertSummary } from '../../lib/alert'
import { audit } from '../audit'
import { db } from '../db'
import { AppError, invalid, safeProviderError } from '../errors'
import type { Actor } from '../session'
import { runChatCompletion } from '../ai/providers'
import { resolveLocalModelForRun } from '../ai/local'
import { requireInvestigation } from './investigations'

export type AnalysisResult = {
  runId: string
  analysis: InvestigationAnalysis
  durationMs: number
  modelId: string
  providerName: string
}

function parseContext(value: string | null): InvestigationAnalysis | null {
  if (!value) return null
  try {
    const raw = JSON.parse(value) as unknown
    // The persisted analysis was already validated when written; this is a cheap shape guard.
    return raw && typeof raw === 'object' && 'summary' in raw ? (raw as InvestigationAnalysis) : null
  } catch {
    return null
  }
}

function normalizeKql(kql: string): string {
  return kql.toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function runAnalysis(actor: Actor, investigationId: string): Promise<AnalysisResult> {
  const investigation = await requireInvestigation(actor, investigationId, 'edit')
  if (actor.role === 'viewer') throw invalid('Votre rôle est en lecture seule.')
  if (investigation.status === 'archived') throw invalid('Une investigation archivée ne peut pas être relancée.')
  if (investigation.status === 'concluded') {
    throw invalid('Rouvrez l’investigation avant de relancer une analyse.')
  }

  const [running] = await db
    .select({ id: analysisRuns.id, createdAt: analysisRuns.createdAt })
    .from(analysisRuns)
    .where(and(eq(analysisRuns.investigationId, investigationId), eq(analysisRuns.status, 'running')))
    .orderBy(desc(analysisRuns.createdAt))
    .limit(1)
  if (running) {
    const ageMs = Date.now() - new Date(running.createdAt).getTime()
    if (ageMs < 3 * 60_000) {
      throw new AppError('analysis_running', 'Une analyse est déjà en cours pour cette investigation.', 409)
    }
    // A worker can disappear mid-call. Recover the lock instead of blocking the investigation forever.
    await db
      .update(analysisRuns)
      .set({
        status: 'failed',
        error: 'Analyse interrompue avant la fin. Le contexte est conservé ; relancez l’analyse.',
        completedAt: new Date().toISOString(),
      })
      .where(eq(analysisRuns.id, running.id))
    await db
      .update(investigations)
      .set({ status: investigation.currentAnalysisId ? 'in_progress' : 'draft', updatedAt: new Date().toISOString() })
      .where(eq(investigations.id, investigationId))
    await audit(actor, {
      action: 'analysis.recover_stale',
      entityType: 'analysis_run',
      entityId: running.id,
      investigationId,
      metadata: { ageMinutes: Math.round(ageMs / 60_000) },
    })
  }

  const model = await resolveLocalModelForRun()
  if (investigation.modelId !== model.modelId || investigation.providerId !== model.providerId) {
    await db
      .update(investigations)
      .set({ modelId: model.modelId, providerId: model.providerId, updatedAt: new Date().toISOString() })
      .where(eq(investigations.id, investigationId))
  }
  const summary = JSON.parse(investigation.alertSummaryJson) as AlertSummary & { securityFlags?: string[] }
  const existingQueries = await db
    .select()
    .from(queries)
    .where(eq(queries.investigationId, investigationId))
    .orderBy(desc(queries.createdAt))
  const [currentAnalysisRow] = investigation.currentAnalysisId
    ? await db.select().from(analysisRuns).where(eq(analysisRuns.id, investigation.currentAnalysisId)).limit(1)
    : []
  const previous = parseContext(currentAnalysisRow?.contentJson ?? null)
  const kind: 'initial' | 'reanalysis' = previous ? 'reanalysis' : 'initial'

  const promptQueries: PromptQuery[] = existingQueries.map((query) => ({
    question: query.question,
    kql: query.kql,
    targetIndex: query.targetIndex,
    timeRange: query.timeRange,
    status: query.status,
    resultRowCount: query.resultRowCount,
    resultSummary: query.resultSummary,
    resultRaw: query.resultRaw,
  }))

  const promptInput: PromptInput = {
    mode: kind,
    title: investigation.title,
    severity: investigation.severity as PromptInput['severity'],
    alertRaw: investigation.alertRaw,
    alertSummary: summary,
    ruleDefinition: investigation.ruleDefinition,
    observations: investigation.observations,
    priorSearches: investigation.priorSearches,
    analysis: previous,
    queries: promptQueries,
  }
  const system = buildSystemPrompt()
  const user = buildUserPrompt(promptInput)
  const securityFlags = scanForPromptInjection(investigation.alertRaw)
  const runId = newId('run')
  const started = Date.now()

  await db.insert(analysisRuns).values({
    id: runId,
    investigationId,
    kind,
    status: 'running',
    modelId: model.modelId,
    providerId: model.providerId,
    promptVersion: 'soc-v1',
    inputContextJson: JSON.stringify({
      mode: kind,
      promptChars: user.length,
      alertChars: investigation.alertRaw.length,
      queryIds: existingQueries.map((query) => query.id),
      executedQueryCount: existingQueries.filter((query) => query.status === 'executed').length,
      securityFlags,
    }),
    createdBy: actor.userId,
  })
  await db
    .update(investigations)
    .set({ status: 'analyzing', updatedAt: new Date().toISOString() })
    .where(eq(investigations.id, investigationId))

  let completion
  try {
    completion = await runChatCompletion({ model, system, user, maxTokens: 8192 })
  } catch (error) {
    const message = error instanceof AppError ? error.message : safeProviderError(error)
    await db
      .update(analysisRuns)
      .set({ status: 'failed', error: message, durationMs: Date.now() - started, completedAt: new Date().toISOString() })
      .where(eq(analysisRuns.id, runId))
    await db
      .update(investigations)
      .set({ status: previous ? 'in_progress' : 'draft', updatedAt: new Date().toISOString() })
      .where(eq(investigations.id, investigationId))
    await audit(actor, {
      action: 'analysis.failed',
      entityType: 'analysis_run',
      entityId: runId,
      investigationId,
      metadata: { model: model.modelId, provider: model.providerId, mode: kind },
    })
    throw error
  }

  const parsed = parseAnalysis(completion.text)
  const durationMs = Date.now() - started
  if (!parsed.ok) {
    await db
      .update(analysisRuns)
      .set({
        status: 'failed',
        error: parsed.error,
        rawResponse: parsed.raw.slice(0, 200_000),
        durationMs,
        completedAt: new Date().toISOString(),
      })
      .where(eq(analysisRuns.id, runId))
    await db
      .update(investigations)
      .set({ status: previous ? 'in_progress' : 'draft', updatedAt: new Date().toISOString() })
      .where(eq(investigations.id, investigationId))
    await audit(actor, {
      action: 'analysis.invalid_output',
      entityType: 'analysis_run',
      entityId: runId,
      investigationId,
      metadata: { model: model.modelId, provider: model.providerId, mode: kind },
    })
    throw new AppError('analysis_invalid', parsed.error, 502)
  }

  const analysis = parsed.analysis
  const executedBefore = existingQueries.filter((query) => query.status === 'executed').length
  if (
    kind === 'initial' &&
    executedBefore === 0 &&
    ['confirmed_incident', 'false_positive', 'legitimate'].includes(analysis.provisionalAssessment.verdict)
  ) {
    analysis.provisionalAssessment = {
      ...analysis.provisionalAssessment,
      verdict: 'undetermined',
      rationale: `${analysis.provisionalAssessment.rationale} Aucun résultat de recherche n’a encore été importé : SOCIA ne conclut pas. Le verdict final appartient à l’analyste.`,
    }
  }
  const now = new Date().toISOString()

  await db
    .update(analysisRuns)
    .set({
      status: 'completed',
      contentJson: JSON.stringify(analysis),
      rawResponse: completion.text.slice(0, 200_000),
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      durationMs,
      completedAt: now,
    })
    .where(eq(analysisRuns.id, runId))

  // Hypotheses are versioned by run: the previous set stays available in history, the new set is current.
  await db.update(hypotheses).set({ isCurrent: false }).where(eq(hypotheses.investigationId, investigationId))
  if (analysis.hypotheses.length) {
    await db.insert(hypotheses).values(
      analysis.hypotheses.map((hypothesis) => ({
        id: newId('hyp'),
        investigationId,
        analysisRunId: runId,
        statement: hypothesis.statement,
        status: hypothesis.status,
        confidence: Math.round(hypothesis.confidence),
        rationale: hypothesis.rationale,
        evidence: hypothesis.evidence,
        isCurrent: true,
      })),
    )
  }

  // Timeline is a derived view of the latest analysis. The run history keeps every earlier version.
  await db.delete(timelineEvents).where(eq(timelineEvents.investigationId, investigationId))
  if (analysis.timeline.length) {
    await db.insert(timelineEvents).values(
      analysis.timeline.map((event) => ({
        id: newId('evt'),
        investigationId,
        analysisRunId: runId,
        timestampText: event.timestamp,
        event: event.event,
        source: event.source,
        certainty: event.certainty,
      })),
    )
  }

  const knownKql = new Set(existingQueries.map((query) => normalizeKql(query.kql)))
  const newQueries = analysis.investigationAxes.filter((query) => {
    const normalized = normalizeKql(query.kql)
    if (!normalized || knownKql.has(normalized)) return false
    knownKql.add(normalized)
    return true
  })
  if (newQueries.length) {
    await db.insert(queries).values(
      newQueries.map((query) => ({
        id: newId('qry'),
        investigationId,
        analysisRunId: runId,
        question: query.question,
        rationale: query.why,
        kql: query.kql,
        targetIndex: query.targetIndex,
        timeRange: query.timeRange,
        priority: query.priority,
        status: 'proposed',
      })),
    )
  }

  await db
    .update(investigations)
    .set({
      currentAnalysisId: runId,
      status: 'in_progress',
      modelId: model.modelId,
      providerId: model.providerId,
      updatedAt: now,
      lastActivityAt: now,
    })
    .where(eq(investigations.id, investigationId))

  await audit(actor, {
    action: kind === 'initial' ? 'analysis.initial' : 'analysis.reanalysis',
    entityType: 'analysis_run',
    entityId: runId,
    investigationId,
    metadata: {
      model: model.modelId,
      provider: model.providerId,
      durationMs,
      newQueries: newQueries.length,
      hypotheses: analysis.hypotheses.length,
      securityFlags: securityFlags.length,
    },
  })

  return {
    runId,
    analysis,
    durationMs,
    modelId: model.modelId,
    providerName: model.providerName,
  }
}

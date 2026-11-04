import { and, desc, eq, inArray, like, or, sql } from 'void/db'
import {
  analysisRuns,
  comments,
  hypotheses,
  investigations,
  queries,
  reports,
  timelineEvents,
  user,
} from '../../../db/schema'
import type { AlertSummary, Severity, Verdict } from '../../lib/alert'
import { alertTitle, parseAlertJson, SEVERITIES, VERDICTS } from '../../lib/alert'
import type { InvestigationAnalysis } from '../../lib/ai'
import { analysisSchema, sanitizeKql } from '../../lib/ai'
import { newId } from '../../lib/ids'
import { QUERY_STATUS_LABELS, STATUS_LABELS, type InvestigationStatus, type QueryStatus } from '../../lib/investigation-labels'
import { describeResult } from '../../lib/result'
import { can, canEditInvestigation } from '../../lib/roles'
import { scanForPromptInjection } from '../../lib/prompt'
import { audit } from '../audit'
import { db } from '../db'
import { forbidden, invalid, notFound } from '../errors'
import type { Actor } from '../session'
import { LOCAL_PROVIDER_ID, detectLocalModel, localModelConfig } from '../ai/local'

export const MAX_ALERT_BYTES = 1_500_000
export const MAX_RESULT_BYTES = 900_000
export const MAX_RULE_BYTES = 120_000
export const MAX_OBSERVATIONS = 20_000
export const MAX_PRIOR_SEARCHES = 250_000

export type { InvestigationStatus, QueryStatus }
export { QUERY_STATUS_LABELS, STATUS_LABELS }

export type InvestigationRow = typeof investigations.$inferSelect

export type InvestigationListItem = {
  id: string
  title: string
  status: InvestigationStatus
  severity: Severity
  verdict: Verdict | null
  confidence: number | null
  ownerName: string
  ownerId: string
  ruleName: string | null
  modelId: string
  providerId: string
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  queryCount: number
  openQueryCount: number
  reportVersion: number | null
}

export type QueryView = typeof queries.$inferSelect
export type HypothesisView = typeof hypotheses.$inferSelect
export type CommentView = { id: string; body: string; createdAt: string; authorName: string; authorId: string }
export type AnalysisRunSummary = {
  id: string
  kind: string
  status: string
  modelId: string
  providerId: string
  createdAt: string
  completedAt: string | null
  error: string | null
}
export type ReportSummary = { id: string; version: number; verdict: string; createdAt: string }

export type InvestigationDetail = {
  investigation: Omit<InvestigationRow, 'alertRaw'> & { alertRaw: string }
  ownerName: string
  summary: AlertSummary & { securityFlags?: string[] }
  analysis: InvestigationAnalysis | null
  analysisRun: AnalysisRunSummary | null
  hypotheses: HypothesisView[]
  queries: QueryView[]
  comments: CommentView[]
  timeline: { id: string; timestampText: string; event: string; source: string; certainty: string }[]
  runs: AnalysisRunSummary[]
  reports: ReportSummary[]
  modelLabel: string
  providerLabel: string
  canEdit: boolean
  securityFlags: string[]
}

export async function requireInvestigation(
  actor: Actor,
  investigationId: string,
  mode: 'view' | 'edit' = 'view',
): Promise<InvestigationRow> {
  if (!can(actor.role, 'investigation.view')) throw forbidden()
  const [row] = await db
    .select()
    .from(investigations)
    .where(eq(investigations.id, investigationId))
    .limit(1)
  if (!row) throw notFound('Investigation')
  if (mode === 'edit' && !canEditInvestigation(actor.role, actor.userId, row.ownerId)) {
    throw forbidden('Seul le propriétaire de l’investigation ou un administrateur peut la modifier.')
  }
  return row
}

export async function createInvestigation(
  actor: Actor,
  input: {
    alertJson: string
    title?: string
    ruleDefinition?: string
    observations?: string
    priorSearches?: string
  },
): Promise<{ id: string; title: string }> {
  if (!can(actor.role, 'investigation.create')) throw forbidden('Votre rôle ne permet pas de créer une investigation.')
  if (new TextEncoder().encode(input.alertJson).length > MAX_ALERT_BYTES) {
    throw invalid('Le JSON de l’alerte dépasse la limite de 1,5 Mo.')
  }
  const parsed = parseAlertJson(input.alertJson)
  if (!parsed.ok) throw invalid(parsed.error)

  if ((input.ruleDefinition?.length ?? 0) > MAX_RULE_BYTES) throw invalid('La définition de règle est trop volumineuse.')
  if ((input.observations?.length ?? 0) > MAX_OBSERVATIONS) throw invalid('Les observations sont trop longues.')
  if ((input.priorSearches?.length ?? 0) > MAX_PRIOR_SEARCHES) throw invalid('Les recherches antérieures sont trop volumineuses.')

  // Resolves the provider and model, and proves the provider is usable before we persist anything.
  const detected = await detectLocalModel()
  const model = detected.available ? detected : localModelConfig()
  const title = (input.title?.trim() || alertTitle(parsed.summary)).slice(0, 160)
  const id = newId('inv')
  const flags = scanForPromptInjection(input.alertJson)
  const summary = { ...parsed.summary, securityFlags: flags }

  await db.insert(investigations).values({
    id,
    ownerId: actor.userId,
    title,
    severity: parsed.summary.severity,
    modelId: model.modelId,
    providerId: model.providerId,
    alertRaw: input.alertJson,
    alertSummaryJson: JSON.stringify(summary),
    ruleDefinition: input.ruleDefinition?.trim() ?? '',
    observations: input.observations?.trim() ?? '',
    priorSearches: input.priorSearches?.trim() ?? '',
  })

  await audit(actor, {
    action: 'investigation.create',
    entityType: 'investigation',
    entityId: id,
    investigationId: id,
    metadata: {
      severity: parsed.summary.severity,
      ruleName: parsed.summary.ruleName,
      model: model.modelId,
      provider: model.providerId,
      alertBytes: input.alertJson.length,
    },
  })

  return { id, title }
}

export async function getInvestigationDetail(actor: Actor, investigationId: string): Promise<InvestigationDetail> {
  const row = await requireInvestigation(actor, investigationId, 'view')
  const [owner] = await db.select({ name: user.name }).from(user).where(eq(user.id, row.ownerId)).limit(1)
  const [analysisRow] = row.currentAnalysisId
    ? await db.select().from(analysisRuns).where(eq(analysisRuns.id, row.currentAnalysisId)).limit(1)
    : []
  let analysis: InvestigationAnalysis | null = null
  if (analysisRow?.contentJson) {
    try {
      const parsed = analysisSchema.safeParse(JSON.parse(analysisRow.contentJson))
      analysis = parsed.success ? parsed.data : null
    } catch {
      analysis = null
    }
  }
  const [hypothesisRows, queryRows, commentRows, runs, reportRows, timelineRows] = await Promise.all([
    db
      .select()
      .from(hypotheses)
      .where(and(eq(hypotheses.investigationId, investigationId), eq(hypotheses.isCurrent, true)))
      .orderBy(desc(hypotheses.createdAt)),
    db.select().from(queries).where(eq(queries.investigationId, investigationId)).orderBy(desc(queries.createdAt)),
    db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        authorId: comments.userId,
        authorName: user.name,
      })
      .from(comments)
      .innerJoin(user, eq(comments.userId, user.id))
      .where(eq(comments.investigationId, investigationId))
      .orderBy(desc(comments.createdAt)),
    db
      .select()
      .from(analysisRuns)
      .where(eq(analysisRuns.investigationId, investigationId))
      .orderBy(desc(analysisRuns.createdAt))
      .limit(30),
    db
      .select({ id: reports.id, version: reports.version, verdict: reports.verdict, createdAt: reports.createdAt })
      .from(reports)
      .where(eq(reports.investigationId, investigationId))
      .orderBy(desc(reports.version)),
    db
      .select({
        id: timelineEvents.id,
        timestampText: timelineEvents.timestampText,
        event: timelineEvents.event,
        source: timelineEvents.source,
        certainty: timelineEvents.certainty,
      })
      .from(timelineEvents)
      .where(eq(timelineEvents.investigationId, investigationId))
      .orderBy(timelineEvents.createdAt),
  ])

  const summary = JSON.parse(row.alertSummaryJson) as AlertSummary & { securityFlags?: string[] }
  const securityFlags = summary.securityFlags ?? scanForPromptInjection(row.alertRaw)

  return {
    investigation: row,
    ownerName: owner?.name ?? 'Analyste inconnu',
    summary,
    analysis,
    analysisRun: analysisRow
      ? {
          id: analysisRow.id,
          kind: analysisRow.kind,
          status: analysisRow.status,
          modelId: analysisRow.modelId,
          providerId: analysisRow.providerId,
          createdAt: analysisRow.createdAt,
          completedAt: analysisRow.completedAt,
          error: analysisRow.error,
        }
      : null,
    hypotheses: hypothesisRows,
    queries: queryRows,
    comments: commentRows,
    timeline: timelineRows,
    runs: runs.map((run) => ({
      id: run.id,
      kind: run.kind,
      status: run.status,
      modelId: run.modelId,
      providerId: run.providerId,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
      error: run.error,
    })),
    reports: reportRows,
    modelLabel: row.modelId,
    providerLabel: (analysisRow?.providerId ?? row.providerId) === LOCAL_PROVIDER_ID ? 'Ollama local' : (analysisRow?.providerId ?? row.providerId),
    canEdit: canEditInvestigation(actor.role, actor.userId, row.ownerId),
    securityFlags,
  }
}

export async function updateInvestigation(
  actor: Actor,
  investigationId: string,
  input: { title: string; severity: Severity; ruleDefinition?: string; observations?: string },
): Promise<void> {
  await requireInvestigation(actor, investigationId, 'edit')
  if (!SEVERITIES.includes(input.severity)) throw invalid('Sévérité invalide.')
  const now = new Date().toISOString()
  await db
    .update(investigations)
    .set({
      title: input.title.trim().slice(0, 160),
      severity: input.severity,
      ruleDefinition: input.ruleDefinition?.slice(0, MAX_RULE_BYTES) ?? undefined,
      observations: input.observations?.slice(0, MAX_OBSERVATIONS) ?? undefined,
      updatedAt: now,
      lastActivityAt: now,
    })
    .where(eq(investigations.id, investigationId))
  await audit(actor, {
    action: 'investigation.update',
    entityType: 'investigation',
    entityId: investigationId,
    investigationId,
    metadata: { severity: input.severity },
  })
}

export async function listInvestigations(
  actor: Actor,
  filters: {
    search?: string
    status?: string
    severity?: string
    verdict?: string
    page?: number
    pageSize?: number
  },
): Promise<{ rows: InvestigationListItem[]; total: number; page: number; pageSize: number }> {
  if (!can(actor.role, 'investigation.view')) throw forbidden()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 12))
  const conditions = []
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`
    conditions.push(or(like(investigations.title, term), like(investigations.alertSummaryJson, term)))
  }
  if (filters.status && filters.status !== 'all') conditions.push(eq(investigations.status, filters.status))
  if (filters.severity && filters.severity !== 'all') conditions.push(eq(investigations.severity, filters.severity))
  if (filters.verdict && filters.verdict !== 'all') conditions.push(eq(investigations.verdict, filters.verdict))
  const where = conditions.length ? and(...conditions) : undefined

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(investigations)
    .where(where)
  const total = Number(countRow?.count ?? 0)

  const rows = await db
    .select({
      id: investigations.id,
      title: investigations.title,
      status: investigations.status,
      severity: investigations.severity,
      verdict: investigations.verdict,
      confidence: investigations.confidence,
      ownerId: investigations.ownerId,
      ownerName: user.name,
      modelId: investigations.modelId,
      providerId: investigations.providerId,
      alertSummaryJson: investigations.alertSummaryJson,
      createdAt: investigations.createdAt,
      updatedAt: investigations.updatedAt,
      lastActivityAt: investigations.lastActivityAt,
    })
    .from(investigations)
    .innerJoin(user, eq(investigations.ownerId, user.id))
    .where(where)
    .orderBy(desc(investigations.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const ids = rows.map((row) => row.id)
  const [queryCounts, openQueryCounts, reportVersions] = await Promise.all([
    ids.length
      ? db
          .select({ investigationId: queries.investigationId, count: sql<number>`count(*)` })
          .from(queries)
          .where(inArray(queries.investigationId, ids))
          .groupBy(queries.investigationId)
      : Promise.resolve([]),
    ids.length
      ? db
          .select({ investigationId: queries.investigationId, count: sql<number>`count(*)` })
          .from(queries)
          .where(and(eq(queries.status, 'proposed'), inArray(queries.investigationId, ids)))
          .groupBy(queries.investigationId)
      : Promise.resolve([]),
    ids.length
      ? db
          .select({ investigationId: reports.investigationId, version: reports.version })
          .from(reports)
          .where(inArray(reports.investigationId, ids))
      : Promise.resolve([]),
  ])

  return {
    total,
    page,
    pageSize,
    rows: rows.map((row) => {
      const summary = JSON.parse(row.alertSummaryJson) as AlertSummary
      const versions = reportVersions.filter((report) => report.investigationId === row.id)
      return {
        id: row.id,
        title: row.title,
        status: row.status as InvestigationStatus,
        severity: row.severity as Severity,
        verdict: row.verdict as Verdict | null,
        confidence: row.confidence,
        ownerName: row.ownerName,
        ownerId: row.ownerId,
        ruleName: summary.ruleName,
        modelId: row.modelId,
        providerId: row.providerId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastActivityAt: row.lastActivityAt,
        queryCount: Number(queryCounts.find((item) => item.investigationId === row.id)?.count ?? 0),
        openQueryCount: Number(openQueryCounts.find((item) => item.investigationId === row.id)?.count ?? 0),
        reportVersion: versions.length ? Math.max(...versions.map((report) => report.version)) : null,
      }
    }),
  }
}

export async function importQueryResult(
  actor: Actor,
  investigationId: string,
  queryId: string,
  rawJson: string,
): Promise<QueryView> {
  await requireInvestigation(actor, investigationId, 'edit')
  if (!can(actor.role, 'query.import')) throw forbidden('Votre rôle ne permet pas d’importer des résultats.')
  if (new TextEncoder().encode(rawJson).length > MAX_RESULT_BYTES) {
    throw invalid('Le résultat dépasse la limite de 900 Ko. Réduisez la requête ou exportez un échantillon.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'JSON invalide'
    throw invalid(`Le résultat n’est pas un JSON valide : ${detail}`)
  }
  if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
    throw invalid('Le résultat doit être un objet ou un tableau JSON.')
  }
  const [query] = await db
    .select()
    .from(queries)
    .where(and(eq(queries.id, queryId), eq(queries.investigationId, investigationId)))
    .limit(1)
  if (!query) throw notFound('Requête')
  if (query.status === 'executed') {
    // Re-import is allowed, but the analyst must know it replaces the previous evidence.
  }

  const meta = describeResult(parsed)
  const now = new Date().toISOString()
  await db
    .update(queries)
    .set({
      status: 'executed',
      resultRaw: rawJson,
      resultMetaJson: JSON.stringify(meta),
      resultSummary: meta.summary,
      resultRowCount: meta.rowCount,
      importedBy: actor.userId,
      importedAt: now,
      updatedAt: now,
    })
    .where(eq(queries.id, queryId))
  await db
    .update(investigations)
    .set({
      status: 'in_progress',
      updatedAt: now,
      lastActivityAt: now,
    })
    .where(eq(investigations.id, investigationId))
  await audit(actor, {
    action: 'query.import_result',
    entityType: 'query',
    entityId: queryId,
    investigationId,
    metadata: { rowCount: meta.rowCount, bytes: rawJson.length, empty: meta.rowCount === 0 },
  })
  const [updated] = await db.select().from(queries).where(eq(queries.id, queryId)).limit(1)
  return updated
}

export async function createManualQuery(
  actor: Actor,
  investigationId: string,
  input: { question: string; rationale: string; kql: string; targetIndex: string; timeRange: string },
): Promise<QueryView> {
  await requireInvestigation(actor, investigationId, 'edit')
  if (!can(actor.role, 'query.import')) throw forbidden()
  const kql = sanitizeKql(input.kql)
  if (!kql) throw invalid('La requête KQL est vide.')
  const id = newId('qry')
  const now = new Date().toISOString()
  await db.insert(queries).values({
    id,
    investigationId,
    question: input.question.trim().slice(0, 1000),
    rationale: input.rationale.trim().slice(0, 3000),
    kql,
    targetIndex: input.targetIndex.trim().slice(0, 300) || 'logs-*',
    timeRange: input.timeRange.trim().slice(0, 200) || 'Dernières 24 heures',
    priority: 'medium',
    status: 'proposed',
  })
  await db.update(investigations).set({ updatedAt: now, lastActivityAt: now }).where(eq(investigations.id, investigationId))
  await audit(actor, {
    action: 'query.create_manual',
    entityType: 'query',
    entityId: id,
    investigationId,
    metadata: { length: kql.length },
  })
  const [created] = await db.select().from(queries).where(eq(queries.id, id)).limit(1)
  return created
}

export async function setQueryStatus(
  actor: Actor,
  investigationId: string,
  queryId: string,
  status: 'proposed' | 'skipped' | 'inconclusive',
): Promise<void> {
  await requireInvestigation(actor, investigationId, 'edit')
  if (status === 'proposed') throw invalid('Une requête exécutée ne peut pas redevenir à exécuter.')
  await db
    .update(queries)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(queries.id, queryId), eq(queries.investigationId, investigationId)))
  await audit(actor, {
    action: 'query.status',
    entityType: 'query',
    entityId: queryId,
    investigationId,
    metadata: { status },
  })
}

export async function updateHypothesisStatus(
  actor: Actor,
  investigationId: string,
  hypothesisId: string,
  status: 'open' | 'supported' | 'refuted' | 'inconclusive',
): Promise<void> {
  await requireInvestigation(actor, investigationId, 'edit')
  await db
    .update(hypotheses)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(hypotheses.id, hypothesisId), eq(hypotheses.investigationId, investigationId)))
  await audit(actor, {
    action: 'hypothesis.status',
    entityType: 'hypothesis',
    entityId: hypothesisId,
    investigationId,
    metadata: { status },
  })
}

export async function addComment(actor: Actor, investigationId: string, body: string): Promise<CommentView> {
  await requireInvestigation(actor, investigationId, 'view')
  if (!can(actor.role, 'comment.write')) throw forbidden('Votre rôle est en lecture seule.')
  const text = body.trim()
  if (text.length < 1) throw invalid('Le commentaire est vide.')
  if (text.length > 5000) throw invalid('Le commentaire dépasse 5 000 caractères.')
  const id = newId('cmt')
  await db.insert(comments).values({ id, investigationId, userId: actor.userId, body: text })
  await db
    .update(investigations)
    .set({ lastActivityAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(investigations.id, investigationId))
  await audit(actor, {
    action: 'comment.create',
    entityType: 'comment',
    entityId: id,
    investigationId,
    metadata: { length: text.length },
  })
  return { id, body: text, createdAt: new Date().toISOString(), authorName: actor.name, authorId: actor.userId }
}

export async function setConclusion(
  actor: Actor,
  investigationId: string,
  input: { verdict: Verdict; confidence: number; justification: string },
): Promise<void> {
  await requireInvestigation(actor, investigationId, 'edit')
  if (!VERDICTS.includes(input.verdict)) throw invalid('Verdict invalide.')
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 100) {
    throw invalid('La confiance doit être comprise entre 0 et 100.')
  }
  const justification = input.justification.trim()
  if (justification.length < 20) throw invalid('La justification du verdict doit contenir au moins 20 caractères.')
  if (justification.length > 5000) throw invalid('La justification dépasse 5 000 caractères.')
  const now = new Date().toISOString()
  await db
    .update(investigations)
    .set({
      verdict: input.verdict,
      confidence: Math.round(input.confidence),
      conclusionJustification: justification,
      status: 'concluded',
      closedAt: now,
      updatedAt: now,
      lastActivityAt: now,
    })
    .where(eq(investigations.id, investigationId))
  await audit(actor, {
    action: 'investigation.conclude',
    entityType: 'investigation',
    entityId: investigationId,
    investigationId,
    metadata: { verdict: input.verdict, confidence: Math.round(input.confidence) },
  })
}

export async function reopenInvestigation(actor: Actor, investigationId: string): Promise<void> {
  await requireInvestigation(actor, investigationId, 'edit')
  const now = new Date().toISOString()
  await db
    .update(investigations)
    .set({ status: 'in_progress', closedAt: null, updatedAt: now, lastActivityAt: now })
    .where(eq(investigations.id, investigationId))
  await audit(actor, {
    action: 'investigation.reopen',
    entityType: 'investigation',
    entityId: investigationId,
    investigationId,
  })
}

export async function archiveInvestigation(actor: Actor, investigationId: string): Promise<void> {
  await requireInvestigation(actor, investigationId, 'edit')
  await db
    .update(investigations)
    .set({ status: 'archived', updatedAt: new Date().toISOString() })
    .where(eq(investigations.id, investigationId))
  await audit(actor, {
    action: 'investigation.archive',
    entityType: 'investigation',
    entityId: investigationId,
    investigationId,
  })
}

import { and, desc, eq } from 'void/db'
import { aiProviders, analysisRuns, comments, hypotheses, investigations, queries, reports, user } from '../../../db/schema'
import type { AlertSummary, Verdict } from '../../lib/alert'
import type { InvestigationAnalysis } from '../../lib/ai'
import { analysisSchema } from '../../lib/ai'
import { newId } from '../../lib/ids'
import { buildReportContent, reportToMarkdown, type ReportContent, type ReportHypothesis, type ReportQuery } from '../../lib/report'
import { audit } from '../audit'
import { db } from '../db'
import { invalid, notFound } from '../errors'
import type { Actor } from '../session'
import { requireInvestigation } from './investigations'
import { LOCAL_PROVIDER_ID } from '../ai/local'

function parseSummary(value: string): AlertSummary {
  return JSON.parse(value) as AlertSummary
}

function parseAnalysis(value: string | null): InvestigationAnalysis | null {
  if (!value) return null
  try {
    const parsed = analysisSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function generateReport(
  actor: Actor,
  investigationId: string,
): Promise<{ id: string; version: number; markdown: string }> {
  const investigation = await requireInvestigation(actor, investigationId, 'edit')
  if (!investigation.verdict) throw invalid('Renseignez d’abord le verdict de clôture.')
  if (!investigation.confidence && investigation.confidence !== 0) throw invalid('Renseignez le niveau de confiance.')
  if (!investigation.closedAt) throw invalid('Clôturez l’investigation avant de générer le rapport.')
  const [currentAnalysis] = investigation.currentAnalysisId
    ? await db
        .select({ contentJson: analysisRuns.contentJson })
        .from(analysisRuns)
        .where(eq(analysisRuns.id, investigation.currentAnalysisId))
        .limit(1)
    : []

  const [owner, provider, hypothesisRows, queryRows, commentRows, existingReports] = await Promise.all([
    db.select({ name: user.name }).from(user).where(eq(user.id, investigation.ownerId)).limit(1),
    db.select({ name: aiProviders.name }).from(aiProviders).where(eq(aiProviders.id, investigation.providerId)).limit(1),
    db
      .select()
      .from(hypotheses)
      .where(and(eq(hypotheses.investigationId, investigationId), eq(hypotheses.isCurrent, true)))
      .orderBy(desc(hypotheses.createdAt)),
    db.select().from(queries).where(eq(queries.investigationId, investigationId)).orderBy(desc(queries.createdAt)),
    db
      .select({ body: comments.body })
      .from(comments)
      .where(eq(comments.investigationId, investigationId))
      .orderBy(desc(comments.createdAt))
      .limit(20),
    db.select({ version: reports.version }).from(reports).where(eq(reports.investigationId, investigationId)),
  ])

  const reportHypotheses: ReportHypothesis[] = hypothesisRows.map((row) => ({
    statement: row.statement,
    status: row.status,
    confidence: row.confidence,
    rationale: row.rationale,
    evidence: row.evidence,
  }))
  const reportQueries: ReportQuery[] = queryRows.map((row) => ({
    question: row.question,
    rationale: row.rationale,
    kql: row.kql,
    targetIndex: row.targetIndex,
    timeRange: row.timeRange,
    status: row.status,
    resultSummary: row.resultSummary,
    resultRowCount: row.resultRowCount,
    importedAt: row.importedAt,
  }))

  const content = buildReportContent({
    investigationId,
    title: investigation.title,
    severity: investigation.severity as AlertSummary['severity'],
    analystName: owner[0]?.name ?? actor.name,
    createdAt: investigation.createdAt,
    closedAt: investigation.closedAt,
    modelId: investigation.modelId,
    providerName: investigation.providerId === LOCAL_PROVIDER_ID ? 'Ollama local' : provider[0]?.name ?? investigation.providerId,
    alertSummary: parseSummary(investigation.alertSummaryJson),
    analysis: parseAnalysis(currentAnalysis?.contentJson ?? null),
    hypotheses: reportHypotheses,
    queries: reportQueries,
    verdict: investigation.verdict as Verdict,
    confidence: investigation.confidence,
    justification: investigation.conclusionJustification,
    analystComments: commentRows.map((row) => row.body),
  })

  // The justification lives in a dedicated column on the report input path below.
  const markdown = reportToMarkdown(content)
  const version = existingReports.length ? Math.max(...existingReports.map((row) => row.version)) + 1 : 1
  const id = newId('rep')
  await db.insert(reports).values({
    id,
    investigationId,
    version,
    verdict: investigation.verdict,
    confidence: investigation.confidence,
    contentJson: JSON.stringify(content),
    markdown,
    generatedBy: actor.userId,
    modelId: investigation.modelId,
  })
  await db
    .update(investigations)
    .set({ reportId: id, updatedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() })
    .where(eq(investigations.id, investigationId))
  await audit(actor, {
    action: 'report.generate',
    entityType: 'report',
    entityId: id,
    investigationId,
    metadata: { version, verdict: investigation.verdict, confidence: investigation.confidence },
  })
  return { id, version, markdown }
}

export async function getReport(
  actor: Actor,
  investigationId: string,
  version?: number,
): Promise<{
  id: string
  version: number
  verdict: string
  confidence: number | null
  createdAt: string
  content: ReportContent
  markdown: string
}> {
  await requireInvestigation(actor, investigationId, 'view')
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.investigationId, investigationId))
    .orderBy(desc(reports.version))
  const row = version ? rows.find((item) => item.version === version) : rows[0]
  if (!row) throw notFound('Rapport')
  return {
    id: row.id,
    version: row.version,
    verdict: row.verdict,
    confidence: row.confidence,
    createdAt: row.createdAt,
    content: JSON.parse(row.contentJson) as ReportContent,
    markdown: row.markdown,
  }
}

export async function recordExport(actor: Actor, investigationId: string, format: 'pdf' | 'markdown'): Promise<void> {
  await audit(actor, {
    action: `report.export_${format}`,
    entityType: 'investigation',
    entityId: investigationId,
    investigationId,
    metadata: { format },
  })
}

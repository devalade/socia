import { z } from 'zod'
import { VERDICTS } from './alert'

export const PROMPT_VERSION = 'soc-v1'

export const CERTAINTIES = ['fact', 'deduction', 'hypothesis'] as const
export const HYPOTHESIS_STATUSES = ['open', 'supported', 'refuted', 'inconclusive'] as const
export const PRIORITIES = ['high', 'medium', 'low'] as const
export const PROVISIONAL_VERDICTS = [...VERDICTS, 'undetermined'] as const

const longText = z.string().trim().max(12000)

/** Models occasionally return a string where an array is expected. Coerce without hiding the content. */
const stringList = z.preprocess((value) => {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean)
  }
  return []
}, z.array(z.string().trim().max(6000)).max(40))

const confidence = z.coerce.number().min(0).max(100).catch(50)

export const timelineEventSchema = z.object({
  timestamp: z.string().trim().max(120).default(''),
  event: z.string().trim().min(1).max(2000),
  source: z.string().trim().max(300).default(''),
  certainty: z.enum(CERTAINTIES).catch('fact'),
})

export const hypothesisSchema = z.object({
  statement: z.string().trim().min(1).max(2000),
  status: z.enum(HYPOTHESIS_STATUSES).catch('open'),
  confidence,
  rationale: z.string().trim().max(4000).default(''),
  evidence: z.string().trim().max(4000).default(''),
})

export const investigationQuerySchema = z.object({
  question: z.string().trim().min(1).max(1000),
  why: z.string().trim().max(3000).default(''),
  priority: z.enum(PRIORITIES).catch('medium'),
  kql: z.string().trim().min(1).max(5000),
  targetIndex: z.string().trim().max(300).default('logs-*'),
  timeRange: z.string().trim().max(200).default('Dernières 24 heures'),
  expectedSignal: z.string().trim().max(2000).default(''),
})

export const provisionalAssessmentSchema = z.object({
  verdict: z.enum(PROVISIONAL_VERDICTS).catch('undetermined'),
  confidence,
  rationale: z.string().trim().max(4000).default(''),
})

export const analysisSchema = z.object({
  summary: longText.min(1),
  ruleExplanation: longText.default(''),
  triggeringEvent: longText.default(''),
  contextReconstruction: longText.default(''),
  timeline: z.array(timelineEventSchema).max(80).default([]),
  facts: stringList,
  deductions: stringList,
  hypotheses: z.array(hypothesisSchema).max(30).default([]),
  missingInformation: stringList,
  investigationAxes: z.array(investigationQuerySchema).max(20).default([]),
  provisionalAssessment: provisionalAssessmentSchema.default({
    verdict: 'undetermined',
    confidence: 0,
    rationale: '',
  }),
})

export type InvestigationAnalysis = z.infer<typeof analysisSchema>
export type InvestigationQueryProposal = z.infer<typeof investigationQuerySchema>
export type Hypothesis = z.infer<typeof hypothesisSchema>
export type TimelineEvent = z.infer<typeof timelineEventSchema>

export type AnalysisParseResult =
  | { ok: true; analysis: InvestigationAnalysis; json: string }
  | { ok: false; error: string; raw: string }

/** Strip a markdown fence and any prose around the JSON object models sometimes add. */
export function extractJsonObject(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start >= 0 && end > start) return candidate.slice(start, end + 1)
  return candidate
}

function repairJson(text: string): string {
  return text
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
}

export function parseAnalysis(raw: string): AnalysisParseResult {
  const json = extractJsonObject(raw)
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    try {
      value = JSON.parse(repairJson(json))
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'JSON illisible'
      return { ok: false, error: `La réponse du modèle n’est pas un JSON valide (${detail}).`, raw }
    }
  }

  const parsed = analysisSchema.safeParse(value)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const path = first?.path.join('.') || 'racine'
    return {
      ok: false,
      error: `La réponse du modèle ne respecte pas le schéma attendu (${path}: ${first?.message ?? 'valeur invalide'}).`,
      raw,
    }
  }

  const analysis = dedupeAnalysis(parsed.data)
  return { ok: true, analysis, json }
}

function cleanList(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const text = value.trim().replace(/\s+/g, ' ')
    if (!text || text.length > 6000) continue
    const key = text.toLocaleLowerCase('fr')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out.slice(0, 40)
}

function dedupeAnalysis(analysis: InvestigationAnalysis): InvestigationAnalysis {
  const hypotheses = analysis.hypotheses
    .filter((hypothesis, index, all) => all.findIndex((h) => h.statement.toLocaleLowerCase('fr') === hypothesis.statement.toLocaleLowerCase('fr')) === index)
    .slice(0, 20)
  const axes = analysis.investigationAxes
    .filter((query, index, all) => all.findIndex((q) => q.kql.trim() === query.kql.trim()) === index)
    .filter((query) => isLikelyKql(query.kql))
    .slice(0, 12)

  return {
    ...analysis,
    facts: cleanList(analysis.facts),
    deductions: cleanList(analysis.deductions),
    missingInformation: cleanList(analysis.missingInformation),
    hypotheses,
    investigationAxes: axes.map((query) => ({
      ...query,
      kql: sanitizeKql(query.kql),
      targetIndex: query.targetIndex.trim() || 'logs-*',
      timeRange: query.timeRange.trim() || 'Dernières 24 heures',
    })),
    timeline: analysis.timeline.slice(0, 60),
  }
}

/** Reject obvious SPL/SQL/ES|QL pipelines so a bad proposal is not shown as KQL. */
export function isLikelyKql(value: string): boolean {
  const kql = value.trim()
  if (!kql) return false
  if (/\bsearch\s+in\s*\(/i.test(kql)) return false
  if (/\|\s*(where|eval|stats|table|rename|dedup|sort|head|tail|eventstats|streamstats)\b/i.test(kql)) return false
  if (/\b(sourcetype|index|source)\s*=/i.test(kql)) return false
  if (/^\s*(select|from)\b/i.test(kql)) return false
  return true
}

/** KQL is text the analyst copies to their own SIEM. Strip control bytes and cap it. */
export function sanitizeKql(value: string): string {
  return value
    // oxlint-disable-next-line no-control-regex -- stripping control bytes is the point
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 5000)
}

export function analysisFactsText(analysis: InvestigationAnalysis): string {
  return analysis.facts.length ? analysis.facts.join('\n') : 'Aucun fait explicitement extrait.'
}

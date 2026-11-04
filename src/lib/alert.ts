export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info', 'unknown'] as const
export type Severity = (typeof SEVERITIES)[number]

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critique',
  high: 'Élevée',
  medium: 'Moyenne',
  low: 'Faible',
  info: 'Information',
  unknown: 'Non renseignée',
}

export const VERDICTS = ['false_positive', 'legitimate', 'confirmed_incident', 'watch'] as const
export type Verdict = (typeof VERDICTS)[number]

export const VERDICT_LABELS: Record<Verdict, string> = {
  false_positive: 'Faux positif',
  legitimate: 'Activité légitime',
  confirmed_incident: 'Incident confirmé',
  watch: 'À surveiller',
}

export type AlertSummary = {
  ruleName: string | null
  ruleId: string | null
  ruleDescription: string | null
  severity: Severity
  riskScore: number | null
  timestamp: string | null
  host: string | null
  user: string | null
  process: string | null
  sourceIp: string | null
  destinationIp: string | null
  message: string | null
  index: string | null
  documentId: string | null
  eventCategories: string[]
  keyFields: { label: string; value: string }[]
  missing: string[]
}

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function at(root: unknown, path: string): unknown {
  let cursor = root
  for (const key of path.split('.')) {
    if (!isObject(cursor)) return undefined
    cursor = cursor[key]
  }
  return cursor
}

function textAt(root: unknown, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = at(root, path)
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (Array.isArray(value) && value.length > 0) {
      const first = value.find((item) => typeof item === 'string' && item.trim())
      if (typeof first === 'string') return first.trim()
    }
  }
  return null
}

function numberAt(root: unknown, ...paths: string[]): number | null {
  for (const path of paths) {
    const value = at(root, path)
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }
  return null
}

function severityFrom(value: string | null, riskScore: number | null): Severity {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'critical' || normalized === 'critique') return 'critical'
  if (normalized === 'high' || normalized === 'élevée' || normalized === 'elevee') return 'high'
  if (normalized === 'medium' || normalized === 'moyenne' || normalized === 'moderate') return 'medium'
  if (normalized === 'low' || normalized === 'faible') return 'low'
  if (normalized === 'info' || normalized === 'informational') return 'info'
  if (typeof riskScore === 'number') {
    if (riskScore >= 80) return 'critical'
    if (riskScore >= 60) return 'high'
    if (riskScore >= 40) return 'medium'
    if (riskScore > 0) return 'low'
  }
  return 'unknown'
}

/**
 * Elastic Security alerts arrive in several shapes: a raw search hit, a `_source` document,
 * a Kibana alert object or a small object copied from the alert flyout. Read the common paths
 * without assuming one vendor version. Everything stays as text and is never executed.
 */
export function summarizeAlert(input: unknown): AlertSummary {
  const root = isObject(input) && isObject(input._source) ? input._source : input
  const searchHit = isObject(input) && isObject(input._source) ? input : null

  const ruleName = textAt(
    root,
    'rule.name',
    'signal.rule.name',
    'kibana.alert.rule.name',
    'kibana.alert.rule_name',
    'alert.rule.name',
  )
  const ruleId = textAt(root, 'rule.id', 'signal.rule.rule_id', 'kibana.alert.rule.rule_id', 'rule.rule_id')
  const ruleDescription = textAt(
    root,
    'rule.description',
    'signal.rule.description',
    'kibana.alert.rule.description',
  )
  const riskScore = numberAt(
    root,
    'rule.risk_score',
    'signal.rule.risk_score',
    'kibana.alert.rule.risk_score',
    'kibana.alert.risk_score',
  )
  const severity = severityFrom(
    textAt(root, 'rule.severity', 'signal.rule.severity', 'kibana.alert.rule.severity', 'kibana.alert.severity'),
    riskScore,
  )
  const timestamp = textAt(
    root,
    '@timestamp',
    'event.created',
    'event.ingested',
    'kibana.alert.start',
    'signal.original_time',
  )
  const host = textAt(root, 'host.name', 'host.hostname', 'agent.name', 'observer.hostname', 'kibana.alert.host.name')
  const user = textAt(
    root,
    'user.name',
    'user.target.name',
    'user.effective.name',
    'winlog.event_data.TargetUserName',
    'kibana.alert.user.name',
  )
  const process = textAt(
    root,
    'process.name',
    'process.executable',
    'winlog.event_data.Image',
    'process.parent.name',
  )
  const sourceIp = textAt(root, 'source.ip', 'client.ip', 'network.source.ip', 'kibana.alert.source.ip')
  const destinationIp = textAt(
    root,
    'destination.ip',
    'server.ip',
    'network.destination.ip',
    'kibana.alert.destination.ip',
  )
  const message = textAt(root, 'message', 'event.original', 'signal.reason', 'kibana.alert.reason')
  const index = textAt(root, '_index', 'kibana.alert.rule.consumer') ?? (searchHit ? textAt(searchHit, '_index') : null)
  const documentId = searchHit ? textAt(searchHit, '_id') : textAt(root, '_id')

  const categories = at(root, 'event.category')
  const eventCategories = Array.isArray(categories)
    ? categories.filter((item): item is string => typeof item === 'string')
    : typeof categories === 'string'
      ? [categories]
      : []

  const missing: string[] = []
  if (!ruleName) missing.push('Nom de la règle')
  if (!timestamp) missing.push('Horodatage de l’alerte')
  if (!host) missing.push('Hôte concerné')
  if (!user) missing.push('Utilisateur concerné')
  if (!message) missing.push('Message ou reason de l’événement')

  const keyFields: { label: string; value: string }[] = []
  const push = (label: string, value: string | null) => {
    if (value) keyFields.push({ label, value })
  }
  push('Règle', ruleName)
  push('Identifiant de règle', ruleId)
  push('Sévérité Elastic', textAt(root, 'rule.severity', 'signal.rule.severity', 'kibana.alert.severity'))
  push('Score de risque', riskScore === null ? null : String(riskScore))
  push('Horodatage', timestamp)
  push('Hôte', host)
  push('Utilisateur', user)
  push('Processus', process)
  push('IP source', sourceIp)
  push('IP destination', destinationIp)
  push('Index', index)
  push('Identifiant du document', documentId)
  push('Catégories', eventCategories.join(', ') || null)

  return {
    ruleName,
    ruleId,
    ruleDescription,
    severity,
    riskScore,
    timestamp,
    host,
    user,
    process,
    sourceIp,
    destinationIp,
    message,
    index,
    documentId,
    eventCategories,
    keyFields,
    missing,
  }
}

export function parseAlertJson(raw: string): { ok: true; value: unknown; summary: AlertSummary } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: false, error: 'Collez le JSON de l’alerte Elastic.' }
  try {
    const value: unknown = JSON.parse(raw)
    if (!isObject(value) && !Array.isArray(value)) {
      return { ok: false, error: 'Le JSON doit être un objet ou un tableau.' }
    }
    return { ok: true, value, summary: summarizeAlert(value) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON invalide'
    return { ok: false, error: `JSON invalide : ${message}` }
  }
}

export function alertTitle(summary: AlertSummary, fallback = 'Alerte sans nom'): string {
  return summary.ruleName ?? summary.message?.slice(0, 80) ?? fallback
}

export function severityTone(severity: Severity): 'danger' | 'warning' | 'info' | 'neutral' | 'success' {
  if (severity === 'critical') return 'danger'
  if (severity === 'high') return 'warning'
  if (severity === 'medium') return 'warning'
  if (severity === 'low') return 'success'
  if (severity === 'info') return 'info'
  return 'neutral'
}

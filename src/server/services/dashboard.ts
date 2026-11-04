import { desc, eq, inArray } from 'void/db'
import { analysisRuns, investigations, profiles, queries, user } from '../../../db/schema'
import type { AlertSummary, Severity, Verdict } from '../../lib/alert'
import { can } from '../../lib/roles'
import { db } from '../db'
import { forbidden } from '../errors'
import type { Actor } from '../session'
import { ensureModelsDetected, listProviders, listModels, type ProviderView } from '../ai/providers'

export type DashboardData = {
  generatedAt: string
  counts: {
    total: number
    open: number
    concluded: number
    confirmedIncidents: number
    falsePositives: number
    watch: number
    avgHoursToClose: number | null
    pendingQueries: number
    analyses30d: number
    failedAnalyses30d: number
  }
  severity: { severity: Severity; count: number }[]
  activity: { day: string; label: string; investigations: number; analyses: number }[]
  recent: {
    id: string
    title: string
    status: string
    severity: Severity
    verdict: Verdict | null
    ruleName: string | null
    updatedAt: string
    ownerName: string
    pendingQueries: number
  }[]
  queue: {
    id: string
    title: string
    severity: Severity
    ageHours: number
    pendingQueries: number
  }[]
  topRules: { name: string; count: number }[]
  providers: ProviderView[]
  modelCount: number
  teamCount: number
  aiHealthy: boolean
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function getDashboard(actor: Actor): Promise<DashboardData> {
  if (!can(actor.role, 'investigation.view')) throw forbidden()
  await ensureModelsDetected()
  const rows = await db.select().from(investigations).orderBy(desc(investigations.updatedAt)).limit(500)
  const runs = await db
    .select({
      id: analysisRuns.id,
      investigationId: analysisRuns.investigationId,
      status: analysisRuns.status,
      createdAt: analysisRuns.createdAt,
    })
    .from(analysisRuns)
    .orderBy(desc(analysisRuns.createdAt))
    .limit(1000)
  const pending = await db
    .select({ investigationId: queries.investigationId, count: queries.id })
    .from(queries)
    .where(eq(queries.status, 'proposed'))
  const ownerIds = Array.from(new Set(rows.map((row) => row.ownerId)))
  const [providers, models, team, owners] = await Promise.all([
    listProviders(),
    listModels(),
    db.select({ userId: profiles.userId, role: profiles.role }).from(profiles),
    ownerIds.length
      ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ownerIds))
      : Promise.resolve([]),
  ])

  const openStatuses = new Set(['draft', 'analyzing', 'in_progress'])
  const open = rows.filter((row) => openStatuses.has(row.status))
  const concluded = rows.filter((row) => row.status === 'concluded')
  const confirmedIncidents = rows.filter((row) => row.verdict === 'confirmed_incident').length
  const falsePositives = rows.filter((row) => row.verdict === 'false_positive').length
  const watch = rows.filter((row) => row.verdict === 'watch').length
  const closes = concluded
    .filter((row) => row.closedAt)
    .map((row) => (new Date(row.closedAt!).getTime() - new Date(row.createdAt).getTime()) / 3_600_000)
    .filter((hours) => Number.isFinite(hours) && hours >= 0)
  const avgHoursToClose = closes.length ? closes.reduce((sum, value) => sum + value, 0) / closes.length : null

  const pendingByInvestigation = new Map<string, number>()
  for (const row of pending) {
    pendingByInvestigation.set(row.investigationId, (pendingByInvestigation.get(row.investigationId) ?? 0) + 1)
  }

  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info', 'unknown']
  const severity = severityOrder.map((level) => ({
    severity: level,
    count: rows.filter((row) => row.severity === level).length,
  }))

  const today = new Date()
  const activity = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - (13 - index))
    const key = dayKey(date)
    return {
      day: key,
      label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      investigations: rows.filter((row) => row.createdAt.slice(0, 10) === key).length,
      analyses: runs.filter((run) => run.createdAt.slice(0, 10) === key && run.status === 'completed').length,
    }
  })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString()
  const analyses30d = runs.filter((run) => run.createdAt >= thirtyDaysAgo && run.status === 'completed').length
  const failedAnalyses30d = runs.filter((run) => run.createdAt >= thirtyDaysAgo && run.status === 'failed').length

  const topRuleMap = new Map<string, number>()
  for (const row of rows) {
    try {
      const summary = JSON.parse(row.alertSummaryJson) as AlertSummary
      const name = summary.ruleName ?? 'Règle sans nom'
      topRuleMap.set(name, (topRuleMap.get(name) ?? 0) + 1)
    } catch {
      // A malformed summary is a data bug, not a reason to fail the dashboard.
    }
  }
  const topRules = Array.from(topRuleMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const recent = rows.slice(0, 6).map((row) => {
    const summary = JSON.parse(row.alertSummaryJson) as AlertSummary
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      severity: row.severity as Severity,
      verdict: row.verdict as Verdict | null,
      ruleName: summary.ruleName,
      updatedAt: row.updatedAt,
      ownerName: owners.find((owner) => owner.id === row.ownerId)?.name ?? 'Analyste inconnu',
      pendingQueries: pendingByInvestigation.get(row.id) ?? 0,
    }
  })

  const queue = open
    .sort((a, b) => {
      const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4, unknown: 5 }
      return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || a.createdAt.localeCompare(b.createdAt)
    })
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      title: row.title,
      severity: row.severity as Severity,
      ageHours: Math.max(0, Math.round((Date.now() - new Date(row.createdAt).getTime()) / 3_600_000)),
      pendingQueries: pendingByInvestigation.get(row.id) ?? 0,
    }))

  const aiHealthy = models.length > 0 && providers.some((provider) => provider.isActive && !provider.lastError)

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      total: rows.length,
      open: open.length,
      concluded: concluded.length,
      confirmedIncidents,
      falsePositives,
      watch,
      avgHoursToClose,
      pendingQueries: pending.length,
      analyses30d,
      failedAnalyses30d,
    },
    severity,
    activity,
    recent,
    queue,
    topRules,
    providers,
    modelCount: models.length,
    teamCount: team.length,
    aiHealthy,
  }
}

export type ShellData = {
  viewer: { userId: string; name: string; email: string; role: Actor['role'] }
  recent: { id: string; title: string; severity: Severity; status: string }[]
  openCount: number
  pendingQueries: number
  aiHealthy: boolean
}

export async function getShellData(actor: Actor): Promise<ShellData> {
  await ensureModelsDetected()
  const rows = await db.select().from(investigations).orderBy(desc(investigations.updatedAt)).limit(80)
  const pending = await db.select({ id: queries.id }).from(queries).where(eq(queries.status, 'proposed'))
  const providers = await listProviders()
  const models = await listModels()
  return {
    viewer: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role },
    recent: rows.slice(0, 5).map((row) => ({
      id: row.id,
      title: row.title,
      severity: row.severity as Severity,
      status: row.status,
    })),
    openCount: rows.filter((row) => ['draft', 'analyzing', 'in_progress'].includes(row.status)).length,
    pendingQueries: pending.length,
    aiHealthy: models.length > 0 && providers.some((provider) => provider.isActive && !provider.lastError),
  }
}

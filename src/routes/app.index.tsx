import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/patterns/page-header'
import { SectionCard } from '@/components/patterns/section-card'
import { EmptyState } from '@/components/patterns/empty-state'
import { SeverityBadge, InvestigationStatusBadge, VerdictBadge } from '@/components/patterns/badges'
import { RelativeTime } from '@/components/patterns/relative-time'
import { KpiCard } from '@/components/premium/kpi-card'
import { BarList } from '@/components/premium/bar-list'
import { StatusBadge } from '@/components/premium/status-badge'
import { dateOnly, hoursToHuman, timeOnly } from '@/lib/dates'
import { getDashboardFn } from '@/server/fns/dashboard'
import type { DashboardData } from '@/server/services/dashboard'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/app/')({
  loader: () => getDashboardFn(),
  component: DashboardPage,
})

function DashboardPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const open = data.counts.open
  const pending = data.counts.pendingQueries

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Briefing de posture"
        title="Tableau de bord"
        description={
          open === 0
            ? 'La file est sous contrôle. Toutes les alertes traitées sont documentées.'
            : `${open} dossier${open > 1 ? 's' : ''} ouvert${open > 1 ? 's' : ''}, ${pending} requête${pending > 1 ? 's' : ''} en attente dans votre SIEM.`
        }
        meta={
          <>
            <span>Généré le {dateOnly(data.generatedAt)} à {timeOnly(data.generatedAt)} UTC</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', data.aiHealthy ? 'bg-success' : 'bg-warning')} />
              {data.aiHealthy ? 'Chaîne d’analyse opérationnelle' : 'Chaîne d’analyse à configurer'}
            </span>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void router.invalidate()}>
              <RefreshCw aria-hidden />
              Actualiser
            </Button>
            <Button asChild size="sm">
              <Link to="/app/investigations/new">
                <Plus aria-hidden />
                Nouveau dossier
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Indicateurs de posture" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard metric={{ label: 'Dossiers ouverts', kind: 'count', value: open, previous: null, note: open ? 'À traiter ou en cours' : 'Aucun dossier en attente' }} />
        <KpiCard metric={{ label: 'Requêtes en attente', kind: 'count', value: pending, previous: null, note: pending ? 'À exécuter dans votre SIEM' : 'Aucune requête en attente' }} />
        <KpiCard metric={{ label: 'Incidents confirmés', kind: 'count', value: data.counts.confirmedIncidents, previous: null, note: 'Verdict validé par un analyste' }} />
        <KpiCard
          metric={{
            label: 'Délai de clôture',
            kind: 'duration',
            value: data.counts.avgHoursToClose === null ? null : data.counts.avgHoursToClose * 3_600_000,
            previous: null,
            note: data.counts.avgHoursToClose === null ? 'Pas encore de clôture' : 'Entre ouverture et verdict',
          }}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="grid min-w-0 content-start gap-5 xl:col-span-2">
          <SectionCard title="Activité" description="Dossiers ouverts et analyses terminées sur 14 jours" action={<ActivityLegend />}>
            <ActivityBars data={data.activity} />
          </SectionCard>

          <SectionCard
            title="File de triage"
            description={`${open} dossier${open > 1 ? 's' : ''} ouvert${open > 1 ? 's' : ''}`}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/investigations">
                  Tout voir
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
            flush
          >
            <Queue items={data.queue} />
          </SectionCard>

          <SectionCard
            title="Derniers dossiers"
            description="Mis à jour récemment"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/investigations">
                  Tout voir
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
            flush
          >
            <RecentTable items={data.recent} />
          </SectionCard>
        </div>

        <aside className="grid min-w-0 content-start gap-5 xl:col-span-1">
          <SectionCard title="Signaux" description="État de la chaîne d’analyse">
            <Signals data={data} />
          </SectionCard>

          <SectionCard title="Règles fréquentes" description="Sur les dossiers chargés">
            {data.topRules.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">Aucune règle observée sur les dossiers chargés.</p>
            ) : (
              <BarList rows={data.topRules.map((row) => ({ name: row.name, value: row.count }))} nameHeader="Règle" valueHeader="Dossiers" />
            )}
          </SectionCard>

          <SectionCard title="Fournisseur" description="Modèle et endpoint">
            <ProviderChain data={data} />
          </SectionCard>
        </aside>
      </div>
    </div>
  )
}

function ActivityLegend() {
  return (
    <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand" />Dossiers</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-2" />Analyses</span>
    </div>
  )
}

function ActivityBars({ data }: { data: DashboardData['activity'] }) {
  const width = 640
  const height = 190
  const left = 28
  const bottom = 28
  const top = 10
  const plotWidth = width - left
  const plotHeight = height - top - bottom
  const max = Math.max(4, Math.ceil(Math.max(...data.map((day) => day.investigations + day.analyses), 1) * 1.15))
  const slot = plotWidth / data.length
  const barWidth = Math.max(8, slot * 0.46)
  const total = data.reduce((sum, day) => sum + day.investigations + day.analyses, 0)
  const labels = data.filter((_, index) => index % 3 === 0 || index === data.length - 1)

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Activité des 14 derniers jours">
          {total > 0 &&
            [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = top + plotHeight - ratio * plotHeight
              return (
                <g key={ratio}>
                  <line x1={left} x2={width} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
                  <text x={0} y={y + 4} fill="var(--muted-foreground)" fontSize={11} fontFamily="var(--font-sans)">
                    {Math.round(ratio * max)}
                  </text>
                </g>
              )
            })}
          {data.map((day, index) => {
            const x = left + index * slot + (slot - barWidth) / 2
            const invH = (day.investigations / max) * plotHeight
            const anaH = (day.analyses / max) * plotHeight
            const baseY = top + plotHeight
            return (
              <g key={day.day}>
                {day.investigations > 0 && <rect x={x} y={baseY - invH} width={barWidth} height={invH} rx={3} fill="var(--brand)" />}
                {day.analyses > 0 && <rect x={x} y={baseY - invH - anaH} width={barWidth} height={anaH} rx={3} fill="var(--chart-2)" opacity={0.55} />}
                {day.investigations + day.analyses === 0 && <line x1={x} x2={x + barWidth} y1={baseY - 1} y2={baseY - 1} stroke="var(--border)" strokeWidth={2} />}
              </g>
            )
          })}
          <line x1={left} x2={width} y1={top + plotHeight} y2={top + plotHeight} stroke="var(--border)" strokeWidth={1} />
          {labels.map((day) => {
            const index = data.findIndex((item) => item.day === day.day)
            const x = left + index * slot + slot / 2
            return (
              <text key={day.day} x={x} y={height - 7} textAnchor="middle" fill="var(--muted-foreground)" fontSize={11} fontFamily="var(--font-sans)">
                {day.label}
              </text>
            )
          })}
          {total === 0 && (
            <text x={left + plotWidth / 2} y={top + plotHeight / 2} textAnchor="middle" fill="var(--muted-foreground)" fontSize={13} fontFamily="var(--font-sans)">
              Aucune activité sur la période
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}

function Queue({ items }: { items: DashboardData['queue'] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="La file est vide"
        description="Toutes les alertes ont été traitées. Un nouveau dossier commence par un JSON d’alerte et une question."
        action={
          <Button asChild size="sm">
            <Link to="/app/investigations/new">
              <Plus aria-hidden />
              Ouvrir un dossier
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="ps-5">Sévérité</TableHead>
          <TableHead>Dossier</TableHead>
          <TableHead>Âge</TableHead>
          <TableHead className="pe-5 text-right">Requêtes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="ps-5"><SeverityBadge severity={item.severity} /></TableCell>
            <TableCell>
              <Link
                to="/app/investigations/$investigationId"
                params={{ investigationId: item.id }}
                className="line-clamp-1 font-medium text-foreground hover:text-brand"
              >
                {item.title}
              </Link>
            </TableCell>
            <TableCell className="whitespace-nowrap text-small text-muted-foreground">{hoursToHuman(item.ageHours)}</TableCell>
            <TableCell className="pe-5 text-right">
              {item.pendingQueries > 0 ? (
                <StatusBadge tone="warning">{item.pendingQueries} en attente</StatusBadge>
              ) : (
                <span className="text-xs text-muted-foreground">Aucune</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function RecentTable({ items }: { items: DashboardData['recent'] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun dossier ouvert"
        description="Importez une alerte Elastic pour ouvrir le premier dossier d’investigation."
        action={
          <Button asChild size="sm">
            <Link to="/app/investigations/new">Importer une alerte</Link>
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="ps-5">Dossier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Verdict</TableHead>
              <TableHead className="pe-5 text-right">Mise à jour</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="w-80 max-w-80 ps-5">
                  <Link to="/app/investigations/$investigationId" params={{ investigationId: item.id }} className="block min-w-0 font-medium text-foreground hover:text-brand">
                    <span className="block truncate">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.ruleName ?? 'Règle sans nom'}</span>
                  </Link>
                </TableCell>
                <TableCell><InvestigationStatusBadge status={item.status} /></TableCell>
                <TableCell>{item.verdict ? <VerdictBadge verdict={item.verdict} /> : <span className="text-xs text-muted-foreground">n/d</span>}</TableCell>
                <TableCell className="pe-5 text-right text-xs text-muted-foreground"><RelativeTime value={item.updatedAt} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y divide-border md:hidden">
        {items.map((item) => (
          <Link key={item.id} to="/app/investigations/$investigationId" params={{ investigationId: item.id }} className="block px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 line-clamp-2 font-medium text-foreground">{item.title}</span>
              <SeverityBadge severity={item.severity} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <InvestigationStatusBadge status={item.status} />
              {item.verdict && <VerdictBadge verdict={item.verdict} />}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{item.ownerName} · <RelativeTime value={item.updatedAt} /></div>
          </Link>
        ))}
      </div>
    </>
  )
}

function Signals({ data }: { data: DashboardData }) {
  const rows = [
    { label: 'Dossiers ouverts', value: data.counts.open },
    { label: 'Requêtes en attente', value: data.counts.pendingQueries, warning: data.counts.pendingQueries > 0 },
    { label: 'Analyses 30 jours', value: data.counts.analyses30d },
    { label: 'Échecs 30 jours', value: data.counts.failedAnalyses30d, warning: data.counts.failedAnalyses30d > 0 },
    { label: 'À surveiller', value: data.counts.watch },
    { label: 'Modèle actif', value: data.modelCount },
  ]
  return (
    <div>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-border/70 py-3 last:border-0">
            <dt className="text-small text-muted-foreground">{row.label}</dt>
            <dd className={cn('text-label font-medium num', row.warning ? 'text-warning' : 'text-foreground')}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn('size-1.5 rounded-full', data.aiHealthy ? 'bg-success' : 'bg-warning')} />
        {data.aiHealthy ? 'Fournisseur opérationnel' : 'Fournisseur à configurer'} · {data.modelLabel}
      </div>
    </div>
  )
}

function ProviderChain({ data }: { data: DashboardData }) {
  return (
    <div>
      {data.providers.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">Aucun fournisseur configuré. Ajoutez-en un dans Administration.</p>
      ) : (
        data.providers.map((provider) => (
          <div key={provider.id} className="flex items-start justify-between gap-3 border-b border-border/70 py-3 first:pt-0 last:border-0 last:pb-0">
            <div className="min-w-0">
              <div className="text-label font-medium text-foreground">{provider.name}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {provider.kind === 'workers-ai' ? data.modelLabel : provider.baseUrl ?? 'Endpoint distant'}
              </div>
            </div>
            <StatusBadge tone={!provider.isActive ? 'neutral' : provider.lastError ? 'warning' : 'success'}>
              {provider.isActive ? 'Actif' : 'Inactif'}
            </StatusBadge>
          </div>
        ))
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden className="size-3.5 text-brand" />
          Échecs récents
        </span>
        <span className={cn('text-label font-medium num', data.counts.failedAnalyses30d > 0 ? 'text-warning' : 'text-foreground')}>{data.counts.failedAnalyses30d}</span>
      </div>
    </div>
  )
}

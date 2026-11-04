import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/premium/status-badge'
import { SeverityBadge, InvestigationStatusBadge, VerdictBadge } from '@/components/patterns/badges'
import { RelativeTime } from '@/components/patterns/relative-time'
import { dateOnly, hoursToHuman, timeOnly } from '@/lib/dates'
import { SEVERITY_LABELS } from '@/lib/alert'
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
  const latest = data.recent[0]

  return (
    <div className="grid gap-12">
      <header className="grid gap-8 layout-briefing">
        <div className="min-w-0">
          <Dateline generatedAt={data.generatedAt} />
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-poster tracking-poster text-foreground sm:text-6xl">
            {open === 0 ? (
              <>La file est <em className="text-brand">sous contrôle</em>.</>
            ) : (
              <>{open} dossier{open > 1 ? 's' : ''} attend{open > 1 ? 'ent' : ''} une <em className="text-brand">décision</em>.</>
            )}
          </h1>
          <p className="mt-5 max-w-reading text-lead leading-7 text-muted-foreground">
            {open === 0
              ? 'Toutes les alertes traitées sont documentées. Le prochain dossier commence par une alerte, un JSON et une question.'
              : `${pending} requête${pending > 1 ? 's' : ''} doi${pending > 1 ? 'vent' : 't'} être exécutée${pending > 1 ? 's' : ''} dans votre SIEM avant la prochaine réanalyse. Faits, déductions, hypothèses et manques restent séparés.`}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="h-10 px-4">
              <Link to="/app/investigations/new">
                <span className="inline-flex items-center gap-2"><Plus aria-hidden />Nouveau dossier</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-10 px-4" onClick={() => void router.invalidate()}>
              <RefreshCw aria-hidden />
              Actualiser
            </Button>
          </div>
        </div>

        <aside className="border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <div className="font-mono text-micro tracking-caps text-muted-foreground uppercase">Dernier mouvement</div>
          {latest ? (
            <Link to="/app/investigations/$investigationId" params={{ investigationId: latest.id }} className="group mt-4 block">
              <h2 className="font-display text-2xl leading-tight tracking-app group-hover:text-brand">{latest.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={latest.severity} />
                <InvestigationStatusBadge status={latest.status} />
              </div>
              <p className="mt-3 font-mono text-micro leading-5 tracking-caps text-muted-foreground uppercase">
                {latest.ownerName} · <RelativeTime value={latest.updatedAt} />
              </p>
            </Link>
          ) : (
            <p className="mt-4 font-display text-2xl leading-tight text-muted-foreground">Aucun dossier actif.</p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4">
            <SmallFigure value={data.modelCount} label="Modèles" />
            <SmallFigure value={data.teamCount} label="Analystes" />
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 font-mono text-micro tracking-caps text-muted-foreground uppercase">
            <span className={cn('size-1.5 rounded-full', data.aiHealthy ? 'bg-success' : 'bg-warning')} />
            {data.aiHealthy ? 'Chaîne d’analyse opérationnelle' : 'Chaîne d’analyse à configurer'}
          </div>
        </aside>
      </header>

      <StatBand data={data} />

      <div className="grid gap-12 layout-briefing-main">
        <div className="grid min-w-0 content-start gap-12">
          <section>
            <SectionTitle number="01" title="Activité" note="14 derniers jours" meta="UTC" />
            <ActivityBars data={data.activity} />
          </section>

          <section>
            <SectionTitle
              number="02"
              title="File de triage"
              note={`${data.counts.open} dossier${data.counts.open > 1 ? 's' : ''} ouvert${data.counts.open > 1 ? 's' : ''}`}
              action={<Link to="/app/investigations" className="font-mono text-micro tracking-caps text-muted-foreground uppercase hover:text-foreground">Tout voir</Link>}
            />
            <Queue items={data.queue} />
          </section>

          <section>
            <SectionTitle
              number="03"
              title="Derniers dossiers"
              note="Mis à jour récemment"
              action={<Link to="/app/investigations" className="font-mono text-micro tracking-caps text-muted-foreground uppercase hover:text-foreground">Tout voir</Link>}
            />
            <CaseLedger items={data.recent} />
          </section>
        </div>

        <aside className="grid min-w-0 content-start gap-10 border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <Signals data={data} />
          <RuleIndex rows={data.topRules} />
          <ProviderChain data={data} />
          <p className="border-t border-border pt-4 font-mono text-tiny leading-4 tracking-caps text-muted-foreground uppercase">
            Briefing généré le {dateOnly(data.generatedAt)} à {timeOnly(data.generatedAt)}
          </p>
        </aside>
      </div>
    </div>
  )
}

function Dateline({ generatedAt }: { generatedAt: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-micro tracking-caps text-muted-foreground uppercase">
      <span className="inline-flex items-center gap-2 text-brand"><span className="size-1.5 rounded-full bg-brand" />Briefing de posture</span>
      <span className="text-border">/</span>
      <span>{dateOnly(generatedAt)}</span>
      <span className="text-border">/</span>
      <span>{timeOnly(generatedAt)}</span>
    </div>
  )
}

function StatBand({ data }: { data: DashboardData }) {
  const stats = [
    { label: 'Dossiers ouverts', value: String(data.counts.open), note: data.counts.open ? 'À traiter ou en cours' : 'Aucun dossier en attente' },
    { label: 'Incidents confirmés', value: String(data.counts.confirmedIncidents), note: 'Verdict validé par un analyste' },
    { label: 'Faux positifs', value: String(data.counts.falsePositives), note: 'Conclusions documentées' },
    { label: 'Délai de clôture', value: data.counts.avgHoursToClose === null ? 'n/d' : hoursToHuman(data.counts.avgHoursToClose), note: data.counts.avgHoursToClose === null ? 'Pas encore de clôture' : 'Entre ouverture et verdict' },
  ]
  return (
    <section aria-label="Indicateurs de posture" className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            'px-5 py-6',
            index % 2 === 1 && 'border-l border-border',
            index > 1 && 'border-t border-border',
            'sm:border-t-0 sm:border-l sm:first:border-l-0',
          )}
        >
          <div className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">{stat.label}</div>
          <div className="mt-3 font-display text-5xl leading-none tracking-title text-foreground">{stat.value}</div>
          <div className="mt-2 text-meta leading-5 text-muted-foreground">{stat.note}</div>
        </div>
      ))}
    </section>
  )
}

function SectionTitle({ number, title, note, meta, action }: { number: string; title: string; note?: string; meta?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-micro tracking-caps text-brand">{number}</span>
        <h2 className="font-display text-3xl leading-none tracking-section">{title}</h2>
        {note && <span className="hidden font-mono text-tiny tracking-caps text-muted-foreground uppercase sm:inline">· {note}</span>}
      </div>
      <div className="flex items-center gap-3 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
        {meta && <span>{meta}</span>}
        {action}
      </div>
    </div>
  )
}

function ActivityBars({ data }: { data: DashboardData['activity'] }) {
  const width = 640
  const height = 190
  const left = 26
  const bottom = 30
  const top = 12
  const plotWidth = width - left
  const plotHeight = height - top - bottom
  const max = Math.max(4, Math.ceil(Math.max(...data.map((day) => day.investigations + day.analyses), 1) * 1.15))
  const slot = plotWidth / data.length
  const barWidth = Math.max(8, slot * 0.42)
  const total = data.reduce((sum, day) => sum + day.investigations + day.analyses, 0)
  const labels = data.filter((_, index) => index % 3 === 0 || index === data.length - 1)

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Activité des 14 derniers jours">
          {total > 0 && [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = top + plotHeight - ratio * plotHeight
            return (
              <g key={ratio}>
                <line x1={left} x2={width} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
                <text x={0} y={y + 3} fill="var(--muted-foreground)" fontSize={9} fontFamily="var(--font-mono)">
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
                {day.investigations > 0 && <rect x={x} y={baseY - invH} width={barWidth} height={invH} fill="var(--brand)" />}
                {day.analyses > 0 && <rect x={x} y={baseY - invH - anaH} width={barWidth} height={anaH} fill="var(--muted-foreground)" opacity={0.35} />}
                {day.investigations + day.analyses === 0 && <line x1={x} x2={x + barWidth} y1={baseY - 1} y2={baseY - 1} stroke="var(--border)" strokeWidth={2} />}
              </g>
            )
          })}
          <line x1={left} x2={width} y1={top + plotHeight} y2={top + plotHeight} stroke="var(--border-strong, var(--border))" strokeWidth={1} />
          {labels.map((day) => {
            const index = data.findIndex((item) => item.day === day.day)
            const x = left + index * slot + slot / 2
            return (
              <text key={day.day} x={x} y={height - 8} textAnchor="middle" fill="var(--muted-foreground)" fontSize={9} fontFamily="var(--font-mono)">
                {day.label}
              </text>
            )
          })}
          {total === 0 && (
            <text x={left + plotWidth / 2} y={top + plotHeight / 2} textAnchor="middle" fill="var(--muted-foreground)" fontSize={13} fontFamily="var(--font-mono)">
              Aucune activité sur la période
            </text>
          )}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-5 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
        <span className="inline-flex items-center gap-2"><span className="size-2 bg-brand" />Investigations ouvertes</span>
        <span className="inline-flex items-center gap-2"><span className="size-2 bg-muted-foreground/35" />Analyses terminées</span>
      </div>
    </div>
  )
}

function Queue({ items }: { items: DashboardData['queue'] }) {
  if (items.length === 0) {
    return (
      <div className="border-t border-border py-6">
        <p className="font-display text-2xl leading-tight">La file est vide.</p>
        <p className="mt-2 max-w-copy text-meta leading-6 text-muted-foreground">Toutes les alertes ont été traitées. Un nouveau dossier commence par un JSON d’alerte et une question.</p>
        <Link to="/app/investigations/new" className="mt-4 inline-flex items-center gap-2 font-mono text-micro tracking-caps text-brand uppercase hover:underline">
          Ouvrir un dossier <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    )
  }
  return (
    <div>
      {items.map((item, index) => (
        <Link
          key={item.id}
          to="/app/investigations/$investigationId"
          params={{ investigationId: item.id }}
          className="group flex items-start gap-3 border-b border-border py-4 transition-colors hover:bg-accent/30"
        >
          <span className="mt-1 w-7 shrink-0 font-mono text-micro tracking-caps text-brand">{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl leading-tight tracking-app group-hover:text-brand">{item.title}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
              <span>{SEVERITY_LABELS[item.severity]}</span>
              <span>·</span>
              <span>ouverte depuis {hoursToHuman(item.ageHours)}</span>
              {item.pendingQueries > 0 && <><span>·</span><span className="text-warning">{item.pendingQueries} requête{item.pendingQueries > 1 ? 's' : ''} en attente</span></>}
            </div>
          </div>
          <SeverityBadge severity={item.severity} />
        </Link>
      ))}
    </div>
  )
}

function CaseLedger({ items }: { items: DashboardData['recent'] }) {
  if (items.length === 0) {
    return (
      <div className="border-t border-border py-6">
        <p className="font-display text-2xl leading-tight">Aucun dossier ouvert.</p>
        <p className="mt-2 text-meta leading-6 text-muted-foreground">Importez une alerte Elastic pour ouvrir le premier dossier d’investigation.</p>
        <Button asChild size="sm" className="mt-4"><Link to="/app/investigations/new">Importer une alerte</Link></Button>
      </div>
    )
  }
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-table border-collapse text-left">
          <thead>
            <tr className="border-b border-border font-mono text-tiny tracking-caps text-muted-foreground uppercase">
              <th className="py-2 pr-3 font-medium">Dossier</th>
              <th className="px-3 py-2 font-medium">Règle</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Verdict</th>
              <th className="whitespace-nowrap py-2 pl-3 text-right font-medium">Mise à jour</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="group border-b border-border/70 transition-colors hover:bg-accent/30">
                <td className="max-w-xs py-4 pr-3">
                  <Link to="/app/investigations/$investigationId" params={{ investigationId: item.id }} className="block min-w-0">
                    <span className="font-display text-lg leading-tight group-hover:text-brand">{item.title}</span>
                    <span className="mt-1 block font-mono text-tiny text-muted-foreground">{item.id}</span>
                  </Link>
                </td>
                <td className="px-3 py-4 text-meta text-muted-foreground">{item.ruleName ?? 'Règle sans nom'}</td>
                <td className="px-3 py-4"><InvestigationStatusBadge status={item.status} /></td>
                <td className="px-3 py-4">{item.verdict ? <VerdictBadge verdict={item.verdict} /> : <span className="font-mono text-tiny text-muted-foreground">n/d</span>}</td>
                <td className="py-4 pl-3 text-right font-mono text-tiny text-muted-foreground"><RelativeTime value={item.updatedAt} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {items.map((item) => (
          <Link key={item.id} to="/app/investigations/$investigationId" params={{ investigationId: item.id }} className="block border-b border-border py-4">
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-lg leading-tight">{item.title}</span>
              <SeverityBadge severity={item.severity} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <InvestigationStatusBadge status={item.status} />
              {item.verdict && <VerdictBadge verdict={item.verdict} />}
            </div>
            <div className="mt-2 font-mono text-tiny tracking-caps text-muted-foreground uppercase">{item.ownerName} · <RelativeTime value={item.updatedAt} /></div>
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
    { label: 'Modèles détectés', value: data.modelCount },
  ]
  return (
    <section>
      <SectionTitle number="04" title="Signaux" note="État de la chaîne" />
      <dl className="border-t border-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2.5">
            <dt className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">{row.label}</dt>
            <dd className={cn('font-mono text-xs tabular-nums', row.warning ? 'text-warning' : 'text-foreground')}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center gap-2 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
        <span className={cn('size-1.5 rounded-full', data.aiHealthy ? 'bg-success' : 'bg-warning')} />
        {data.aiHealthy ? 'Fournisseur opérationnel' : 'Fournisseur à configurer'}
      </div>
    </section>
  )
}

function RuleIndex({ rows }: { rows: DashboardData['topRules'] }) {
  const max = Math.max(...rows.map((row) => row.count), 1)
  return (
    <section>
      <SectionTitle number="05" title="Règles" note="Les plus fréquentes" />
      {rows.length === 0 ? (
        <p className="border-t border-border pt-4 text-meta leading-6 text-muted-foreground">Aucune règle observée sur les dossiers chargés.</p>
      ) : (
        <div className="border-t border-border">
          {rows.map((row) => (
            <div key={row.name} className="border-b border-border/70 py-3">
              <div className="flex items-start justify-between gap-4">
                <span className="text-meta leading-5 text-subtle">{row.name}</span>
                <span className="font-mono text-micro text-muted-foreground tabular-nums">{row.count}</span>
              </div>
              <div className="mt-2 h-px w-full bg-border">
                <div className="editorial-bar h-px bg-brand" style={{ '--bar-value': `${(row.count / max) * 100}%` } as React.CSSProperties} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ProviderChain({ data }: { data: DashboardData }) {
  return (
    <section>
      <SectionTitle number="06" title="Chaîne" note="Modèles et fournisseurs" />
      <div className="border-t border-border">
        {data.providers.map((provider) => (
          <div key={provider.id} className="flex items-start justify-between gap-3 border-b border-border/70 py-3">
            <div className="min-w-0">
              <div className="text-meta leading-5 text-subtle">{provider.name}</div>
              <div className="mt-1 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
                {provider.kind === 'workers-ai' ? 'Binding Cloudflare' : provider.baseUrl ?? 'Endpoint distant'}
              </div>
            </div>
            <StatusBadge tone={!provider.isActive ? 'neutral' : provider.lastError ? 'warning' : 'success'}>
              {provider.isActive ? `${provider.modelCount} modèles` : 'Inactif'}
            </StatusBadge>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">Échecs récents</span>
          <span className={cn('font-mono text-xs tabular-nums', data.counts.failedAnalyses30d > 0 ? 'text-warning' : 'text-foreground')}>{data.counts.failedAnalyses30d}</span>
        </div>
      </div>
    </section>
  )
}

function SmallFigure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl leading-none tracking-tight">{value}</div>
      <div className="mt-1 font-mono text-tiny tracking-caps text-muted-foreground uppercase">{label}</div>
    </div>
  )
}

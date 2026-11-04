import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { FileSearch, Filter, Plus, Search, X } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/patterns/page-header'
import { SectionCard } from '@/components/patterns/section-card'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageSkeleton } from '@/components/patterns/route-states'
import { RelativeTime } from '@/components/patterns/relative-time'
import { InvestigationStatusBadge, SeverityBadge, VerdictBadge, CountBadge } from '@/components/patterns/badges'
import { Truncate } from '@/components/premium/truncate'
import { SEVERITIES, SEVERITY_LABELS, VERDICTS, VERDICT_LABELS } from '@/lib/alert'
import { STATUS_LABELS } from '@/lib/investigation-labels'
import { listInvestigationsFn } from '@/server/fns/investigations'

const search = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  verdict: z.string().optional(),
  page: z.number().int().min(1).optional(),
})

export const Route = createFileRoute('/app/investigations/')({
  validateSearch: search,
  loaderDeps: ({ search: filters }) => filters,
  loader: ({ deps }) =>
    listInvestigationsFn({
      data: {
        search: deps.search,
        status: deps.status,
        severity: deps.severity,
        verdict: deps.verdict,
        page: deps.page ?? 1,
        pageSize: 12,
      },
    }),
  pendingComponent: () => <PageSkeleton rows={6} />,
  component: InvestigationsPage,
})

function InvestigationsPage() {
  const data = Route.useLoaderData()
  const filters = Route.useSearch()
  const navigate = useNavigate()
  const [term, setTerm] = useState(filters.search ?? '')
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize))
  const activeFilters = [filters.search, filters.status, filters.severity, filters.verdict].filter(Boolean).length

  function update(next: Partial<z.infer<typeof search>>) {
    void navigate({
      to: '/app/investigations',
      search: clean({ ...filters, ...next, page: next.page ?? 1 }),
    })
  }

  function reset() {
    setTerm('')
    void navigate({ to: '/app/investigations', search: {} })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={
          <>
            <FileSearch aria-hidden className="size-3.5" />
            Historique
          </>
        }
        title="Toutes les investigations"
        description="Retrouvez une alerte, reprenez une investigation interrompue, comparez les verdicts. Chaque dossier conserve son alerte originale, ses analyses et ses preuves importées."
        actions={
          <Button asChild size="sm">
            <Link to="/app/investigations/new">
              <span className="inline-flex items-center gap-2">
                <Plus aria-hidden />
                Nouvelle investigation
              </span>
            </Link>
          </Button>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-2">
              <CountBadge>{data.total}</CountBadge>
              investigation{data.total > 1 ? 's' : ''} au total
            </span>
            {activeFilters > 0 && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-brand hover:underline">
                <X aria-hidden className="size-3" />
                Réinitialiser les filtres
              </button>
            )}
          </>
        }
      />

      <SectionCard flush>
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              update({ search: term.trim() || undefined })
            }}
            className="relative min-w-0 flex-1"
          >
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Rechercher par titre, règle, hôte ou utilisateur"
              aria-label="Rechercher une investigation"
              className="h-11 pl-9 sm:h-9"
            />
            {term && (
              <button
                type="button"
                onClick={() => {
                  setTerm('')
                  update({ search: undefined })
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            )}
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <Filter aria-hidden className="size-3.5 text-muted-foreground" />
            <Select value={filters.status ?? 'all'} onValueChange={(value) => update({ status: value === 'all' ? undefined : value })}>
              <SelectTrigger className="h-11 w-36 bg-surface-1 text-xs sm:h-9" aria-label="Filtrer par statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.severity ?? 'all'} onValueChange={(value) => update({ severity: value === 'all' ? undefined : value })}>
              <SelectTrigger className="h-11 w-36 bg-surface-1 text-xs sm:h-9" aria-label="Filtrer par sévérité">
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sévérités</SelectItem>
                {SEVERITIES.map((value) => (
                  <SelectItem key={value} value={value}>{SEVERITY_LABELS[value]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.verdict ?? 'all'} onValueChange={(value) => update({ verdict: value === 'all' ? undefined : value })}>
              <SelectTrigger className="h-11 w-40 bg-surface-1 text-xs sm:h-9" aria-label="Filtrer par verdict">
                <SelectValue placeholder="Verdict" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les verdicts</SelectItem>
                {VERDICTS.map((value) => (
                  <SelectItem key={value} value={value}>{VERDICT_LABELS[value]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {data.rows.length === 0 ? (
          <EmptyState
            icon={<FileSearch aria-hidden />}
            title={activeFilters ? 'Aucun résultat avec ces filtres' : 'Aucune investigation'}
            description={
              activeFilters
                ? 'Essayez une recherche plus large ou réinitialisez les filtres.'
                : 'Importez une alerte Elastic pour créer votre premier dossier d’investigation.'
            }
            action={
              activeFilters ? (
                <Button variant="secondary" size="sm" onClick={reset}>Réinitialiser</Button>
              ) : (
                <Button asChild size="sm"><Link to="/app/investigations/new">Importer une alerte</Link></Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="hidden w-full min-w-table-xx border-collapse text-left text-xs md:table">
                <thead>
                  <tr className="border-b border-border/70 text-micro tracking-pill text-muted-foreground uppercase">
                    <th className="px-5 py-2 font-medium">Investigation</th>
                    <th className="px-3 py-2 font-medium">Sévérité</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Verdict</th>
                    <th className="px-3 py-2 font-medium">Requêtes</th>
                    <th className="px-3 py-2 font-medium">Analyste</th>
                    <th className="px-5 py-2 text-right font-medium">Dernière activité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.rows.map((row) => (
                    <tr key={row.id} className="group transition-colors hover:bg-accent/30">
                      <td className="max-w-form px-5 py-4">
                        <Link to="/app/investigations/$investigationId" params={{ investigationId: row.id }} className="block min-w-0">
                          <Truncate className="text-body font-medium group-hover:text-brand">{row.title}</Truncate>
                          <Truncate className="mt-0.5 text-meta text-muted-foreground">{row.ruleName ?? 'Règle sans nom'}</Truncate>
                        </Link>
                      </td>
                      <td className="px-3 py-4"><SeverityBadge severity={row.severity} /></td>
                      <td className="px-3 py-4"><InvestigationStatusBadge status={row.status} /></td>
                      <td className="px-3 py-4">{row.verdict ? <VerdictBadge verdict={row.verdict} /> : <span className="text-muted-foreground">n/d</span>}</td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-subtle num">{row.queryCount}</span>
                          {row.openQueryCount > 0 && <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-micro text-warning">{row.openQueryCount} en attente</span>}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-muted-foreground">{row.ownerName}</td>
                      <td className="px-5 py-4 text-right text-muted-foreground"><RelativeTime value={row.lastActivityAt} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="divide-y divide-border/60 md:hidden">
                {data.rows.map((row) => (
                  <Link key={row.id} to="/app/investigations/$investigationId" params={{ investigationId: row.id }} className="block px-5 py-4 transition-colors hover:bg-accent/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Truncate className="text-body font-medium">{row.title}</Truncate>
                        <Truncate className="mt-1 text-meta text-muted-foreground">{row.ruleName ?? 'Règle sans nom'}</Truncate>
                      </div>
                      <SeverityBadge severity={row.severity} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <InvestigationStatusBadge status={row.status} />
                      {row.verdict && <VerdictBadge verdict={row.verdict} />}
                      {row.openQueryCount > 0 && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-micro text-warning">{row.openQueryCount} requête{row.openQueryCount > 1 ? 's' : ''} en attente</span>}
                    </div>
                    <div className="mt-2 text-meta text-muted-foreground">{row.ownerName} · <RelativeTime value={row.lastActivityAt} /></div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-3">
              <p className="text-meta text-muted-foreground">
                {data.total === 0 ? '0' : `${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)}`} sur {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="xs" disabled={data.page <= 1} onClick={() => update({ page: data.page - 1 })}>Précédent</Button>
                <span className="text-meta text-muted-foreground num">Page {data.page} / {pageCount}</span>
                <Button variant="outline" size="xs" disabled={data.page >= pageCount} onClick={() => update({ page: data.page + 1 })}>Suivant</Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  )
}

function clean<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T
}

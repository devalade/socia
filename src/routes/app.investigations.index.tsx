import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { FileSearch, Plus, Search, X } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/patterns/page-header'
import { SectionCard } from '@/components/patterns/section-card'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageSkeleton } from '@/components/patterns/route-states'
import { RelativeTime } from '@/components/patterns/relative-time'
import { InvestigationStatusBadge, SeverityBadge, VerdictBadge } from '@/components/patterns/badges'
import { StatusBadge } from '@/components/premium/status-badge'
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
    <div className="grid gap-5">
      <PageHeader
        title="Dossiers"
        description="Retrouvez une alerte, reprenez une investigation interrompue, comparez les verdicts. Chaque dossier conserve son alerte originale, ses analyses et ses preuves importées."
        actions={
          <Button asChild size="sm">
            <Link to="/app/investigations/new">
              <Plus aria-hidden />
              Nouveau dossier
            </Link>
          </Button>
        }
        meta={
          <>
            <span>{data.total} dossier{data.total > 1 ? 's' : ''}</span>
            {activeFilters > 0 && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-brand hover:underline">
                <X aria-hidden className="size-3.5" />
                Réinitialiser les filtres
              </button>
            )}
          </>
        }
      />

      <SectionCard flush>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              update({ search: term.trim() || undefined })
            }}
            className="relative min-w-0 flex-1"
          >
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Rechercher par titre, règle, hôte ou utilisateur"
              aria-label="Rechercher une investigation"
              className="h-11 ps-9 sm:h-9"
            />
            {term && (
              <button
                type="button"
                onClick={() => {
                  setTerm('')
                  update({ search: undefined })
                }}
                className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            )}
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filters.status ?? 'all'} onValueChange={(value) => update({ status: value === 'all' ? undefined : value })}>
              <SelectTrigger className="h-11 w-full sm:h-9 sm:w-40" aria-label="Filtrer par statut">
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
              <SelectTrigger className="h-11 w-full sm:h-9 sm:w-40" aria-label="Filtrer par sévérité">
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
              <SelectTrigger className="h-11 w-full sm:h-9 sm:w-44" aria-label="Filtrer par verdict">
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
            title={activeFilters ? 'Aucun résultat avec ces filtres' : 'Aucun dossier'}
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
            <div className="hidden md:block">
              <Table className="min-w-table-xx">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-5">Dossier</TableHead>
                    <TableHead>Sévérité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead>Requêtes</TableHead>
                    <TableHead>Analyste</TableHead>
                    <TableHead className="pe-5 text-right">Activité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-form ps-5">
                        <Link to="/app/investigations/$investigationId" params={{ investigationId: row.id }} className="block min-w-0">
                          <Truncate className="font-medium text-foreground hover:text-brand">{row.title}</Truncate>
                          <Truncate className="mt-0.5 text-xs text-muted-foreground">{row.ruleName ?? 'Règle sans nom'}</Truncate>
                        </Link>
                      </TableCell>
                      <TableCell><SeverityBadge severity={row.severity} /></TableCell>
                      <TableCell><InvestigationStatusBadge status={row.status} /></TableCell>
                      <TableCell>{row.verdict ? <VerdictBadge verdict={row.verdict} /> : <span className="text-xs text-muted-foreground">n/d</span>}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-small text-subtle num">{row.queryCount}</span>
                          {row.openQueryCount > 0 && <StatusBadge tone="warning">{row.openQueryCount} en attente</StatusBadge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-small text-muted-foreground">{row.ownerName}</TableCell>
                      <TableCell className="pe-5 text-right text-xs text-muted-foreground"><RelativeTime value={row.lastActivityAt} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {data.rows.map((row) => (
                <Link key={row.id} to="/app/investigations/$investigationId" params={{ investigationId: row.id }} className="block px-4 py-4 transition-colors hover:bg-accent/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Truncate lines={2} className="font-medium text-foreground">{row.title}</Truncate>
                      <Truncate className="mt-1 text-xs text-muted-foreground">{row.ruleName ?? 'Règle sans nom'}</Truncate>
                    </div>
                    <SeverityBadge severity={row.severity} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <InvestigationStatusBadge status={row.status} />
                    {row.verdict && <VerdictBadge verdict={row.verdict} />}
                    {row.openQueryCount > 0 && <StatusBadge tone="warning">{row.openQueryCount} en attente</StatusBadge>}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{row.ownerName} · <RelativeTime value={row.lastActivityAt} /></div>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {data.total === 0 ? '0' : `${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)}`} sur {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => update({ page: data.page - 1 })}>Précédent</Button>
                <span className="text-xs text-muted-foreground num">Page {data.page} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={data.page >= pageCount} onClick={() => update({ page: data.page + 1 })}>Suivant</Button>
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

import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  GitBranch,
  Lightbulb,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  ScanText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageSkeleton } from '@/components/patterns/route-states'
import { RelativeTime } from '@/components/patterns/relative-time'
import { SeverityBadge, InvestigationStatusBadge, VerdictBadge } from '@/components/patterns/badges'
import { CopyButton } from '@/components/patterns/copy-button'
import { AnalysisView } from '@/components/investigation/analysis-view'
import { TimelineView } from '@/components/investigation/timeline-view'
import { HypothesesView } from '@/components/investigation/hypotheses-view'
import { QueryCard } from '@/components/investigation/query-card'
import { JournalView } from '@/components/investigation/journal-view'
import { ConclusionDialog, EditInvestigationDialog, ManualQueryDialog } from '@/components/investigation/dialogs'
import { dateTime } from '@/lib/dates'
import { runAnalysisFn } from '@/server/fns/analysis'
import { archiveInvestigationFn, getInvestigationFn, reopenInvestigationFn } from '@/server/fns/investigations'
import { generateReportFn } from '@/server/fns/reports'
import { cn } from '@/lib/utils'

const search = z.object({
  tab: z.enum(['synthese', 'chronologie', 'hypotheses', 'requetes', 'journal']).optional(),
})

export const Route = createFileRoute('/app/investigations/$investigationId')({
  validateSearch: search,
  loader: ({ params }) => getInvestigationFn({ data: { id: params.investigationId } }),
  pendingComponent: () => <PageSkeleton rows={3} />,
  component: InvestigationWorkspace,
})

const TABS = [
  { id: 'synthese', label: 'Synthèse', icon: ScanText },
  { id: 'chronologie', label: 'Chronologie', icon: Clock3 },
  { id: 'hypotheses', label: 'Hypothèses', icon: Lightbulb },
  { id: 'requetes', label: 'Requêtes KQL', icon: GitBranch },
  { id: 'journal', label: 'Journal', icon: ClipboardList },
] as const

type TabId = (typeof TABS)[number]['id']

function InvestigationWorkspace() {
  const detail = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  const router = useRouter()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>(Route.useSearch().tab ?? 'synthese')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [conclusionOpen, setConclusionOpen] = useState(false)
  const [manualQueryOpen, setManualQueryOpen] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const autoStarted = useRef(false)

  const investigation = detail.investigation
  const canEdit = detail.canEdit && investigation.status !== 'archived'
  const concluded = investigation.status === 'concluded'
  const hasAnalysis = Boolean(detail.analysis)
  const orderedQueries = [...detail.queries].sort((a, b) => {
    const rank: Record<string, number> = { proposed: 0, inconclusive: 1, executed: 2, skipped: 3 }
    return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || b.createdAt.localeCompare(a.createdAt)
  })
  const proposed = detail.queries.filter((query) => query.status === 'proposed').length
  const executed = detail.queries.filter((query) => query.status === 'executed').length
  const reportVersion = detail.reports[0]?.version ?? null

  async function analyze() {
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const result = await runAnalysisFn({ data: { investigationId: investigation.id } })
      toast.success(hasAnalysis ? 'Réanalyse terminée' : 'Analyse initiale terminée', {
        description: `${result.modelId} · ${(result.durationMs / 1000).toFixed(1)} s`,
      })
      await router.invalidate()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'L’analyse a échoué.'
      setAnalysisError(message)
      toast.error('Analyse interrompue', { description: message })
    } finally {
      setAnalyzing(false)
    }
  }

  async function generate() {
    setGeneratingReport(true)
    try {
      const report = await generateReportFn({ data: { investigationId: investigation.id } })
      toast.success('Rapport généré', { description: `Version ${report.version}.` })
      await navigate({
        to: '/app/investigations/$investigationId/report',
        params: { investigationId: investigation.id },
        search: { version: report.version },
      })
    } catch (error) {
      toast.error('Génération impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setGeneratingReport(false)
    }
  }

  async function reopen() {
    try {
      await reopenInvestigationFn({ data: { investigationId: investigation.id } })
      toast.success('Investigation rouverte')
      await router.invalidate()
    } catch (error) {
      toast.error('Réouverture impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    }
  }

  async function archive() {
    try {
      await archiveInvestigationFn({ data: { investigationId: investigation.id } })
      toast.success('Investigation archivée')
      await router.invalidate()
    } catch (error) {
      toast.error('Archivage impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    }
  }

  useEffect(() => {
    if (autoStarted.current) return
    if (sessionStorage.getItem('socia:auto-run') !== investigation.id) return
    autoStarted.current = true
    sessionStorage.removeItem('socia:auto-run')
    if (detail.canEdit && investigation.status !== 'concluded' && investigation.status !== 'archived' && !detail.analysis) {
      void analyze()
    }
    // analyze closes over the current investigation id; it is intentionally run once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigation.id])

  function changeTab(next: TabId) {
    setTab(next)
    void navigate({ to: '/app/investigations/$investigationId', params: { investigationId: investigation.id }, search: { tab: next }, replace: true })
  }

  return (
    <div className="grid gap-10">
      <div className="flex flex-col gap-5 border-b border-border pb-8">
        <Link to="/app/investigations" className="inline-flex w-fit items-center gap-1.5 text-meta text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-3.5" />
          Toutes les investigations
        </Link>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 font-mono text-tiny tracking-label text-muted-foreground uppercase">Dossier / {investigation.id} · ouvert le {dateTime(investigation.createdAt)} · par {detail.ownerName}</div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SeverityBadge severity={detail.summary.severity} />
              <InvestigationStatusBadge status={investigation.status} />
              {investigation.verdict && <VerdictBadge verdict={investigation.verdict} />}
              {detail.securityFlags.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/8 px-2 py-0.5 text-micro text-warning">
                  <ShieldAlert aria-hidden className="size-3" />
                  Contenu non fiable signalé
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <h1 className="max-w-4xl font-display text-4xl leading-poster tracking-poster sm:text-5xl">{investigation.title}</h1>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} aria-label="Modifier l’investigation" className="mt-0.5 shrink-0">
                  <Pencil aria-hidden />
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
              {detail.summary.host && <span>Hôte : {detail.summary.host}</span>}
              {detail.summary.user && <span>Utilisateur : {detail.summary.user}</span>}
              {detail.summary.process && <span>Processus : {detail.summary.process}</span>}
              <span>Ouverte le {dateTime(investigation.createdAt)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:[&_[data-slot=button]]:h-11 max-sm:[&_[data-slot=button]]:px-5">
            {!concluded && canEdit && (
              <Button size="sm" variant="outline" onClick={() => void analyze()} loading={analyzing} disabled={analyzing}>
                <RefreshCw aria-hidden />
                {hasAnalysis ? 'Relancer l’analyse' : 'Lancer l’analyse'}
              </Button>
            )}
            {!concluded && canEdit && (
              <Button size="sm" onClick={() => setConclusionOpen(true)}>
                <CheckCircle2 aria-hidden />
                Clôturer
              </Button>
            )}
            {concluded && (
              <Button size="sm" variant="outline" onClick={() => void generate()} loading={generatingReport} disabled={generatingReport}>
                <FileText aria-hidden />
                {reportVersion ? 'Nouvelle version du rapport' : 'Générer le rapport'}
              </Button>
            )}
            {reportVersion && (
              <Button asChild size="sm">
                <Link to="/app/investigations/$investigationId/report" params={{ investigationId: investigation.id }} search={{ version: reportVersion }}>
                  <span className="inline-flex items-center gap-2">
                    <FileText aria-hidden />
                    Voir le rapport v{reportVersion}
                  </span>
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Plus d’actions">
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Investigation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {concluded && canEdit && (
                  <DropdownMenuItem onSelect={() => void reopen()}>
                    <RefreshCw aria-hidden />
                    Rouvrir
                  </DropdownMenuItem>
                )}
                {canEdit && investigation.status !== 'archived' && (
                  <DropdownMenuItem onSelect={() => void archive()}>
                    <LockKeyhole aria-hidden />
                    Archiver
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setManualQueryOpen(true)} disabled={!canEdit}>
                  <Plus aria-hidden />
                  Ajouter une requête
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => changeTab('journal')}>
                  <ClipboardList aria-hidden />
                  Voir l’alerte originale
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {detail.securityFlags.length > 0 && (
          <div className="flex items-start gap-2 border-l-2 border-warning py-2 pl-4 text-meta leading-5 text-warning">
            <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              L’alerte importée contient des formulations qui imitent des instructions. SOCIA les a traitées comme des données non fiables. Aucune instruction issue du document n’a été suivie.
            </span>
          </div>
        )}

        {analysisError && (
          <div className="flex flex-wrap items-center gap-3 border-l-2 border-destructive py-2 pl-4 text-meta leading-5 text-destructive">
            <AlertTriangle aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{analysisError}</span>
            {canEdit && <Button size="xs" variant="outline" onClick={() => void analyze()} loading={analyzing}>Réessayer</Button>}
          </div>
        )}
      </div>

      <div className="grid gap-10 layout-workspace">
        <div className="min-w-0">
          <div className="scroll-thin mb-8 flex items-center overflow-x-auto border-b border-border">
            {TABS.map((item, index) => {
              const count = item.id === 'requetes' ? detail.queries.length : item.id === 'hypotheses' ? detail.hypotheses.length : item.id === 'chronologie' ? detail.timeline.length : null
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeTab(item.id)}
                  className={cn(
                    'relative flex h-11 shrink-0 items-center gap-2 px-4 font-mono text-tiny tracking-caps uppercase text-muted-foreground transition-colors hover:text-foreground',
                    tab === item.id && 'text-foreground after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-brand',
                  )}
                >
                  <span className={tab === item.id ? 'text-brand' : 'text-muted-foreground/50'}>{String(index + 1).padStart(2, '0')}</span>
                  {item.label}
                  {count !== null && count > 0 && <span className="font-mono text-tiny text-muted-foreground">{count}</span>}
                </button>
              )
            })}
          </div>

          {analyzing && (
            <div className="mb-6 flex items-start gap-3 border-l-2 border-brand py-2 pl-4">
              <span className="mt-0.5 text-brand">
                <Sparkles aria-hidden className="size-4 animate-pulse" />
              </span>
              <div>
                <div className="text-copy font-medium text-foreground">Analyse en cours</div>
                <p className="mt-0.5 text-meta leading-5 text-muted-foreground">
                  Le modèle lit l’alerte, les résultats importés et l’historique. L’investigation restera enregistrée si l’appel échoue.
                </p>
              </div>
            </div>
          )}

          {tab === 'synthese' && (
            <>
              {!hasAnalysis && !analyzing && (
                <EmptyState
                  icon={<Sparkles aria-hidden />}
                  title="Aucune analyse pour le moment"
                  description={
                    canEdit
                      ? 'L’analyse initiale expliquera la règle, reconstruira l’événement et séparera les faits, déductions, hypothèses et informations manquantes.'
                      : 'Aucune analyse n’a encore été lancée. Un analyste doit lancer l’analyse initiale.'
                  }
                  action={
                    canEdit ? (
                      <Button onClick={() => void analyze()} loading={analyzing}>
                        <Play aria-hidden />
                        Lancer l’analyse initiale
                      </Button>
                    ) : undefined
                  }
                />
              )}
              {hasAnalysis && detail.analysis && (
                <div className="grid gap-10">
                  {concluded && investigation.verdict && (
                    <section className="border-t-2 border-brand pt-4">
                      <div className="font-mono text-tiny tracking-label text-brand uppercase">Verdict de l’analyste</div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <VerdictBadge verdict={investigation.verdict} />
                        <span className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">confiance {investigation.confidence === null ? 'n/d' : `${investigation.confidence}%`}</span>
                        <span className="ms-auto font-mono text-tiny tracking-caps text-muted-foreground uppercase">Clôturée le {dateTime(investigation.closedAt)}</span>
                      </div>
                      <p className="mt-3 max-w-reading whitespace-pre-wrap text-meta leading-6 text-subtle">{investigation.conclusionJustification || 'Justification non renseignée.'}</p>
                    </section>
                  )}
                  <AnalysisView analysis={detail.analysis} />
                </div>
              )}
            </>
          )}

          {tab === 'chronologie' && <TimelineView events={detail.timeline} />}
          {tab === 'hypotheses' && <HypothesesView hypotheses={detail.hypotheses} investigationId={investigation.id} canEdit={canEdit} />}
          {tab === 'requetes' && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-meta text-muted-foreground">
                  {detail.queries.length === 0
                    ? 'Aucune requête proposée.'
                    : `${detail.queries.length} requête${detail.queries.length > 1 ? 's' : ''} · ${executed} exécutée${executed > 1 ? 's' : ''} · ${proposed} en attente`}
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setManualQueryOpen(true)}>
                    <Plus aria-hidden />
                    Ajouter une requête
                  </Button>
                )}
              </div>
              {orderedQueries.length === 0 ? (
                <EmptyState
                  icon={<GitBranch aria-hidden />}
                  title="Aucune requête KQL"
                  description="L’analyse propose des questions et des requêtes en lecture seule. Vous les exécutez dans votre SIEM, puis vous importez les résultats."
                />
              ) : (
                <div className="grid gap-4">
                  {orderedQueries.map((query) => (
                    <QueryCard key={query.id} query={query} investigationId={investigation.id} canEdit={canEdit} />
                  ))}
                </div>
              )}
              {executed > 0 && canEdit && !concluded && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4">
                  <div className="text-small leading-5 text-muted-foreground">
                    <span className="font-medium text-foreground">Des résultats ont été importés.</span> Relancez l’analyse pour réinterpréter les preuves et mettre à jour les hypothèses.
                  </div>
                  <Button size="sm" onClick={() => void analyze()} loading={analyzing}>
                    <RefreshCw aria-hidden />
                    Réanalyser
                  </Button>
                </div>
              )}
            </div>
          )}
          {tab === 'journal' && <JournalView detail={detail} canComment={viewer.role !== 'viewer'} />}
        </div>

        <aside className="grid content-start gap-8 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <section>
            <div className="font-mono text-tiny tracking-label text-muted-foreground uppercase">Prochaine étape</div>
            <div className="mt-3">
              <NextAction
                hasAnalysis={hasAnalysis}
                proposed={proposed}
                executed={executed}
                concluded={concluded}
                reportVersion={reportVersion}
                canEdit={canEdit}
                onAnalyze={() => void analyze()}
                onGenerate={() => void generate()}
                onOpenQueries={() => changeTab('requetes')}
              />
            </div>
          </section>

          <section className="border-t border-border pt-4">
            <div className="font-mono text-tiny tracking-label text-muted-foreground uppercase">Modèle et traçabilité</div>
            <div className="mt-3 grid gap-2 font-mono text-tiny uppercase">
              <div>
                <div className="text-muted-foreground">Modèle</div>
                <div className="mt-1 break-all text-meta text-subtle normal-case">{investigation.modelId}</div>
                <div className="mt-0.5 text-tiny text-muted-foreground">{detail.analysisRun?.providerId ?? investigation.providerId}</div>
              </div>
              <div className="border-t border-border/70 pt-2 text-muted-foreground">Ouverte le {dateTime(investigation.createdAt)}</div>
              <div className="text-muted-foreground">Dernière activité <RelativeTime value={investigation.lastActivityAt} /></div>
              <div className="text-muted-foreground">Propriétaire : {detail.ownerName}</div>
              <div className="flex items-center gap-2 border-t border-border/70 pt-2">
                <span className="min-w-0 flex-1 truncate text-tiny text-muted-foreground">{investigation.id}</span>
                <CopyButton value={investigation.id} label="" copiedLabel="" size="xs" />
              </div>
            </div>
          </section>

          <div className="border-l-2 border-brand pl-3 text-meta leading-5 text-muted-foreground">
            <div className="font-mono text-tiny tracking-label text-brand uppercase">Périmètre de confiance</div>
            <p className="mt-2">L’alerte, les résultats et les commentaires sont des données. Les consignes système de SOCIA sont séparées et ne peuvent pas être remplacées par le contenu importé.</p>
          </div>
        </aside>
      </div>

      <ConclusionDialog open={conclusionOpen} onOpenChange={setConclusionOpen} investigation={investigation} />
      <EditInvestigationDialog open={editOpen} onOpenChange={setEditOpen} investigation={investigation} />
      <ManualQueryDialog open={manualQueryOpen} onOpenChange={setManualQueryOpen} investigationId={investigation.id} />
    </div>
  )
}

function NextAction({
  hasAnalysis,
  proposed,
  executed,
  concluded,
  reportVersion,
  canEdit,
  onAnalyze,
  onGenerate,
  onOpenQueries,
}: {
  hasAnalysis: boolean
  proposed: number
  executed: number
  concluded: boolean
  reportVersion: number | null
  canEdit: boolean
  onAnalyze: () => void
  onGenerate: () => void
  onOpenQueries: () => void
}) {
  if (concluded) {
    return (
      <div className="grid gap-3">
        <div className="flex items-start gap-2 text-small leading-5 text-muted-foreground">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          Investigation clôturée. Le rapport reprend le verdict, la justification et les preuves importées.
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={onGenerate}>
            <FileText aria-hidden />
            {reportVersion ? 'Nouvelle version' : 'Générer le rapport'}
          </Button>
        )}
      </div>
    )
  }
  if (!hasAnalysis) {
    return (
      <div className="grid gap-3">
        <p className="text-small leading-5 text-muted-foreground">L’alerte est conservée. Il reste à produire l’analyse initiale.</p>
        {canEdit && <Button size="sm" onClick={onAnalyze}><Play aria-hidden />Lancer l’analyse</Button>}
      </div>
    )
  }
  if (proposed > 0) {
    return (
      <div className="grid gap-3">
        <p className="text-small leading-5 text-muted-foreground">{proposed} requête{proposed > 1 ? 's' : ''} attend{proposed > 1 ? 'ent' : ''} d’être exécutée{proposed > 1 ? 's' : ''} dans votre SIEM, puis importée{proposed > 1 ? 's' : ''}.</p>
        <Button size="sm" variant="outline" onClick={onOpenQueries}><GitBranch aria-hidden />Voir les requêtes</Button>
      </div>
    )
  }
  if (executed > 0) {
    return (
      <div className="grid gap-3">
        <p className="text-small leading-5 text-muted-foreground">Les résultats sont importés. Une réanalyse permet de les confronter aux hypothèses.</p>
        {canEdit && <Button size="sm" onClick={onAnalyze}><RefreshCw aria-hidden />Réanalyser</Button>}
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      <p className="text-small leading-5 text-muted-foreground">Aucune preuve n’a encore été importée. Utilisez les requêtes proposées ou ajoutez la vôtre.</p>
      <Button size="sm" variant="outline" onClick={onOpenQueries}><GitBranch aria-hidden />Ouvrir les requêtes</Button>
    </div>
  )
}

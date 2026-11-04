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
import { SectionCard } from '@/components/patterns/section-card'
import { PageSkeleton } from '@/components/patterns/route-states'
import { RelativeTime } from '@/components/patterns/relative-time'
import { SeverityBadge, InvestigationStatusBadge, VerdictBadge } from '@/components/patterns/badges'
import { CopyButton } from '@/components/patterns/copy-button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  const actions = (
    <>
            {!concluded && canEdit && (
              <Button variant="outline" onClick={() => void analyze()} loading={analyzing} disabled={analyzing}>
                <RefreshCw aria-hidden />
                {hasAnalysis ? 'Relancer l’analyse' : 'Lancer l’analyse'}
              </Button>
            )}
            {!concluded && canEdit && (
              <Button onClick={() => setConclusionOpen(true)}>
                <CheckCircle2 aria-hidden />
                Clôturer
              </Button>
            )}
            {concluded && (
              <Button variant="outline" onClick={() => void generate()} loading={generatingReport} disabled={generatingReport}>
                <FileText aria-hidden />
                {reportVersion ? 'Nouvelle version' : 'Générer le rapport'}
              </Button>
            )}
            {reportVersion && (
              <Button asChild variant="outline">
                <Link to="/app/investigations/$investigationId/report" params={{ investigationId: investigation.id }} search={{ version: reportVersion }}>
                  <FileText aria-hidden />
                  Voir le rapport v{reportVersion}
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Plus d’actions">
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
    </>
  )

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/app/investigations" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft aria-hidden className="size-3.5" />
            Dossiers
          </Link>
          <div className="hidden flex-wrap items-center gap-2 lg:flex">{actions}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={detail.summary.severity} />
          <InvestigationStatusBadge status={investigation.status} />
          {investigation.verdict && <VerdictBadge verdict={investigation.verdict} />}
          {detail.securityFlags.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-warning/12 px-2 py-1 text-xs text-warning">
              <ShieldAlert aria-hidden className="size-3.5" />
              Contenu non fiable signalé
            </span>
          )}
        </div>

        <div className="flex items-start gap-2">
          <h1 className="min-w-0 text-2xl leading-8 font-semibold tracking-title text-foreground">{investigation.title}</h1>
          {canEdit && (
            <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} aria-label="Modifier l’investigation" className="shrink-0">
              <Pencil aria-hidden />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {detail.summary.host && <span>Hôte : {detail.summary.host}</span>}
          {detail.summary.user && <span>Utilisateur : {detail.summary.user}</span>}
          {detail.summary.process && <span>Processus : {detail.summary.process}</span>}
          <span>Ouverte le {dateTime(investigation.createdAt)}</span>
          <span className="font-mono">{investigation.id}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:hidden max-sm:[&_[data-slot=button]]:h-11">
          {actions}
        </div>
      </section>

      {detail.securityFlags.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/8 p-3 text-xs leading-5 text-warning">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            L’alerte importée contient des formulations qui imitent des instructions. SOCIA les a traitées comme des données non fiables. Aucune instruction issue du document n’a été suivie.
          </span>
        </div>
      )}

      {analysisError && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-xs leading-5 text-destructive">
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{analysisError}</span>
          {canEdit && <Button size="sm" variant="outline" onClick={() => void analyze()} loading={analyzing}>Réessayer</Button>}
        </div>
      )}

      <div className="grid gap-5 layout-workspace">
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={(value) => changeTab(value as TabId)}>
            <TabsList className="h-9 w-full justify-start overflow-x-auto p-1">
              {TABS.map((item) => {
                const count = item.id === 'requetes' ? detail.queries.length : item.id === 'hypotheses' ? detail.hypotheses.length : item.id === 'chronologie' ? detail.timeline.length : null
                return (
                  <TabsTrigger key={item.id} value={item.id} className="shrink-0 gap-1.5 px-3 text-xs">
                    <item.icon aria-hidden className="size-3.5" />
                    {item.label}
                    {count !== null && count > 0 && <span className="rounded-full bg-accent px-1.5 text-tiny text-muted-foreground num">{count}</span>}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>

          {analyzing && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-brand/25 bg-brand/5 p-4">
              <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 animate-pulse text-brand" />
              <div>
                <div className="text-sm font-medium text-foreground">Analyse en cours</div>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  Le modèle lit l’alerte, les résultats importés et l’historique. L’investigation restera enregistrée si l’appel échoue.
                </p>
              </div>
            </div>
          )}

          <div className="mt-5">
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
                  <div className="grid gap-5">
                    {concluded && investigation.verdict && (
                      <SectionCard title="Verdict de l’analyste" description={`Confiance ${investigation.confidence === null ? 'n/d' : `${investigation.confidence}%`}`} action={<VerdictBadge verdict={investigation.verdict} />}>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-subtle">{investigation.conclusionJustification || 'Justification non renseignée.'}</p>
                        <p className="mt-3 text-xs text-muted-foreground">Clôturée le {dateTime(investigation.closedAt)}</p>
                      </SectionCard>
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
                  <div className="text-xs text-muted-foreground">
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
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/25 bg-brand/5 p-4">
                    <div className="text-sm leading-6 text-muted-foreground">
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
        </div>

        <aside className="grid content-start gap-5">
          <SectionCard title="Prochaine étape">
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
          </SectionCard>

          <SectionCard title="Traçabilité" description="Modèle et propriétaire">
            <dl className="grid gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Modèle</dt>
                {detail.modelLabel !== investigation.modelId && <dd className="mt-1 text-sm font-medium text-foreground">{detail.modelLabel}</dd>}
                <dd className={detail.modelLabel !== investigation.modelId ? 'mt-0.5 break-all font-mono text-xs text-subtle' : 'mt-1 break-all font-mono text-xs text-subtle'}>{investigation.modelId}</dd>
                <dd className="mt-0.5 text-tiny text-muted-foreground">{detail.providerLabel}</dd>
              </div>
              <div className="ms-0.5 grid gap-1 border-t border-border pt-3">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ouverte le</dt><dd className="text-right text-subtle">{dateTime(investigation.createdAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dernière activité</dt><dd className="text-right text-subtle"><RelativeTime value={investigation.lastActivityAt} /></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Propriétaire</dt><dd className="text-right text-subtle">{detail.ownerName}</dd></div>
              </div>
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <span className="min-w-0 flex-1 truncate font-mono text-tiny text-muted-foreground">{investigation.id}</span>
                <CopyButton value={investigation.id} label="" copiedLabel="" size="xs" />
              </div>
            </dl>
          </SectionCard>

          <div className="rounded-xl border border-border bg-surface-1 p-5 text-xs leading-5 text-muted-foreground">
            <div className="flex items-center gap-2 text-label font-medium text-foreground">
              <ShieldAlert aria-hidden className="size-4 text-brand" />
              Périmètre de confiance
            </div>
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
        <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          Investigation clôturée. Le rapport reprend le verdict, la justification et les preuves importées.
        </div>
        {canEdit && (
          <Button className="ms-0.5 w-fit" size="default" variant="outline" onClick={onGenerate}>
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
        <p className="text-sm leading-6 text-muted-foreground">L’alerte est conservée. Il reste à produire l’analyse initiale.</p>
        {canEdit && <Button className="ms-0.5 w-fit" size="default" onClick={onAnalyze}><Play aria-hidden />Lancer l’analyse</Button>}
      </div>
    )
  }
  if (proposed > 0) {
    return (
      <div className="grid gap-3">
        <p className="text-sm leading-6 text-muted-foreground">{proposed} requête{proposed > 1 ? 's' : ''} attend{proposed > 1 ? 'ent' : ''} d’être exécutée{proposed > 1 ? 's' : ''} dans votre SIEM, puis importée{proposed > 1 ? 's' : ''}.</p>
        <Button className="ms-0.5 w-fit" size="default" variant="outline" onClick={onOpenQueries}><GitBranch aria-hidden />Voir les requêtes</Button>
      </div>
    )
  }
  if (executed > 0) {
    return (
      <div className="grid gap-3">
        <p className="text-sm leading-6 text-muted-foreground">Les résultats sont importés. Une réanalyse permet de les confronter aux hypothèses.</p>
        {canEdit && <Button className="ms-0.5 w-fit" size="default" onClick={onAnalyze}><RefreshCw aria-hidden />Réanalyser</Button>}
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6 text-muted-foreground">Aucune preuve n’a encore été importée. Utilisez les requêtes proposées ou ajoutez la vôtre.</p>
      <Button className="ms-0.5 w-fit" size="default" variant="outline" onClick={onOpenQueries}><GitBranch aria-hidden />Ouvrir les requêtes</Button>
    </div>
  )
}

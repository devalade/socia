import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Download, FileText, Printer, ShieldCheck } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/premium/status-badge'
import { PageHeader } from '@/components/patterns/page-header'
import { PageSkeleton } from '@/components/patterns/route-states'
import { ConfidenceMeter } from '@/components/patterns/confidence-meter'
import { KqlBlock } from '@/components/patterns/kql-block'
import { getReportFn, recordExportFn } from '@/server/fns/reports'
import { dateTime } from '@/lib/dates'
import { NOT_PROVIDED } from '@/lib/report'
import { VERDICT_LABELS, type Verdict } from '@/lib/alert'
import { HYPOTHESIS_STATUS_LABELS } from '@/lib/investigation-labels'
import { cn } from '@/lib/utils'

const search = z.object({ version: z.coerce.number().int().min(1).optional() })

export const Route = createFileRoute('/app/investigations/$investigationId_/report')({
  validateSearch: search,
  loaderDeps: ({ search: filters }) => filters,
  loader: ({ params, deps }) => getReportFn({ data: { investigationId: params.investigationId, version: deps.version } }),
  pendingComponent: () => <PageSkeleton rows={2} />,
  component: ReportPage,
})

function ReportPage() {
  const report = Route.useLoaderData()
  const [busy, setBusy] = useState<'pdf' | 'md' | null>(null)
  const content = report.content
  const tone = verdictTone(content.verdict)

  async function exportPdf() {
    setBusy('pdf')
    try {
      await recordExportFn({ data: { investigationId: content.investigationId, format: 'pdf' } })
      window.print()
    } catch (error) {
      toast.error('Journalisation impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  async function exportMarkdown() {
    setBusy('md')
    try {
      await recordExportFn({ data: { investigationId: content.investigationId, format: 'markdown' } })
      const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `socia-${content.investigationId}-v${report.version}.md`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Markdown exporté')
    } catch (error) {
      toast.error('Export impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-6" data-print="page">
      <div data-print="hide">
        <PageHeader
          eyebrow={
            <>
              <Link to="/app/investigations/$investigationId" params={{ investigationId: content.investigationId }} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft aria-hidden className="size-3.5" />
                Investigation
              </Link>
              <span className="text-muted-foreground/40">/</span>
              Rapport v{report.version}
            </>
          }
          title="Rapport d’investigation"
          description="Document structuré, fondé sur l’alerte originale, les analyses et les preuves importées. Les champs non renseignés sont explicitement signalés."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => void exportMarkdown()} loading={busy === 'md'} disabled={busy !== null}>
                <Download aria-hidden />
                Markdown
              </Button>
              <Button size="sm" onClick={() => void exportPdf()} loading={busy === 'pdf'} disabled={busy !== null}>
                <Printer aria-hidden />
                Exporter en PDF
              </Button>
            </>
          }
          meta={
            <>
              <span className="inline-flex items-center gap-1.5"><FileText aria-hidden className="size-3.5" />Version {report.version}</span>
              <span>Généré le {dateTime(report.createdAt)}</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden className="size-3.5 text-brand" />Aucune commande exécutée par SOCIA</span>
            </>
          }
        />
      </div>

      <article className="mx-auto min-w-0 w-full max-w-report">
        <Card data-print="card" className="overflow-hidden rounded-xl border-border/80 bg-card p-0 shadow-none">
          <div className="border-b border-border/70 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-micro font-medium tracking-wide text-muted-foreground uppercase">SOCIA · Rapport d’investigation SOC</p>
                <h1 className="mt-3 max-w-3xl font-display text-4xl leading-poster tracking-poster sm:text-5xl">{content.title}</h1>
                <p className="mt-2 font-mono text-meta text-muted-foreground">{content.investigationId}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-1 px-4 py-3 text-right">
                <div className="text-micro tracking-caps text-muted-foreground uppercase">Verdict</div>
                <div className={cn('mt-1 font-display text-2xl leading-none', tone.text)}>{VERDICT_LABELS[content.verdict as Verdict] ?? content.verdictLabel}</div>
                <div className="mt-2 w-40"><ConfidenceMeter value={content.confidence} /></div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 border-b border-border/70 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Analyste" value={content.analystName} />
            <Meta label="Modèle" value={`${content.providerName} · ${content.modelId}`} mono />
            <Meta label="Ouverte le" value={dateTime(content.createdAt)} />
            <Meta label="Clôturée le" value={dateTime(content.closedAt)} />
          </div>

          <div className="grid min-w-0 gap-8 p-6 sm:p-8">
            <Section title="Verdict et justification">
              <div className={cn('mb-4 flex items-center gap-2', tone.text)}>
                <StatusBadge tone={tone.badge}>{VERDICT_LABELS[content.verdict as Verdict] ?? content.verdictLabel}</StatusBadge>
                <span className="text-meta text-muted-foreground">confiance {content.confidence === null ? NOT_PROVIDED : `${content.confidence}%`}</span>
              </div>
              <p className={cn('max-w-reading whitespace-pre-wrap text-ui leading-7', content.justification === NOT_PROVIDED ? 'text-warning' : 'text-subtle')}>{content.justification}</p>
            </Section>

            <Section title="Synthèse exécutive">
              <p className={cn('max-w-reading whitespace-pre-wrap text-ui leading-7', content.executiveSummary === NOT_PROVIDED ? 'text-warning' : 'text-subtle')}>{content.executiveSummary}</p>
            </Section>

            <Section title="Périmètre de l’alerte">
              <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                {Object.entries(content.scope).map(([key, value]) => (
                  <div key={key} className="bg-card px-4 py-3">
                    <div className="text-micro tracking-caps text-muted-foreground uppercase">{scopeLabel(key)}</div>
                    <div className={cn('mt-1 text-small break-words', value === NOT_PROVIDED ? 'text-warning' : 'text-subtle')}>{value}</div>
                  </div>
                ))}
              </div>
            </Section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="Lecture de la règle">
                <p className="max-w-reading whitespace-pre-wrap text-copy leading-6 text-subtle">{content.ruleExplanation}</p>
              </Section>
              <Section title="Événement déclencheur">
                <p className="max-w-reading whitespace-pre-wrap text-copy leading-6 text-subtle">{content.triggeringEvent}</p>
              </Section>
            </div>

            <Section title="Contexte et limites de l’analyse">
              <p className="max-w-reading whitespace-pre-wrap text-copy leading-6 text-subtle">{content.contextReconstruction}</p>
            </Section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Section title={`Faits observés (${content.facts.length})`}>
                <ReportList items={content.facts} empty="Aucun fait explicitement extrait." tone="fact" />
              </Section>
              <Section title={`Déductions (${content.deductions.length})`}>
                <ReportList items={content.deductions} empty="Aucune déduction formulée." tone="deduction" />
              </Section>
            </div>

            <Section title={`Hypothèses (${content.hypotheses.length})`}>
              {content.hypotheses.length === 0 ? (
                <p className="text-small text-muted-foreground">Aucune hypothèse active.</p>
              ) : (
                <div className="grid gap-2">
                  {content.hypotheses.map((hypothesis, index) => (
                    <div key={`${hypothesis.statement}-${index}`} className="rounded-lg border border-border bg-surface-1/50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-copy font-medium">{hypothesis.statement}</span>
                        <StatusBadge tone={hypothesis.status === 'supported' ? 'success' : hypothesis.status === 'refuted' ? 'danger' : hypothesis.status === 'inconclusive' ? 'neutral' : 'warning'}>
                          {HYPOTHESIS_STATUS_LABELS[hypothesis.status] ?? hypothesis.status}
                        </StatusBadge>
                        <span className="text-micro text-muted-foreground">confiance {hypothesis.confidence ?? NOT_PROVIDED}%</span>
                      </div>
                      <p className="mt-1 text-meta leading-5 text-muted-foreground">{hypothesis.rationale || NOT_PROVIDED}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Chronologie">
              {content.timeline.length === 0 ? (
                <p className="text-small text-warning">Aucun événement horodaté reconstruit. {NOT_PROVIDED}.</p>
              ) : (
                <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-table border-collapse text-left text-meta">
                    <thead className="bg-surface-1 text-tiny tracking-pill text-muted-foreground uppercase">
                      <tr>
                        <th className="px-3 py-2 font-medium">Horodatage</th>
                        <th className="px-3 py-2 font-medium">Événement</th>
                        <th className="px-3 py-2 font-medium">Source</th>
                        <th className="px-3 py-2 font-medium">Nature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {content.timeline.map((event, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 font-mono text-micro text-muted-foreground">{event.timestamp || NOT_PROVIDED}</td>
                          <td className="px-3 py-2 text-subtle">{event.event}</td>
                          <td className="px-3 py-2 text-muted-foreground">{event.source || NOT_PROVIDED}</td>
                          <td className="px-3 py-2 text-muted-foreground">{event.certainty === 'fact' ? 'Fait' : event.certainty === 'deduction' ? 'Déduction' : event.certainty === 'hypothesis' ? 'Hypothèse' : event.certainty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title={`Preuves importées (${content.evidence.length})`}>
              {content.evidence.length === 0 ? (
                <p className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-meta leading-5 text-warning">
                  Aucun résultat de recherche n’a été importé. {NOT_PROVIDED}. L’absence de preuve importée n’est pas une preuve d’absence d’activité.
                </p>
              ) : (
                <div className="grid gap-4">
                  {content.evidence.map((query, index) => (
                    <div key={index} className="grid gap-3 rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-copy font-medium">{query.question}</span>
                        <StatusBadge tone="success">Exécutée par l’analyste</StatusBadge>
                        <span className="text-micro text-muted-foreground">{query.resultRowCount === null ? 'lignes non déterminées' : `${query.resultRowCount.toLocaleString('fr-FR')} ligne${query.resultRowCount > 1 ? 's' : ''}`}</span>
                        {query.importedAt && <span className="text-micro text-muted-foreground">importée le {dateTime(query.importedAt)}</span>}
                      </div>
                      {query.rationale && <p className="text-meta leading-5 text-muted-foreground">{query.rationale}</p>}
                      <KqlBlock kql={query.kql} index={query.targetIndex} range={query.timeRange} />
                      <p className={cn('text-meta leading-5', query.resultRowCount === 0 ? 'text-warning' : 'text-subtle')}>{query.resultSummary || NOT_PROVIDED}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Informations manquantes (${content.missingInformation.length})`}>
              <ReportList items={content.missingInformation} empty={`Aucune information manquante identifiée. ${NOT_PROVIDED} si l’analyste n’a pas documenté ce point.`} tone="unknown" />
            </Section>

            <Section title="Recommandations">
              <ReportList items={content.recommendations} empty="Aucune recommandation particulière." tone="brand" />
            </Section>

            <Section title="Notes de l’analyste">
              <ReportList items={content.comments} empty="Aucun commentaire." tone="neutral" />
            </Section>

            <Section title="Limites">
              <ReportList items={content.limitations} empty={NOT_PROVIDED} tone="neutral" />
            </Section>

            <footer className="border-t border-border pt-4 text-micro leading-5 text-muted-foreground">
              Document généré par SOCIA le {dateTime(content.generatedAt)}. Modèle : {content.providerName} · {content.modelId}. Version du prompt : soc-v1. Aucune commande n’a été exécutée par SOCIA. Les champs absents sont signalés « {NOT_PROVIDED} ».
            </footer>
          </div>
        </Card>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section data-print="card" className="min-w-0">
      <h2 className="mb-3 text-meta font-medium tracking-label text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-border/70 px-6 py-3 last:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-tiny tracking-pill text-muted-foreground uppercase">{label}</div>
      <div className={cn('mt-1 text-meta text-subtle', mono && 'break-all font-mono text-micro')}>{value || NOT_PROVIDED}</div>
    </div>
  )
}

function ReportList({ items, empty, tone }: { items: string[]; empty: string; tone: 'fact' | 'deduction' | 'unknown' | 'brand' | 'neutral' }) {
  const dot = tone === 'fact' ? 'bg-fact' : tone === 'deduction' ? 'bg-deduction' : tone === 'unknown' ? 'bg-unknown' : tone === 'brand' ? 'bg-brand' : 'bg-muted-foreground'
  if (items.length === 0) return <p className="text-small text-muted-foreground">{empty}</p>
  return (
    <ul className="grid gap-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 text-small leading-6 text-subtle">
          <span className={cn('mt-2 size-1.5 shrink-0 rounded-full', dot)} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function scopeLabel(key: string): string {
  const labels: Record<string, string> = {
    ruleName: 'Règle',
    ruleId: 'Identifiant de règle',
    severity: 'Sévérité',
    alertTime: 'Horodatage',
    host: 'Hôte',
    user: 'Utilisateur',
    process: 'Processus',
    sourceIp: 'IP source',
    destinationIp: 'IP destination',
    index: 'Index',
    documentId: 'Document',
    categories: 'Catégories',
  }
  return labels[key] ?? key
}

function verdictTone(verdict: string): { text: string; badge: 'danger' | 'warning' | 'info' | 'neutral' | 'success' } {
  if (verdict === 'confirmed_incident') return { text: 'text-destructive', badge: 'danger' }
  if (verdict === 'watch') return { text: 'text-warning', badge: 'warning' }
  if (verdict === 'legitimate') return { text: 'text-info', badge: 'info' }
  return { text: 'text-muted-foreground', badge: 'neutral' }
}

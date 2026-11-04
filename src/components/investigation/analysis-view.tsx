import type { ElementType } from 'react'
import { CheckCircle2, CircleHelp, GitBranch } from 'lucide-react'
import { StatusBadge } from '@/components/premium/status-badge'
import { ConfidenceMeter } from '@/components/patterns/confidence-meter'
import { SectionCard } from '@/components/patterns/section-card'
import { HYPOTHESIS_STATUS_LABELS } from '@/lib/investigation-labels'
import { VERDICT_LABELS } from '@/lib/alert'
import type { InvestigationAnalysis } from '@/lib/ai'
import { cn } from '@/lib/utils'

export function AnalysisView({ analysis }: { analysis: InvestigationAnalysis }) {
  const verdict =
    analysis.provisionalAssessment.verdict === 'undetermined'
      ? 'Non déterminé'
      : VERDICT_LABELS[analysis.provisionalAssessment.verdict]
  const tone =
    analysis.provisionalAssessment.verdict === 'confirmed_incident'
      ? 'danger'
      : analysis.provisionalAssessment.verdict === 'watch'
        ? 'warning'
        : analysis.provisionalAssessment.verdict === 'legitimate'
          ? 'info'
          : 'neutral'

  return (
    <div className="grid gap-5">
      <SectionCard title="Synthèse opérationnelle">
        <p className="text-base leading-7 text-foreground">{analysis.summary}</p>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Appréciation du modèle" description="Sortie IA, non décisionnelle. Le verdict final appartient à l’analyste.">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={tone}>{verdict}</StatusBadge>
            <span className="text-xs text-muted-foreground">Confiance {analysis.provisionalAssessment.confidence}%</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-subtle">{analysis.provisionalAssessment.rationale || 'Aucune justification fournie par le modèle.'}</p>
        </SectionCard>
        <SectionCard className="lg:col-span-1" title="Confiance">
          <ConfidenceMeter value={analysis.provisionalAssessment.confidence} />
        </SectionCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <InsightList title="Faits observés" note="Directement lisibles dans l’alerte ou les résultats importés." icon={CheckCircle2} tone="text-fact" items={analysis.facts} empty="Aucun fait explicitement extrait." />
        <InsightList title="Déductions" note="Inférences logiques, avec leur raisonnement." icon={GitBranch} tone="text-deduction" items={analysis.deductions} empty="Aucune déduction formulée." />
        <InsightList title="Informations manquantes" note="Ce qui empêche de conclure, et pourquoi." icon={CircleHelp} tone="text-unknown" items={analysis.missingInformation} empty="Aucune information manquante identifiée." />
        <SectionCard title="Hypothèses" description="À réviser, jamais à présenter comme des faits." action={<span className="text-xs text-muted-foreground num">{analysis.hypotheses.length}</span>}>
          {analysis.hypotheses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune hypothèse formulée.</p>
          ) : (
            <div className="grid gap-3">
              {analysis.hypotheses.map((hypothesis, index) => (
                <article key={`${hypothesis.statement}-${index}`} className="rounded-lg border border-border bg-surface-1 p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm bg-hypothesis/12 text-tiny font-medium text-hypothesis num">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm leading-6 font-medium text-foreground">{hypothesis.statement}</p>
                      {hypothesis.rationale && <p className="mt-1 text-xs leading-5 text-muted-foreground">{hypothesis.rationale}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={hypothesis.status === 'supported' ? 'success' : hypothesis.status === 'refuted' ? 'danger' : hypothesis.status === 'inconclusive' ? 'neutral' : 'warning'}>
                          {HYPOTHESIS_STATUS_LABELS[hypothesis.status] ?? hypothesis.status}
                        </StatusBadge>
                        <span className="text-xs text-muted-foreground">Confiance {hypothesis.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Prose title="Lecture de la règle" text={analysis.ruleExplanation} />
        <Prose title="Événement déclencheur" text={analysis.triggeringEvent} />
      </div>
      <Prose title="Contexte et limites" text={analysis.contextReconstruction} />
    </div>
  )
}

function InsightList({
  title,
  note,
  icon: Icon,
  tone,
  items,
  empty,
}: {
  title: string
  note: string
  icon: ElementType
  tone: string
  items: string[]
  empty: string
}) {
  return (
    <SectionCard title={title} description={note} action={<span className="text-xs text-muted-foreground num">{items.length}</span>}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-3 border-b border-border py-3 last:border-0 last:pb-0 first:pt-0">
              <Icon aria-hidden className={cn('mt-0.5 size-3.5 shrink-0', tone)} />
              <span className="text-sm leading-6 text-subtle">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function Prose({ title, text }: { title: string; text: string }) {
  return (
    <SectionCard title={title}>
      <p className="max-w-reading whitespace-pre-wrap text-sm leading-6 text-subtle">{text || 'Non renseigné.'}</p>
    </SectionCard>
  )
}

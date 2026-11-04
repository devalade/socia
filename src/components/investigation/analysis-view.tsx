import { StatusBadge } from '@/components/premium/status-badge'
import { ConfidenceMeter } from '@/components/patterns/confidence-meter'
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
    <div className="grid gap-10">
      <section className="border-t-2 border-foreground pt-4">
        <Label number="01" text="Synthèse opérationnelle" />
        <p className="mt-4 max-w-reading font-display text-2xl leading-heading tracking-app text-foreground">{analysis.summary}</p>
      </section>

      <section className="grid gap-6 border-t border-border pt-4 layout-analysis sm:items-start">
        <div>
          <Label number="02" text="Appréciation du modèle" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge tone={tone}>{verdict}</StatusBadge>
            <span className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">Confiance {analysis.provisionalAssessment.confidence}%</span>
          </div>
          <p className="mt-3 max-w-reading text-meta leading-6 text-muted-foreground">{analysis.provisionalAssessment.rationale || 'Aucune justification fournie par le modèle.'}</p>
          <p className="mt-3 font-mono text-tiny leading-4 tracking-caps text-muted-foreground uppercase">Sortie IA, non décisionnelle. Le verdict final appartient à l’analyste.</p>
        </div>
        <div className="border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div className="mb-2 font-mono text-tiny tracking-caps text-muted-foreground uppercase">Confiance</div>
          <ConfidenceMeter value={analysis.provisionalAssessment.confidence} />
        </div>
      </section>

      <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
        <ExhibitList number="03" title="Faits observés" note="Directement lisibles dans l’alerte ou les résultats importés." tone="fact" items={analysis.facts} empty="Aucun fait explicitement extrait." />
        <ExhibitList number="04" title="Déductions" note="Inférences logiques, avec leur raisonnement." tone="deduction" items={analysis.deductions} empty="Aucune déduction formulée." />
        <ExhibitList number="05" title="Informations manquantes" note="Ce qui empêche de conclure, et pourquoi." tone="unknown" items={analysis.missingInformation} empty="Aucune information manquante identifiée." />
        <section className="border-t-2 border-foreground pt-3">
          <Label number="06" text="Hypothèses" />
          <p className="mt-2 font-mono text-tiny leading-4 tracking-caps text-muted-foreground uppercase">À réviser, jamais à présenter comme des faits.</p>
          {analysis.hypotheses.length === 0 ? (
            <p className="mt-4 text-meta text-muted-foreground">Aucune hypothèse formulée.</p>
          ) : (
            <div className="mt-3">
              {analysis.hypotheses.map((hypothesis, index) => (
                <article key={`${hypothesis.statement}-${index}`} className="border-t border-border py-3.5 first:border-t-0 first:pt-0">
                  <div className="flex gap-3">
                    <span className="w-5 shrink-0 font-mono text-tiny text-hypothesis">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <p className="font-display text-xl leading-tight text-foreground">{hypothesis.statement}</p>
                      {hypothesis.rationale && <p className="mt-1.5 text-meta leading-5 text-muted-foreground">{hypothesis.rationale}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={hypothesis.status === 'supported' ? 'success' : hypothesis.status === 'refuted' ? 'danger' : hypothesis.status === 'inconclusive' ? 'neutral' : 'warning'}>
                          {HYPOTHESIS_STATUS_LABELS[hypothesis.status] ?? hypothesis.status}
                        </StatusBadge>
                        <span className="font-mono text-tiny text-muted-foreground">confiance {hypothesis.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-10 border-t border-border pt-8 md:grid-cols-2">
        <Prose number="07" title="Lecture de la règle" text={analysis.ruleExplanation} />
        <Prose number="08" title="Événement déclencheur" text={analysis.triggeringEvent} />
      </div>
      <Prose number="09" title="Contexte et limites" text={analysis.contextReconstruction} />
    </div>
  )
}

function Label({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-tiny tracking-label text-muted-foreground uppercase">
      <span className="text-brand">{number}</span>
      <span className="text-border">/</span>
      {text}
    </div>
  )
}

function ExhibitList({
  number,
  title,
  note,
  tone,
  items,
  empty,
}: {
  number: string
  title: string
  note: string
  tone: 'fact' | 'deduction' | 'unknown'
  items: string[]
  empty: string
}) {
  const color = tone === 'fact' ? 'text-fact' : tone === 'deduction' ? 'text-deduction' : 'text-unknown'
  return (
    <section className="border-t-2 border-foreground pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className={cn('flex items-center gap-2 font-mono text-tiny tracking-label uppercase', color)}>
          <span>{number}</span>
          <span className="text-border">/</span>
          {title}
        </div>
        <span className="font-mono text-tiny text-muted-foreground">{items.length}</span>
      </div>
      <p className="mt-2 font-mono text-tiny leading-4 tracking-caps text-muted-foreground uppercase">{note}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-meta text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 border-t border-border">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-3 border-b border-border/70 py-3">
              <span className="w-5 shrink-0 font-mono text-tiny text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
              <span className="text-meta leading-6 text-subtle">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Prose({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <section className="border-t border-border pt-3">
      <Label number={number} text={title} />
      <p className="mt-3 max-w-reading whitespace-pre-wrap text-meta leading-6 text-subtle">{text || 'Non renseigné.'}</p>
    </section>
  )
}

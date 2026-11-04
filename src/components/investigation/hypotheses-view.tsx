import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/premium/status-badge'
import { ConfidenceMeter } from '@/components/patterns/confidence-meter'
import { EmptyState } from '@/components/patterns/empty-state'
import { HYPOTHESIS_STATUS_LABELS } from '@/lib/investigation-labels'
import { updateHypothesisStatusFn } from '@/server/fns/investigations'

type Hypothesis = {
  id: string
  statement: string
  status: string
  confidence: number | null
  rationale: string
  evidence: string
  analysisRunId: string | null
}

export function HypothesesView({
  hypotheses,
  investigationId,
  canEdit,
}: {
  hypotheses: Hypothesis[]
  investigationId: string
  canEdit: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function change(id: string, status: 'open' | 'supported' | 'refuted' | 'inconclusive') {
    setBusy(id)
    try {
      await updateHypothesisStatusFn({ data: { investigationId, hypothesisId: id, status } })
      toast.success('Hypothèse mise à jour')
      await router.invalidate()
    } catch (error) {
      toast.error('Mise à jour impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  if (hypotheses.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb aria-hidden />}
        title="Aucune hypothèse active"
        description="L’analyse initiale produit les premières hypothèses. Elles restent distinctes des faits et peuvent être révisées à chaque cycle."
      />
    )
  }

  return (
    <div className="border-t-2 border-foreground pt-4">
      {hypotheses.map((hypothesis, index) => {
        const tone = hypothesis.status === 'supported' ? 'success' : hypothesis.status === 'refuted' ? 'danger' : hypothesis.status === 'inconclusive' ? 'neutral' : 'warning'
        return (
          <article key={hypothesis.id} className="grid gap-6 border-b border-border py-6 md:grid-cols-4">
            <div className="flex gap-3 md:col-span-3">
              <span className="w-6 shrink-0 font-mono text-tiny text-hypothesis">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <h3 className="font-display text-2xl leading-tight tracking-app">{hypothesis.statement}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={tone}>{HYPOTHESIS_STATUS_LABELS[hypothesis.status] ?? hypothesis.status}</StatusBadge>
                  {hypothesis.analysisRunId && <span className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">Issue d’une analyse IA</span>}
                </div>
                <div className="mt-4 grid gap-3 border-t border-border pt-3">
                  <div>
                    <div className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">Raisonnement</div>
                    <p className="mt-1 max-w-reading text-meta leading-6 text-subtle">{hypothesis.rationale || 'Non renseigné.'}</p>
                  </div>
                  <div>
                    <div className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">Preuves ou absence de preuves</div>
                    <p className="mt-1 max-w-reading text-meta leading-6 text-subtle">{hypothesis.evidence || 'Non renseigné.'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 md:col-span-1 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <div className="mb-2 font-mono text-tiny tracking-caps text-muted-foreground uppercase">Confiance du modèle</div>
              <ConfidenceMeter value={hypothesis.confidence} />
              {canEdit && (
                <Select
                  value={hypothesis.status}
                  onValueChange={(value) => void change(hypothesis.id, value as 'open' | 'supported' | 'refuted' | 'inconclusive')}
                  disabled={busy === hypothesis.id}
                >
                  <SelectTrigger className="mt-4 h-9 w-full bg-transparent text-xs" aria-label="Statut de l’hypothèse">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouverte</SelectItem>
                    <SelectItem value="supported">Soutenue</SelectItem>
                    <SelectItem value="refuted">Réfutée</SelectItem>
                    <SelectItem value="inconclusive">Non concluante</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="mt-3 font-mono text-tiny leading-4 tracking-caps text-muted-foreground uppercase">La confiance est une appréciation à réviser, pas une preuve.</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

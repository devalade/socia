import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
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
    <div className="grid gap-4">
      {hypotheses.map((hypothesis, index) => {
        const tone = hypothesis.status === 'supported' ? 'success' : hypothesis.status === 'refuted' ? 'danger' : hypothesis.status === 'inconclusive' ? 'neutral' : 'warning'
        return (
          <Card key={hypothesis.id} className="gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-hypothesis/12 text-xs font-medium text-hypothesis num">{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-base leading-6 font-semibold text-foreground">{hypothesis.statement}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={tone}>{HYPOTHESIS_STATUS_LABELS[hypothesis.status] ?? hypothesis.status}</StatusBadge>
                    {hypothesis.analysisRunId && <span className="text-xs text-muted-foreground">Issue d’une analyse IA</span>}
                  </div>
                </div>
              </div>
              {canEdit && (
                <Select
                  value={hypothesis.status}
                  onValueChange={(value) => void change(hypothesis.id, value as 'open' | 'supported' | 'refuted' | 'inconclusive')}
                  disabled={busy === hypothesis.id}
                >
                  <SelectTrigger className="h-9 w-36 shrink-0" aria-label="Statut de l’hypothèse">
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
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Raisonnement</div>
                <p className="mt-1 text-sm leading-6 text-subtle">{hypothesis.rationale || 'Non renseigné.'}</p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Preuves ou absence de preuves</div>
                <p className="mt-1 text-sm leading-6 text-subtle">{hypothesis.evidence || 'Non renseigné.'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-1 p-3">
                <div className="text-xs text-muted-foreground">Confiance du modèle</div>
                <div className="mt-2"><ConfidenceMeter value={hypothesis.confidence} /></div>
                <p className="mt-2 text-tiny leading-4 text-muted-foreground">Une appréciation à réviser, pas une preuve.</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

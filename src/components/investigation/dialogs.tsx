import { useEffect, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { FileText, Plus, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { VERDICTS, VERDICT_LABELS, SEVERITIES, SEVERITY_LABELS, type Severity, type Verdict } from '@/lib/alert'
import { createManualQueryFn, setConclusionFn, updateInvestigationFn } from '@/server/fns/investigations'
import { generateReportFn } from '@/server/fns/reports'
import { cn } from '@/lib/utils'

export function ConclusionDialog({
  open,
  onOpenChange,
  investigation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  investigation: {
    id: string
    verdict: string | null
    confidence: number | null
    conclusionJustification: string
  }
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const [verdict, setVerdict] = useState<Verdict | null>((investigation.verdict as Verdict | null) ?? null)
  const [confidence, setConfidence] = useState(investigation.confidence ?? 60)
  const [justification, setJustification] = useState(investigation.conclusionJustification)
  const [busy, setBusy] = useState<'save' | 'report' | null>(null)

  useEffect(() => {
    if (open) {
      setVerdict((investigation.verdict as Verdict | null) ?? null)
      setConfidence(investigation.confidence ?? 60)
      setJustification(investigation.conclusionJustification)
    }
  }, [open, investigation])

  async function save(generate: boolean) {
    if (!verdict) {
      toast.error('Choisissez un verdict.')
      return
    }
    if (justification.trim().length < 20) {
      toast.error('Justifiez votre verdict', { description: 'La justification doit contenir au moins 20 caractères.' })
      return
    }
    setBusy(generate ? 'report' : 'save')
    try {
      await setConclusionFn({
        data: {
          investigationId: investigation.id,
          verdict,
          confidence: Math.round(confidence),
          justification: justification.trim(),
        },
      })
      if (generate) {
        const report = await generateReportFn({ data: { investigationId: investigation.id } })
        toast.success('Rapport généré', { description: `Version ${report.version}.` })
        await navigate({
          to: '/app/investigations/$investigationId/report',
          params: { investigationId: investigation.id },
          search: { version: report.version },
        })
      } else {
        toast.success('Investigation clôturée')
        onOpenChange(false)
        await router.invalidate()
      }
    } catch (error) {
      toast.error('Clôture impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clôturer l’investigation</DialogTitle>
          <DialogDescription>
            Le verdict est votre décision d’analyste. Il doit être justifié par les faits et les preuves importées, pas par la sortie du modèle.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label>Verdict</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {VERDICTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVerdict(option)}
                  className={cn(
                    'rounded-lg border px-3 py-3 text-left transition-colors',
                    verdict === option ? 'border-brand bg-brand/8 text-foreground' : 'border-border bg-surface-1/50 text-muted-foreground hover:border-border hover:bg-accent/40',
                  )}
                >
                  <span className="flex items-center gap-2 text-copy font-medium">
                    <span className={cn('size-2 rounded-full', verdict === option ? 'bg-brand' : 'bg-muted-foreground/40')} />
                    {VERDICT_LABELS[option]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="confidence">Confiance de l’analyste</Label>
              <span className="text-xs font-medium text-subtle num">{confidence}%</span>
            </div>
            <Slider
              id="confidence"
              min={0}
              max={100}
              step={5}
              value={[confidence]}
              onValueChange={([value]) => setConfidence(value)}
              aria-label="Confiance de l’analyste"
            />
            <p className="text-meta text-muted-foreground">0% = intuition, 100% = preuve directe et complète. La confiance reste une estimation.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="justification">Justification du verdict</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Expliquez quels faits et résultats soutiennent ce verdict. Citez les preuves importées. Précisez les limites restantes."
              className="min-h-32 text-sm leading-6"
            />
            <div className="flex items-center justify-between text-meta text-muted-foreground">
              <span>Minimum 20 caractères.</span>
              <span className="num">{justification.length} / 5 000</span>
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-md border border-border bg-surface-1 px-3 py-2 text-meta leading-5 text-muted-foreground">
            <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" />
            Le rapport reprendra l’alerte, les faits, les hypothèses, les preuves importées et votre justification. Les champs absents seront marqués « Non renseigné ».
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy !== null}>Annuler</Button>
          <Button variant="secondary" onClick={() => void save(false)} loading={busy === 'save'} disabled={busy !== null}>Enregistrer la conclusion</Button>
          <Button onClick={() => void save(true)} loading={busy === 'report'} disabled={busy !== null}>
            <FileText aria-hidden />
            Clôturer et générer le rapport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditInvestigationDialog({
  open,
  onOpenChange,
  investigation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  investigation: {
    id: string
    title: string
    severity: string
    ruleDefinition: string
    observations: string
  }
}) {
  const router = useRouter()
  const [title, setTitle] = useState(investigation.title)
  const [severity, setSeverity] = useState<Severity>(investigation.severity as Severity)
  const [ruleDefinition, setRuleDefinition] = useState(investigation.ruleDefinition)
  const [observations, setObservations] = useState(investigation.observations)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(investigation.title)
      setSeverity(investigation.severity as Severity)
      setRuleDefinition(investigation.ruleDefinition)
      setObservations(investigation.observations)
    }
  }, [open, investigation])

  async function save() {
    setBusy(true)
    try {
      await updateInvestigationFn({
        data: {
          id: investigation.id,
          title: title.trim(),
          severity,
          ruleDefinition,
          observations,
        },
      })
      toast.success('Investigation mise à jour')
      onOpenChange(false)
      await router.invalidate()
    } catch (error) {
      toast.error('Mise à jour impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier l’investigation</DialogTitle>
          <DialogDescription>Le titre et le contexte guident l’analyse. L’alerte originale n’est jamais modifiée.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Titre</Label>
            <Input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} />
          </div>
          <div className="grid gap-2">
            <Label>Sévérité</Label>
            <Select value={severity} onValueChange={(value) => setSeverity(value as Severity)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((option) => <SelectItem key={option} value={option}>{SEVERITY_LABELS[option]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-rule">Définition de la règle</Label>
            <Textarea id="edit-rule" value={ruleDefinition} onChange={(event) => setRuleDefinition(event.target.value)} className="min-h-28 font-mono text-small leading-6" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-observations">Observations</Label>
            <Textarea id="edit-observations" value={observations} onChange={(event) => setObservations(event.target.value)} className="min-h-24 text-body leading-6" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={() => void save()} loading={busy} disabled={title.trim().length < 2}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ManualQueryDialog({
  open,
  onOpenChange,
  investigationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  investigationId: string
}) {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [rationale, setRationale] = useState('')
  const [kql, setKql] = useState('')
  const [targetIndex, setTargetIndex] = useState('logs-*')
  const [timeRange, setTimeRange] = useState('Dernières 24 heures')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await createManualQueryFn({
        data: {
          investigationId,
          question: question.trim(),
          rationale: rationale.trim(),
          kql: kql.trim(),
          targetIndex: targetIndex.trim(),
          timeRange: timeRange.trim(),
        },
      })
      toast.success('Requête ajoutée à l’investigation')
      setQuestion('')
      setRationale('')
      setKql('')
      onOpenChange(false)
      await router.invalidate()
    } catch (error) {
      toast.error('Ajout impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajouter une requête KQL</DialogTitle>
          <DialogDescription>Pour une question que l’IA n’a pas proposée. La requête reste à exécuter vous-même dans votre SIEM.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mq-question">Question d’investigation</Label>
            <Input id="mq-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Quel processus a créé ce fichier ?" maxLength={1000} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mq-rationale">Pourquoi cette requête</Label>
            <Textarea id="mq-rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} className="min-h-20 text-body leading-6" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mq-kql">Requête KQL</Label>
            <Textarea id="mq-kql" value={kql} onChange={(event) => setKql(event.target.value)} className="min-h-32 font-mono text-small leading-6" placeholder={'event.category:process and host.name:"WIN-FIN-042"'} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="mq-index">Index cible</Label>
              <Input id="mq-index" value={targetIndex} onChange={(event) => setTargetIndex(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mq-range">Plage temporelle</Label>
              <Input id="mq-range" value={timeRange} onChange={(event) => setTimeRange(event.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={() => void save()} loading={busy} disabled={question.trim().length < 3 || kql.trim().length < 3}>
            <Plus aria-hidden />
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

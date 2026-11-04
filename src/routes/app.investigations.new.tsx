import { useMemo, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileJson,
  FileUp,
  Info,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/patterns/page-header'
import { SectionCard } from '@/components/patterns/section-card'
import { SeverityBadge } from '@/components/patterns/badges'
import { StatusBadge } from '@/components/premium/status-badge'
import { PageSkeleton } from '@/components/patterns/route-states'
import { SAMPLE_ALERT } from '@/lib/sample-alert'
import { parseAlertJson, SEVERITY_LABELS } from '@/lib/alert'
import { scanForPromptInjection } from '@/lib/prompt'
import { dateTime } from '@/lib/dates'
import { getModelOptionsFn } from '@/server/fns/providers'
import { createInvestigationFn } from '@/server/fns/investigations'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/app/investigations/new')({
  loader: () => getModelOptionsFn(),
  pendingComponent: () => <PageSkeleton />,
  component: NewInvestigationPage,
})

function NewInvestigationPage() {
  const options = Route.useLoaderData()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [alertJson, setAlertJson] = useState('')
  const [title, setTitle] = useState('')
  const [ruleDefinition, setRuleDefinition] = useState('')
  const [observations, setObservations] = useState('')
  const [priorSearches, setPriorSearches] = useState('')
  const [busy, setBusy] = useState<'draft' | 'analyze' | null>(null)
  const [dragging, setDragging] = useState(false)

  const model = options.model
  const parsed = useMemo(() => (alertJson.trim() ? parseAlertJson(alertJson) : null), [alertJson])
  const flags = useMemo(() => (alertJson.trim() ? scanForPromptInjection(alertJson) : []), [alertJson])

  async function readFile(file: File | undefined) {
    if (!file) return
    if (file.size > 1_500_000) {
      toast.error('Fichier trop volumineux', { description: 'La limite est de 1,5 Mo pour une alerte.' })
      return
    }
    if (!/\.json$|\.txt$/i.test(file.name)) {
      toast.error('Format non accepté', { description: 'Importez un fichier .json ou .txt.' })
      return
    }
    const text = await file.text()
    setAlertJson(text)
    toast.success('Alerte chargée', { description: `${file.name} · ${(file.size / 1024).toFixed(0)} Ko` })
  }

  async function submit(mode: 'draft' | 'analyze') {
    if (!parsed || !parsed.ok) {
      toast.error('Le JSON de l’alerte est invalide', { description: parsed && !parsed.ok ? parsed.error : 'Collez une alerte Elastic.' })
      return
    }
    setBusy(mode)
    try {
      const created = await createInvestigationFn({
        data: {
          alertJson,
          title: title.trim() || undefined,
          ruleDefinition: ruleDefinition.trim() || undefined,
          observations: observations.trim() || undefined,
          priorSearches: priorSearches.trim() || undefined,
        },
      })
      toast.success('Investigation créée', { description: 'L’alerte originale est conservée intégralement.' })
      if (mode === 'analyze') sessionStorage.setItem('socia:auto-run', created.id)
      await navigate({
        to: '/app/investigations/$investigationId',
        params: { investigationId: created.id },
        replace: true,
      })
    } catch (error) {
      toast.error('Création impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
      setBusy(null)
    }
  }


  return (
    <div className="grid gap-6">
      <PageHeader
        title="Nouvelle investigation"
        description="Importez une alerte Elastic Security ou Security Onion. Le document original reste intact, les champs absents sont signalés et l’analyse reste sous votre contrôle."
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/investigations">
                <ArrowLeft aria-hidden />
                Dossiers
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void submit('draft')} loading={busy === 'draft'} disabled={busy !== null}>
              Enregistrer le brouillon
            </Button>
          </>
        }
      />

      <div className="grid gap-5 layout-new">
        <div className="grid content-start gap-5">
          <SectionCard
            title="Alerte Elastic"
            description="Obligatoire. Objet JSON issu d’Elastic Security ou Security Onion."
            action={
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.txt,application/json,text/plain"
                  className="hidden"
                  aria-label="Importer un fichier JSON d’alerte"
                  onChange={(event) => void readFile(event.target.files?.[0])}
                />
                <Button type="button" variant="outline" size="xs" onClick={() => fileRef.current?.click()}>
                  <FileUp aria-hidden />
                  Importer un fichier
                </Button>
              </div>
            }
          >
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                void readFile(event.dataTransfer.files?.[0])
              }}
              className={cn('rounded-lg transition-shadow', dragging && 'ring-2 ring-brand/40')}
            >
              <Textarea
                value={alertJson}
                onChange={(event) => setAlertJson(event.target.value)}
                placeholder={'{\n  "_index": "logs-windows.default-*",\n  "_source": {\n    "@timestamp": "2026-11-04T08:12:44.102Z",\n    "rule": { "name": "…" }\n  }\n}'}
                spellCheck={false}
                className="min-h-64 resize-y rounded-lg border border-dashed border-border bg-surface-1/60 p-3 font-mono text-copy leading-6 shadow-none focus-visible:ring-2"
                aria-label="JSON de l’alerte Elastic"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="xs" onClick={() => setAlertJson(SAMPLE_ALERT)}>
                <FileJson aria-hidden />
                Charger un exemple
              </Button>
              {alertJson && (
                <Button type="button" variant="ghost" size="xs" onClick={() => setAlertJson('')}>
                  <X aria-hidden />
                  Vider
                </Button>
              )}
              <span className="ms-auto text-meta text-muted-foreground">
                {new TextEncoder().encode(alertJson).length.toLocaleString('fr-FR')} / 1 500 000 octets
              </span>
            </div>
            {parsed && !parsed.ok && (
              <p role="alert" className="mt-3 rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-xs leading-5 text-destructive">
                {parsed.error}
              </p>
            )}
            {flags.length > 0 && (
              <p role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-warning/25 bg-warning/8 px-3 py-2 text-xs leading-5 text-warning">
                <ShieldAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Le contenu contient des formulations qui ressemblent à des instructions. SOCIA le traitera uniquement comme une donnée non fiable et n’obéira à aucune instruction.
              </p>
            )}
          </SectionCard>

          {parsed?.ok && (
            <SectionCard title="Aperçu de l’alerte" description="Champs reconnus dans le document. Les absences sont explicites.">
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={parsed.summary.severity} />
                  <span className="text-xs text-muted-foreground">{SEVERITY_LABELS[parsed.summary.severity]}</span>
                  {parsed.summary.timestamp && <span className="text-xs text-muted-foreground">· {dateTime(parsed.summary.timestamp)}</span>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {parsed.summary.keyFields.length === 0 && <p className="text-xs text-muted-foreground">Aucun champ clé n’a été reconnu. L’analyse s’appuiera sur le document brut.</p>}
                  {parsed.summary.keyFields.map((field) => (
                    <div key={field.label} className="min-w-0 rounded-md border border-border/70 bg-surface-1/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground">{field.label}</div>
                      <div className="mt-1 truncate font-mono text-xs text-subtle" title={field.value}>{field.value}</div>
                    </div>
                  ))}
                </div>
                {parsed.summary.missing.length > 0 && (
                  <p className="flex items-start gap-2 rounded-md border border-border bg-surface-1 px-3 py-2 text-meta leading-5 text-muted-foreground">
                    <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    Champs absents : {parsed.summary.missing.join(', ')}. Ils seront signalés comme informations manquantes, jamais inventés.
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Contexte complémentaire" description="Facultatif. Ces éléments restent des données non fiables, séparées de la consigne système.">
            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="title">Titre de l’investigation</Label>
                <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={parsed?.ok ? (parsed.summary.ruleName ?? 'Titre déduit de l’alerte') : 'Titre déduit de l’alerte si vide'} maxLength={160} className="h-10" />
                <p className="text-meta text-muted-foreground">Laissez vide pour reprendre le nom de la règle.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule">Définition de la règle Elastic</Label>
                <Textarea id="rule" value={ruleDefinition} onChange={(event) => setRuleDefinition(event.target.value)} placeholder="Collez la requête, la logique ou la description de la règle. Sans elle, SOCIA ne prétendra pas connaître son fonctionnement interne." className="min-h-28 font-mono text-small leading-6" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="observations">Observations de l’analyste</Label>
                <Textarea id="observations" value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Contexte métier, changements récents, entité connue, hypothèse de départ…" className="min-h-24 text-body leading-6" />
                <p className="text-meta text-muted-foreground">{observations.length.toLocaleString('fr-FR')} / 20 000 caractères</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prior">Recherches déjà effectuées</Label>
                <Textarea id="prior" value={priorSearches} onChange={(event) => setPriorSearches(event.target.value)} placeholder="Collez vos résultats JSON ou vos notes de recherche. Un résultat vide ne sera pas interprété comme une absence d’activité." className="min-h-24 font-mono text-small leading-6" />
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="grid content-start gap-5">
          <SectionCard title="Modèle d’analyse" description="Le modèle reçoit uniquement ce que vous fournissez.">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <Sparkles aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{model.label}</div>
                <div className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{model.modelId}</div>
              </div>
              <StatusBadge tone="success">Actif</StatusBadge>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Un seul modèle est utilisé pour toutes les analyses, afin de garder des résultats comparables.</p>
          </SectionCard>

          <SectionCard title="Ce que SOCIA fera" description="Un raisonnement structuré, pas une boîte noire.">
            <ul className="grid gap-3 text-small leading-5 text-muted-foreground">
              {[
                'Expliquer la règle et l’événement déclencheur à partir des champs fournis.',
                'Séparer les faits observés, les déductions, les hypothèses et les informations manquantes.',
                'Proposer des requêtes KQL justifiées, que vous exécuterez vous-même.',
                'Réinterpréter chaque résultat importé et mettre à jour les hypothèses.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Ce que SOCIA ne fera jamais" description="Les garde-fous sont dans le prompt et dans l’architecture.">
            <ul className="grid gap-3 text-small leading-5 text-muted-foreground">
              {[
                'Se connecter à Kibana ou Elasticsearch.',
                'Exécuter une requête KQL ou une commande système.',
                'Affirmer qu’une recherche a été lancée sans résultat importé.',
                'Présenter un résultat vide comme une preuve d’absence d’activité.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <LockKeyhole aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-xs leading-5 text-warning">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <TriangleAlert aria-hidden className="size-3.5" />
              Données non fiables
            </div>
            Le JSON de l’alerte peut contenir des instructions malveillantes. SOCIA les traite comme des preuves, jamais comme des ordres. Aucun contenu importé n’est exécuté.
          </div>
        </aside>
      </div>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-card backdrop-blur sm:flex-row sm:items-center lg:static">
        <div className="min-w-0 flex-1 text-xs text-muted-foreground">
          {parsed?.ok ? (
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-3.5 text-success" />
              Alerte valide · {parsed.summary.ruleName ?? 'règle sans nom'} · {SEVERITY_LABELS[parsed.summary.severity]}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Info aria-hidden className="size-3.5" />
              Importez une alerte JSON valide pour activer l’analyse.
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 max-sm:[&_[data-slot=button]]:h-11 max-sm:[&_[data-slot=button]]:flex-1">
          <Button variant="ghost" size="lg" onClick={() => void submit('draft')} loading={busy === 'draft'} disabled={busy !== null || !parsed?.ok}>
            Brouillon
          </Button>
          <Button size="lg" onClick={() => void submit('analyze')} loading={busy === 'analyze'} disabled={busy !== null || !parsed?.ok}>
            Créer et analyser
            {busy === null && <ArrowRight aria-hidden />}
          </Button>
        </div>
      </div>
    </div>
  )
}

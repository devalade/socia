import { useMemo, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { CheckCircle2, ChevronDown, FileUp, SkipForward, TriangleAlert, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/premium/status-badge'
import { KqlBlock } from '@/components/patterns/kql-block'
import { JsonViewer } from '@/components/patterns/json-viewer'
import { PriorityBadge } from '@/components/patterns/badges'
import { describeResult } from '@/lib/result'
import { QUERY_STATUS_LABELS } from '@/lib/investigation-labels'
import { dateTime } from '@/lib/dates'
import { importQueryResultFn, setQueryStatusFn } from '@/server/fns/investigations'
import type { QueryView } from '@/server/services/investigations'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<string, 'info' | 'success' | 'neutral' | 'warning'> = {
  proposed: 'info',
  executed: 'success',
  skipped: 'neutral',
  inconclusive: 'warning',
}

export function QueryCard({
  query,
  investigationId,
  canEdit,
}: {
  query: QueryView
  investigationId: string
  canEdit: boolean
}) {
  const router = useRouter()
  const [importOpen, setImportOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function mark(status: 'skipped' | 'inconclusive') {
    setBusy(status)
    try {
      await setQueryStatusFn({ data: { investigationId, queryId: query.id, status } })
      toast.success(status === 'skipped' ? 'Requête marquée comme ignorée' : 'Requête marquée comme non concluante')
      await router.invalidate()
    } catch (error) {
      toast.error('Mise à jour impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  const executed = query.status === 'executed'
  return (
    <>
      <Card className="gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_TONE[query.status] ?? 'neutral'}>{QUERY_STATUS_LABELS[query.status as keyof typeof QUERY_STATUS_LABELS] ?? query.status}</StatusBadge>
              <PriorityBadge priority={query.priority} />
              {executed && <span className="text-xs text-muted-foreground">Résultat importé par l’analyste</span>}
            </div>
            <h3 className="mt-2 text-base leading-6 font-semibold text-foreground">{query.question}</h3>
            {query.rationale && <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{query.rationale}</p>}
          </div>
          {canEdit && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full">
              <Button size="sm" variant={executed ? 'outline' : 'default'} onClick={() => setImportOpen(true)}>
                <Upload aria-hidden />
                {executed ? 'Remplacer le résultat' : 'Importer le résultat'}
              </Button>
              {!executed && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => void mark('skipped')} loading={busy === 'skipped'} disabled={busy !== null}>
                    <SkipForward aria-hidden />
                    Ignorer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void mark('inconclusive')} loading={busy === 'inconclusive'} disabled={busy !== null}>
                    Non concluante
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <KqlBlock kql={query.kql} index={query.targetIndex} range={query.timeRange} />

        {executed && (
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium text-success">
                <CheckCircle2 aria-hidden className="size-3.5" />
                Résultat importé
              </span>
              <span>{query.resultRowCount === null ? 'Nombre de lignes non déterminé' : `${query.resultRowCount.toLocaleString('fr-FR')} ligne${query.resultRowCount > 1 ? 's' : ''}`}</span>
              {query.importedAt && <span>le {dateTime(query.importedAt)}</span>}
            </div>
            <p className={cn('mt-2 max-w-copy-wide text-sm leading-6', query.resultRowCount === 0 ? 'text-warning' : 'text-subtle')}>
              {query.resultSummary || 'Aucun résumé disponible.'}
            </p>
            {query.resultRowCount === 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-warning/25 bg-warning/8 p-3 text-xs leading-5 text-warning">
                <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Un résultat vide ne prouve pas l’absence d’activité. Vérifiez la collecte, l’index, la rétention, la plage temporelle et vos privilèges avant de conclure.
              </p>
            )}
            {query.resultRaw && (
              <details className="group mt-3">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <ChevronDown aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
                  Voir le JSON importé
                </summary>
                <div className="mt-3">
                  <JsonViewer value={query.resultRaw} label="Résultat importé" maxChars={80_000} maxHeight="20rem" />
                </div>
              </details>
            )}
          </div>
        )}
      </Card>

      <ImportResultDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        investigationId={investigationId}
        query={query}
      />
    </>
  )
}

function ImportResultDialog({
  open,
  onOpenChange,
  investigationId,
  query,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  investigationId: string
  query: QueryView
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState('')
  const [fileLabel, setFileLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const bytes = new TextEncoder().encode(raw).length
  const preview = useMemo(() => {
    if (!raw.trim()) return null
    try {
      return describeResult(JSON.parse(raw))
    } catch {
      return { error: 'JSON invalide.' }
    }
  }, [raw])

  async function submit() {
    if (!raw.trim()) {
      toast.error('Collez le JSON renvoyé par votre SIEM.')
      return
    }
    if (preview && 'error' in preview) {
      toast.error('Le JSON est invalide', { description: preview.error })
      return
    }
    setBusy(true)
    try {
      await importQueryResultFn({ data: { investigationId, queryId: query.id, rawJson: raw } })
      toast.success('Résultat importé', { description: 'Vous pouvez maintenant relancer l’analyse.' })
      setRaw('')
      setFileLabel('')
      onOpenChange(false)
      await router.invalidate()
    } catch (error) {
      toast.error('Import impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(false)
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return
    if (file.size > 900_000) {
      toast.error('Fichier trop volumineux', { description: 'La limite est de 900 Ko par résultat.' })
      return
    }
    setRaw(await file.text())
    setFileLabel(`${file.name} · ${(file.size / 1024).toFixed(0)} Ko`)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer le résultat de la requête</DialogTitle>
          <DialogDescription>
            SOCIA n’exécute pas cette requête. Collez le JSON exact renvoyé par votre SIEM après l’avoir exécutée vous-même.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-lg border border-border bg-surface-1 p-3 text-sm leading-6 text-muted-foreground">
            <div className="text-xs font-medium text-foreground">Requête concernée</div>
            <div className="mt-1 line-clamp-2">{query.question}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              className="hidden"
              aria-label="Importer un fichier JSON de résultat"
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <FileUp aria-hidden />
              Importer un fichier JSON
            </Button>
            {fileLabel && <span className="text-xs text-muted-foreground">{fileLabel}</span>}
            <span className="ms-auto text-xs text-muted-foreground">{bytes.toLocaleString('fr-FR')} / 900 000 octets</span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`result-${query.id}`}>Résultat JSON</Label>
            <Textarea
              id={`result-${query.id}`}
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder={'{\n  "hits": {\n    "total": { "value": 12 },\n    "hits": []\n  }\n}'}
              spellCheck={false}
              className="min-h-52 font-mono text-xs leading-6"
            />
          </div>

          {preview && (
            <div className={cn('rounded-lg border p-3 text-xs leading-5', 'error' in preview ? 'border-destructive/25 bg-destructive/8 text-destructive' : 'border-border bg-surface-1 text-muted-foreground')}>
              {'error' in preview ? preview.error : preview.summary}
            </div>
          )}

          <p className="rounded-lg border border-border bg-surface-1 p-3 text-xs leading-5 text-muted-foreground">
            Un résultat vide, partiel ou tronqué ne sera jamais interprété comme une preuve d’absence d’activité.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!raw.trim() || Boolean(preview && 'error' in preview)}>
            Importer le résultat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

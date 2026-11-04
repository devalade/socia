import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Activity, CheckCircle2, CircleAlert, MessageSquare, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/premium/status-badge'
import { JsonViewer } from '@/components/patterns/json-viewer'
import { dateTime } from '@/lib/dates'
import { RelativeTime } from '@/components/patterns/relative-time'
import { initials } from '@/lib/format'
import { addCommentFn } from '@/server/fns/investigations'
import type { CommentView, InvestigationDetail } from '@/server/services/investigations'

export function JournalView({
  detail,
  canComment,
}: {
  detail: InvestigationDetail
  canComment: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!body.trim()) return
    setBusy(true)
    try {
      await addCommentFn({ data: { investigationId: detail.investigation.id, body: body.trim() } })
      setBody('')
      toast.success('Commentaire ajouté')
      await router.invalidate()
    } catch (error) {
      toast.error('Commentaire non ajouté', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5">
      <section className="border-t-2 border-foreground pt-4">
        <div className="flex items-center gap-2 border-b border-border pb-3 font-mono text-tiny tracking-label text-muted-foreground uppercase">
          <MessageSquare aria-hidden className="size-3.5 text-brand" />
          Commentaires de l’analyste
        </div>
        <div className="divide-y divide-border">
          {detail.comments.length === 0 && <p className="p-5 text-body text-muted-foreground">Aucun commentaire. Documentez ici vos vérifications, échanges et décisions intermédiaires.</p>}
          {detail.comments.map((comment) => (
            <Comment key={comment.id} comment={comment} />
          ))}
        </div>
        {canComment && (
          <div className="border-t border-border pt-4">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Ajouter une note d’investigation. Elle sera horodatée et conservée."
              className="min-h-20 bg-transparent text-body leading-6"
              maxLength={5000}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-meta text-muted-foreground">Visible par les analystes et administrateurs.</span>
              <Button size="sm" onClick={() => void submit()} loading={busy} disabled={!body.trim()}>
                <Send aria-hidden />
                Publier
              </Button>
            </div>
          </div>
        )}
        {!canComment && <p className="border-t border-border/70 px-5 py-3 text-meta text-muted-foreground">Votre rôle est en lecture seule.</p>}
      </section>

      <section className="border-t-2 border-foreground pt-4">
        <div className="flex items-center gap-2 border-b border-border pb-3 font-mono text-tiny tracking-label text-muted-foreground uppercase">
          <Activity aria-hidden className="size-3.5 text-brand" />
          Journal des analyses
        </div>
        <div className="divide-y divide-border">
          {detail.runs.length === 0 && <p className="p-5 text-body text-muted-foreground">Aucune analyse lancée.</p>}
          {detail.runs.map((run) => (
            <div key={run.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
              <span className="mt-0.5">
                {run.status === 'completed' ? <CheckCircle2 aria-hidden className="size-4 text-success" /> : run.status === 'failed' ? <XCircle aria-hidden className="size-4 text-destructive" /> : <CircleAlert aria-hidden className="size-4 text-warning" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-copy font-medium">{run.kind === 'initial' ? 'Analyse initiale' : 'Réanalyse'}</span>
                  <StatusBadge tone={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'warning'}>
                    {run.status === 'completed' ? 'Terminée' : run.status === 'failed' ? 'Échouée' : 'En cours'}
                  </StatusBadge>
                  <span className="font-mono text-micro text-muted-foreground">{run.modelId}</span>
                </div>
                <div className="mt-1 text-meta text-muted-foreground">
                  {dateTime(run.createdAt)}
                  {run.completedAt && <> · terminée <RelativeTime value={run.completedAt} /></>}
                </div>
                {run.error && <p className="mt-1 text-meta leading-5 text-destructive">{run.error}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-10 xl:grid-cols-2">
        <div className="border-t-2 border-foreground pt-4">
          <div className="border-b border-border pb-3 font-mono text-tiny tracking-label text-muted-foreground uppercase">Alerte originale</div>
          <div className="pt-4">
            <JsonViewer value={detail.investigation.alertRaw} label="JSON conservé tel quel" maxChars={60_000} maxHeight="24rem" />
          </div>
        </div>
        <div className="border-t-2 border-foreground pt-4">
          <div className="border-b border-border pb-3 font-mono text-tiny tracking-label text-muted-foreground uppercase">Contexte fourni</div>
          <div className="grid gap-4 p-5 text-small leading-6">
            <div>
              <div className="mb-1 text-micro tracking-caps text-muted-foreground uppercase">Définition de la règle</div>
              <pre className="scroll-thin max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-1 p-3 font-mono text-meta text-subtle">{detail.investigation.ruleDefinition || 'Non renseigné.'}</pre>
            </div>
            <div>
              <div className="mb-1 text-micro tracking-caps text-muted-foreground uppercase">Observations</div>
              <p className="whitespace-pre-wrap text-subtle">{detail.investigation.observations || 'Non renseigné.'}</p>
            </div>
            <div>
              <div className="mb-1 text-micro tracking-caps text-muted-foreground uppercase">Recherches antérieures</div>
              <pre className="scroll-thin max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-1 p-3 font-mono text-meta text-subtle">{detail.investigation.priorSearches || 'Non renseigné.'}</pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Comment({ comment }: { comment: CommentView }) {
  return (
    <div className="flex items-start gap-3 py-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-sm border border-border bg-transparent font-mono text-tiny font-semibold text-brand">
        {initials(comment.authorName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-meta">
          <span className="font-medium text-foreground">{comment.authorName}</span>
          <span className="text-muted-foreground"><RelativeTime value={comment.createdAt} /></span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-meta leading-6 text-subtle">{comment.body}</p>
      </div>
    </div>
  )
}

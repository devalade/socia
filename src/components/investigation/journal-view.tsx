import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Activity, CheckCircle2, CircleAlert, MessageSquare, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/premium/status-badge'
import { PersonAvatar } from '@/components/premium/person'
import { SectionCard } from '@/components/patterns/section-card'
import { JsonViewer } from '@/components/patterns/json-viewer'
import { dateTime } from '@/lib/dates'
import { RelativeTime } from '@/components/patterns/relative-time'
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
      <SectionCard
        title="Commentaires de l’analyste"
        description="Vos vérifications, échanges et décisions intermédiaires."
        action={<MessageSquare aria-hidden className="size-4 text-muted-foreground" />}
        flush
      >
        <div className="divide-y divide-border">
          {detail.comments.length === 0 && <p className="p-5 text-sm text-muted-foreground">Aucun commentaire. Documentez ici vos vérifications, échanges et décisions intermédiaires.</p>}
          {detail.comments.map((comment) => (
            <Comment key={comment.id} comment={comment} />
          ))}
        </div>
        {canComment && (
          <div className="border-t border-border p-5">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Ajouter une note d’investigation. Elle sera horodatée et conservée."
              className="min-h-20 bg-transparent text-sm leading-6"
              maxLength={5000}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Visible par les analystes et administrateurs.</span>
              <Button size="sm" onClick={() => void submit()} loading={busy} disabled={!body.trim()}>
                <Send aria-hidden />
                Publier
              </Button>
            </div>
          </div>
        )}
        {!canComment && <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Votre rôle est en lecture seule.</p>}
      </SectionCard>

      <SectionCard
        title="Journal des analyses"
        description="Chaque exécution du modèle, avec son statut et sa durée."
        action={<Activity aria-hidden className="size-4 text-muted-foreground" />}
        flush
      >
        <div className="divide-y divide-border">
          {detail.runs.length === 0 && <p className="p-5 text-sm text-muted-foreground">Aucune analyse lancée.</p>}
          {detail.runs.map((run) => (
            <div key={run.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
              <span className="mt-0.5">
                {run.status === 'completed' ? <CheckCircle2 aria-hidden className="size-4 text-success" /> : run.status === 'failed' ? <XCircle aria-hidden className="size-4 text-destructive" /> : <CircleAlert aria-hidden className="size-4 text-warning" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{run.kind === 'initial' ? 'Analyse initiale' : 'Réanalyse'}</span>
                  <StatusBadge tone={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'warning'}>
                    {run.status === 'completed' ? 'Terminée' : run.status === 'failed' ? 'Échouée' : 'En cours'}
                  </StatusBadge>
                  <span className="font-mono text-xs text-muted-foreground">{run.modelId}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {dateTime(run.createdAt)}
                  {run.completedAt && <> · terminée <RelativeTime value={run.completedAt} /></>}
                </div>
                {run.error && <p className="mt-1 text-xs leading-5 text-destructive">{run.error}</p>}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Alerte originale" description="JSON conservé tel quel.">
          <JsonViewer value={detail.investigation.alertRaw} label="JSON conservé tel quel" maxChars={60_000} maxHeight="24rem" />
        </SectionCard>
        <SectionCard title="Contexte fourni" description="Données non fiables, séparées de la consigne système.">
          <div className="grid gap-4 text-sm leading-6">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Définition de la règle</div>
              <pre className="scroll-thin max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-1 p-3 font-mono text-xs text-subtle">{detail.investigation.ruleDefinition || 'Non renseigné.'}</pre>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Observations</div>
              <p className="whitespace-pre-wrap text-subtle">{detail.investigation.observations || 'Non renseigné.'}</p>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Recherches antérieures</div>
              <pre className="scroll-thin max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-1 p-3 font-mono text-xs text-subtle">{detail.investigation.priorSearches || 'Non renseigné.'}</pre>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function Comment({ comment }: { comment: CommentView }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <PersonAvatar name={comment.authorName} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-foreground">{comment.authorName}</span>
          <span className="text-muted-foreground"><RelativeTime value={comment.createdAt} /></span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-subtle">{comment.body}</p>
      </div>
    </div>
  )
}

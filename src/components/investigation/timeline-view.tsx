import { Clock3 } from 'lucide-react'
import { EmptyState } from '@/components/patterns/empty-state'
import { StatusBadge } from '@/components/premium/status-badge'
import { Card } from '@/components/ui/card'

type Event = { id: string; timestampText: string; event: string; source: string; certainty: string }

const CERTAINTY = {
  fact: { label: 'Fait', tone: 'success' },
  deduction: { label: 'Déduction', tone: 'info' },
  hypothesis: { label: 'Hypothèse', tone: 'warning' },
} as const

export function TimelineView({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Clock3 aria-hidden />}
        title="Aucune chronologie reconstruite"
        description="La chronologie apparaît après une analyse, à partir des horodatages présents dans l’alerte et les résultats importés."
      />
    )
  }

  return (
    <Card className="gap-0 p-5">
      {events.map((event) => {
        const meta = CERTAINTY[event.certainty as keyof typeof CERTAINTY] ?? CERTAINTY.fact
        return (
          <article key={event.id} className="grid gap-2 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-4 sm:gap-5">
            <div className="flex items-start gap-2 pt-0.5 text-xs text-muted-foreground sm:col-span-1">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
              <span className="font-mono">{event.timestampText || 'Horodatage non renseigné'}</span>
            </div>
            <div className="min-w-0 sm:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                {event.source && <span className="text-xs text-muted-foreground">Source : {event.source}</span>}
              </div>
              <p className="mt-2 text-sm leading-6 text-subtle">{event.event}</p>
            </div>
          </article>
        )
      })}
    </Card>
  )
}

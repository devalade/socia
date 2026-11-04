import { Clock3 } from 'lucide-react'
import { EmptyState } from '@/components/patterns/empty-state'
import { cn } from '@/lib/utils'

type Event = { id: string; timestampText: string; event: string; source: string; certainty: string }

const CERTAINTY = {
  fact: { label: 'Fait', dot: 'bg-fact', text: 'text-fact' },
  deduction: { label: 'Déduction', dot: 'bg-deduction', text: 'text-deduction' },
  hypothesis: { label: 'Hypothèse', dot: 'bg-hypothesis', text: 'text-hypothesis' },
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
    <div className="border-t-2 border-foreground pt-2">
      {events.map((event) => {
        const meta = CERTAINTY[event.certainty as keyof typeof CERTAINTY] ?? CERTAINTY.fact
        return (
          <article key={event.id} className="flex flex-col gap-2 border-b border-border py-4 sm:grid sm:grid-cols-4 sm:gap-4">
            <div className="flex items-center gap-2 font-mono text-tiny tracking-caps text-muted-foreground uppercase sm:col-span-1">
              <span className={cn('size-1.5 shrink-0', meta.dot)} />
              {event.timestampText || 'Horodatage non renseigné'}
            </div>
            <div className="min-w-0 sm:col-span-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-tiny tracking-caps uppercase">
                <span className={meta.text}>{meta.label}</span>
                {event.source && <span className="text-muted-foreground">Source : {event.source}</span>}
              </div>
              <p className="mt-1.5 max-w-reading whitespace-pre-wrap text-meta leading-6 text-subtle">{event.event}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

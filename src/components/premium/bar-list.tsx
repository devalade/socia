import { cn } from '@/lib/utils'
import { Truncate } from '@/components/premium/truncate'
import { compact, num } from '@/lib/format'

// A ranked list with the bar behind each row (Plausible, Dub). The name truncates with the whole text on
// hover; the count stays whole and visible. The track is minmax(0, 1fr), so a long URL cannot push the
// counts out of the card.
export function BarList({ rows, nameHeader, valueHeader, className }: { rows: { name: string; value: number }[]; nameHeader: string; valueHeader: string; className?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-0.5', className)}>
      <div className="flex h-6 justify-between px-3 text-xs text-muted-foreground"><span>{nameHeader}</span><span>{valueHeader}</span></div>
      {rows.map((r, i) => (
        <div key={i} className="relative isolate flex h-8 items-center justify-between gap-3 px-3 text-label">
          <span aria-hidden className="absolute inset-y-0.5 left-0 -z-10 rounded-sm bg-brand/12" style={{ width: `${(r.value / max) * 100}%` }} />
          <Truncate bdi>{r.name}</Truncate>
          <span className="shrink-0 num" title={r.value >= 1000 ? num(r.value) : undefined}>{compact(r.value, { under: 1000 })}</span>
        </div>
      ))}
    </div>
  )
}

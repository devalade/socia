import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { delta as fmtDelta } from '@/lib/format'

// A change as a pill: +12.5%, −0.4 pt, New, or — when there is nothing to compare. Green means good,
// not up: pass invert for metrics where a fall is good (refund rate, bounce rate, latency).
export function Delta({ value, unit = '%', invert = false, className }: { value: number | null; unit?: string; invert?: boolean; className?: string }) {
  const d = fmtDelta(value, { unit, invert })
  const up = (value ?? 0) > 0
  return (
    <Badge
      variant="secondary"
      className={cn(
        'h-[22px] gap-1 px-2 num [&>svg]:size-3',
        d.tone === 'up' && 'bg-success/12 text-[color-mix(in_oklab,var(--success)_86%,var(--foreground))]',
        d.tone === 'down' && 'bg-destructive/12 text-[color-mix(in_oklab,var(--destructive)_86%,var(--foreground))]',
        d.tone === 'flat' && 'text-subtle',
        className,
      )}
    >
      {d.tone !== 'flat' && value !== null && (up ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />)}
      {d.text}
    </Badge>
  )
}

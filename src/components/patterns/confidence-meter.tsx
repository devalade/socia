import { cn } from '@/lib/utils'

export function ConfidenceMeter({ value, className }: { value: number | null; className?: string }) {
  const safe = value === null ? null : Math.min(100, Math.max(0, value))
  const tone = safe === null ? 'var(--muted-foreground)' : safe >= 75 ? 'var(--success)' : safe >= 45 ? 'var(--warning)' : 'var(--destructive)'
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-muted" role="img" aria-label={safe === null ? 'Confiance non renseignée' : `Confiance ${safe} pour cent`}>
        <div className="meter-fill h-full rounded-full transition-width" style={{ '--meter-value': `${safe ?? 0}%`, '--meter-tone': tone } as React.CSSProperties} />
      </div>
      <span className="w-9 text-right text-xs font-medium text-subtle num">{safe === null ? 'n/d' : `${safe}%`}</span>
    </div>
  )
}

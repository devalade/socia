import { cn } from '@/lib/utils'

/** SOCIA's mark: an aperture of three arcs around a live signal. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7', className)} fill="none">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--brand)" fillOpacity="0.12" stroke="var(--brand)" strokeOpacity="0.35" />
      <path d="M9 21.5a9.5 9.5 0 0 1 14 0" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12.2 17.6a5.7 5.7 0 0 1 7.6 0" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
      <circle cx="16" cy="13.2" r="2.1" fill="var(--brand)" />
      <path d="M16 22.4v3.2" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark />
      {!compact && (
        <span className="grid leading-none">
          <span className="text-lead font-semibold tracking-wide text-foreground">SOCIA</span>
          <span className="mt-1 text-tiny font-medium tracking-brand text-muted-foreground uppercase">SOC intelligence</span>
        </span>
      )}
    </span>
  )
}

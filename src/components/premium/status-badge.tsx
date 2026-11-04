import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// Status as a 22px pill with a dot: the word carries the meaning, colour only confirms it.
const TONES = {
  neutral: '[--tone:var(--muted-foreground)]',
  success: '[--tone:var(--success)]',
  warning: '[--tone:var(--warning)]',
  danger: '[--tone:var(--destructive)]',
  info: '[--tone:var(--info)]',
} as const

export type StatusTone = keyof typeof TONES

export function StatusBadge({ tone = 'neutral', className, children }: { tone?: StatusTone; className?: string; children: React.ReactNode }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        TONES[tone],
        "h-5 gap-1.5 rounded-sm border border-[color-mix(in_oklab,var(--tone)_28%,transparent)] bg-transparent px-1.5 font-mono text-[9px] font-medium tracking-[0.08em] uppercase text-[color-mix(in_oklab,var(--tone)_82%,var(--foreground))] before:size-1 before:bg-(--tone) before:content-['']",
        className,
      )}
    >
      {children}
    </Badge>
  )
}

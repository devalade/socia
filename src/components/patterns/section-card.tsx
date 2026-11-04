import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Truncate } from '@/components/premium/truncate'

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  flush = false,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  flush?: boolean
}) {
  return (
    <Card className={cn('gap-0 overflow-hidden rounded-sm border border-border bg-transparent py-0 shadow-none', className)}>
      {(title || description || action) && (
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title && <Truncate className="font-display text-xl leading-none tracking-app">{title}</Truncate>}
            {description && <p className="mt-1 font-mono text-tiny leading-4 tracking-caps text-muted-foreground uppercase">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(flush ? '' : 'p-5', contentClassName)}>{children}</div>
    </Card>
  )
}

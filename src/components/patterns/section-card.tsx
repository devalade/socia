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
    <Card className={cn('gap-0 overflow-hidden rounded-xl border-border bg-card py-0 shadow-card', className)}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title && <Truncate className="text-base leading-6 font-semibold tracking-app">{title}</Truncate>}
            {description && <p className="mt-0.5 text-small leading-5 text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0 max-sm:w-full">{action}</div>}
        </div>
      )}
      <div className={cn(flush ? '' : 'p-5', contentClassName)}>{children}</div>
    </Card>
  )
}

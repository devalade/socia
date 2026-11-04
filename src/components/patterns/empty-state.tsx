import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <Empty className={cn('gap-4 p-8 md:p-10', className)}>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon" className="size-10 text-muted-foreground [&_svg:not([class*='size-'])]:size-5">{icon}</EmptyMedia>}
        <EmptyTitle className="text-sm font-semibold tracking-normal">{title}</EmptyTitle>
        {description && <EmptyDescription className="max-w-md text-label leading-6 text-muted-foreground">{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

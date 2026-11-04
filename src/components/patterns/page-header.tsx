import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  meta?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-label font-medium text-brand">{eyebrow}</div>}
          <h1 className="text-2xl leading-8 font-semibold tracking-title text-foreground">{title}</h1>
          {description && <p className="mt-1 max-w-reading text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full max-sm:[&_[data-slot=button]]:h-11 max-sm:[&_[data-slot=button]]:ps-4! max-sm:[&_[data-slot=button]]:pe-4! sm:shrink-0">{actions}</div>}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">{meta}</div>}
    </header>
  )
}

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
    <header className={cn('flex flex-col gap-5 border-b border-border pb-8', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-4xl">
          {eyebrow && (
            <div className="mb-3 flex items-center gap-2 font-mono text-micro font-medium tracking-caps text-muted-foreground uppercase">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-4xl leading-poster tracking-poster text-foreground sm:text-5xl">
            {title}
          </h1>
          {description && <p className="mt-3 max-w-reading text-sm leading-7 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:[&_[data-slot=button]]:h-11 max-sm:[&_[data-slot=button]]:px-5">{actions}</div>}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-micro tracking-caps text-muted-foreground uppercase">{meta}</div>}
    </header>
  )
}

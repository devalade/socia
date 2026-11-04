import type * as React from 'react'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

// The state contract for anything that loads on its own (premium-ui/references/data.md):
//   loading  aria-busy, a skeleton the size of the content
//   empty    what will appear here, and how to start
//   error    what failed in plain words, that nothing was lost, and Try again
//   stale    the last values stay, with "Updated 4m ago"
// Each region fails, loads and empties on its own, inside its own box, so nothing below it moves.
// The stress run (premium-ui/scripts/stress.mjs) reads data-region and data-state and fails a region
// that breaks the contract.

export type RegionState = 'ready' | 'loading' | 'empty' | 'error' | 'partial' | 'stale'

type RegionProps = React.ComponentProps<'div'> & { name: string; state: RegionState }

export function Region({ name, state, className, ...props }: RegionProps) {
  return <div data-region={name} data-state={state} aria-busy={state === 'loading' || undefined} className={cn('min-w-0', className)} {...props} />
}

type MessageProps = {
  icon?: React.ReactNode
  title: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/** Empty: say what will appear here and give one way to start. */
export function RegionEmpty({ icon, title, children, action, className }: MessageProps) {
  return (
    <Empty className={cn('gap-4 p-6 md:p-8', className)}>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon" className="size-9 text-muted-foreground [&_svg:not([class*='size-'])]:size-5">{icon}</EmptyMedia>}
        <EmptyTitle className="text-sm font-semibold tracking-normal">{title}</EmptyTitle>
        {children && <EmptyDescription className="text-label text-subtle">{children}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

/** Error: "<what> didn't load", why in plain words, and Try again. */
export function RegionError({ what, children, onRetry, className }: { what: string; children?: React.ReactNode; onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className="contents">
      <RegionEmpty
        className={className}
        icon={<CircleAlert className="text-destructive" />}
        title={`${what} didn’t load`}
        action={<Button variant="outline" size="sm" onClick={onRetry}><RefreshCw />Try again</Button>}
      >
        {children}
      </RegionEmpty>
    </div>
  )
}

/** Stale: the values stay; this says since when. */
export function StaleNote({ since, className }: { since: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground', className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-warning" />
      {since}
    </span>
  )
}

import * as React from 'react'
import { cn } from '@/lib/utils'

// Text from people and APIs has no fixed length. <Truncate> cuts it with an ellipsis and offers the
// whole text on hover only while it is actually cut. It needs a bounded box to cut against: give its
// parent min-w-0 in flex and minmax(0,1fr) in grid, or one long name pushes its neighbours out of view.

type TruncateProps = React.ComponentProps<'span'> & {
  /** Isolate direction for names, so an Arabic name does not reorder the "#2998" next to it. */
  bdi?: boolean
  /** Number of lines; 1 is a single-line ellipsis. */
  lines?: number
}

export function Truncate({ bdi, lines = 1, className, children, style, ...props }: TruncateProps) {
  const ref = React.useRef<HTMLElement>(null)
  const [title, setTitle] = React.useState<string | undefined>()
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setTitle(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 ? el.textContent?.trim() : undefined)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children])
  const Tag = (bdi ? 'bdi' : 'span') as 'span'
  return (
    <Tag
      ref={ref as React.Ref<HTMLSpanElement>}
      title={title}
      className={cn('block min-w-0', lines === 1 ? 'truncate' : 'overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]', className)}
      style={lines > 1 ? { WebkitLineClamp: lines, ...style } : style}
      {...props}
    >
      {children}
    </Tag>
  )
}

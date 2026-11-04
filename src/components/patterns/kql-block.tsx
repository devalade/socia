import { TriangleAlert } from 'lucide-react'
import { CopyButton } from './copy-button'
import { cn } from '@/lib/utils'

export function KqlBlock({
  kql,
  index,
  range,
  className,
}: {
  kql: string
  index?: string
  range?: string
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-surface-1', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs font-medium text-foreground">KQL</span>
        {index && <span className="font-mono text-xs text-muted-foreground">{index}</span>}
        {range && <span className="text-xs text-muted-foreground">{range}</span>}
        <div className="ms-auto">
          <CopyButton value={kql} label="Copier la requête" size="xs" />
        </div>
      </div>
      <pre className="scroll-thin overflow-x-auto p-4 font-mono text-small leading-6 text-foreground" tabIndex={0}>
        <code>{kql}</code>
      </pre>
      <div className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-xs leading-5 text-muted-foreground">
        <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
        <span>À exécuter vous-même dans votre SIEM. SOCIA ne lance aucune requête et ne reçoit rien sans votre import.</span>
      </div>
    </div>
  )
}

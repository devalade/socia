import { useMemo } from 'react'
import { Braces } from 'lucide-react'
import { CopyButton } from './copy-button'
import { cn } from '@/lib/utils'

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],])/g

function renderJson(json: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let last = 0
  let index = 0
  for (const match of json.matchAll(TOKEN)) {
    const at = match.index ?? 0
    if (at > last) nodes.push(json.slice(last, at))
    const [full, stringToken, colon, numberToken, literalToken, punctuation] = match
    if (stringToken) {
      const isKey = Boolean(colon)
      nodes.push(
        <span key={index++} className={isKey ? 'text-brand' : 'text-success'}>
          {stringToken}
        </span>,
      )
      if (colon) nodes.push(<span key={index++} className="text-muted-foreground">{colon}</span>)
    } else if (numberToken) {
      nodes.push(<span key={index++} className="text-warning">{numberToken}</span>)
    } else if (literalToken) {
      nodes.push(<span key={index++} className="text-evidence">{literalToken}</span>)
    } else if (punctuation) {
      nodes.push(<span key={index++} className="text-muted-foreground">{punctuation}</span>)
    } else {
      nodes.push(full)
    }
    last = at + full.length
  }
  if (last < json.length) nodes.push(json.slice(last))
  return nodes
}

export function JsonViewer({
  value,
  maxChars = 120_000,
  maxHeight = '26rem',
  className,
  label = 'JSON',
}: {
  value: string
  maxChars?: number
  maxHeight?: string
  className?: string
  label?: string
}) {
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }, [value])
  const clipped = pretty.length > maxChars
  const shown = clipped ? pretty.slice(0, maxChars) : pretty
  const nodes = useMemo(() => renderJson(shown), [shown])
  const bytes = new TextEncoder().encode(value).length

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-surface-1', className)}>
      <div className="flex h-10 items-center gap-2 border-b border-border/80 px-3">
        <Braces aria-hidden className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/70 num">{bytes.toLocaleString('fr-FR')} octets</span>
        <div className="ms-auto">
          <CopyButton value={pretty} label="Copier" size="xs" />
        </div>
      </div>
      <pre
        className="json-scroll scroll-thin overflow-auto p-4 font-mono text-small leading-code text-subtle"
        style={{ '--json-max-height': maxHeight } as React.CSSProperties}
        tabIndex={0}
      >
        <code>{nodes}</code>
        {clipped && <span className="text-warning">{`\n\n[Aperçu limité aux ${maxChars.toLocaleString('fr-FR')} premiers caractères. Copier pour obtenir le JSON complet.]`}</span>}
      </pre>
    </div>
  )
}

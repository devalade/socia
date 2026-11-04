import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function CopyButton({
  value,
  label = 'Copier',
  copiedLabel = 'Copié',
  size = 'sm',
  variant = 'ghost',
  className,
}: {
  value: string
  label?: string
  copiedLabel?: string
  size?: 'xs' | 'sm' | 'default'
  variant?: 'ghost' | 'outline' | 'secondary'
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      data-print="hide"
      size={size}
      variant={variant}
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          toast.success(copiedLabel)
          window.setTimeout(() => setCopied(false), 1600)
        } catch {
          toast.error('Le presse-papiers est indisponible dans ce navigateur.')
        }
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {label && <span>{copied ? copiedLabel : label}</span>}
    </Button>
  )
}

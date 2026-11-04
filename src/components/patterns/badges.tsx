import { StatusBadge, type StatusTone } from '@/components/premium/status-badge'
import { SEVERITY_LABELS, VERDICT_LABELS, type Severity, type Verdict } from '@/lib/alert'
import { STATUS_LABELS, type InvestigationStatus } from '@/lib/investigation-labels'
import { cn } from '@/lib/utils'

const SEVERITY_TONE: Record<Severity, StatusTone> = {
  critical: 'danger',
  high: 'warning',
  medium: 'warning',
  low: 'success',
  info: 'info',
  unknown: 'neutral',
}

const STATUS_TONE: Record<InvestigationStatus, StatusTone> = {
  draft: 'neutral',
  analyzing: 'info',
  in_progress: 'info',
  concluded: 'success',
  archived: 'neutral',
}

const VERDICT_TONE: Record<Verdict, StatusTone> = {
  false_positive: 'neutral',
  legitimate: 'info',
  confirmed_incident: 'danger',
  watch: 'warning',
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <StatusBadge tone={SEVERITY_TONE[severity] ?? 'neutral'} className={className}>
      {SEVERITY_LABELS[severity] ?? 'Non renseignée'}
    </StatusBadge>
  )
}

export function InvestigationStatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (status in STATUS_LABELS ? status : 'draft') as InvestigationStatus
  return (
    <StatusBadge tone={STATUS_TONE[key]} className={className}>
      {STATUS_LABELS[key]}
    </StatusBadge>
  )
}

export function VerdictBadge({ verdict, className }: { verdict: Verdict | string | null; className?: string }) {
  if (!verdict || !(verdict in VERDICT_LABELS)) return null
  const key = verdict as Verdict
  return (
    <StatusBadge tone={VERDICT_TONE[key]} className={cn('h-6', className)}>
      {VERDICT_LABELS[key]}
    </StatusBadge>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone: StatusTone = priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'neutral'
  return (
    <StatusBadge tone={tone}>
      {priority === 'high' ? 'Priorité haute' : priority === 'medium' ? 'Priorité moyenne' : 'Priorité basse'}
    </StatusBadge>
  )
}

export function CountBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border bg-surface-2 px-1.5 text-meta font-medium text-muted-foreground num',
        className,
      )}
    >
      {children}
    </span>
  )
}

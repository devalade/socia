import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Delta } from '@/components/premium/delta'
import { Sparkline } from '@/components/premium/sparkline'
import { Truncate } from '@/components/premium/truncate'
import { formatMetric, metricChange, metricContext, type Metric } from '@/components/premium/metric'

// Label and change on one line, a 28px figure (24px on phones), one line of context in words, a sparkline.
// The figure never wraps: big values shrink to $48.3M and keep the whole value on hover.
export function KpiCard({ metric, spark = [], period, className }: { metric: Metric; spark?: (number | null)[]; period?: string; className?: string }) {
  const v = formatMetric(metric.kind, metric.value)
  const d = metricChange(metric)
  const hasSpark = spark.some((value) => value != null)
  return (
    <Card className={cn('flex flex-col gap-1.5 p-4 sm:p-5', className)}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 text-label text-subtle">
        {/* the label keeps 96px; past that the change wraps under it instead of cutting the label */}
        <Truncate className="min-w-24 flex-1">{metric.label}</Truncate>
        {d.value != null && <Delta value={d.value} unit={d.unit} invert={metric.invert} />}
      </div>
      <span className="text-2xl font-semibold tracking-[-0.02em] num sm:text-[28px] sm:leading-[1.1]" title={v.title}>{v.text}</span>
      <Truncate lines={2} className="text-label text-muted-foreground">{metricContext(metric, period)}</Truncate>
      {hasSpark && <Sparkline data={spark} className="mt-auto" />}
    </Card>
  )
}

/** Sized like the card, so data replacing it does not move the page. */
export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('grid grid-rows-[auto_auto_auto_1fr] gap-1.5 p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2"><Skeleton className="h-3 w-2/5" /><Skeleton className="h-[22px] w-12 rounded-full" /></div>
      <Skeleton className="h-7 w-3/5 sm:h-[31px]" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="mt-1 h-8 w-full self-end" />
    </Card>
  )
}

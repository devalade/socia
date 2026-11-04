import { Line, LineChart, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { isolated } from '@/components/premium/chart-scale'

// A 32px trend under a KPI. Empty is a quiet dashed baseline, one value is a dot, gaps break the line.
const config = { v: { label: 'Value', color: 'var(--chart-1)' } } satisfies ChartConfig

export function Sparkline({ data, className }: { data: (number | null)[]; className?: string }) {
  const present = data.filter((v) => v != null)
  if (!present.length) {
    return <svg aria-hidden viewBox="0 0 100 32" preserveAspectRatio="none" className={cn('h-8 w-full', className)}><path d="M0 30 H100" stroke="var(--border)" strokeWidth={1.5} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /></svg>
  }
  const rows = data.map((v) => ({ v }))
  return (
    <ChartContainer config={config} aria-hidden className={cn('aspect-auto h-8 w-full', className)}>
      <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 4, left: 4 }} accessibilityLayer={false}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line
          dataKey="v"
          type="monotone"
          stroke="var(--color-v)"
          strokeWidth={1.5}
          connectNulls={false}
          isAnimationActive={false}
          dot={(p: { index: number; cx?: number; cy?: number }) => isolated(data, p.index) && p.cx != null && p.cy != null
            ? <circle key={p.index} cx={p.cx} cy={p.cy} r={3} fill="var(--color-v)" stroke="var(--card)" strokeWidth={2} />
            : <g key={p.index} />}
        />
      </LineChart>
    </ChartContainer>
  )
}

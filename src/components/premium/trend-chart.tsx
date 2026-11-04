import * as React from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { gapsOf, isolated, niceScale } from '@/components/premium/chart-scale'
import { MISSING } from '@/lib/format'

// One accent series, the comparison dashed in grey, gridlines on nice steps with labels inside the plot.
// Real data rules: a gap is hatched and labelled, never bridged or drawn as zero; a lone point is a dot;
// below zero gets a stronger zero line; no data at all renders `empty` in the chart's own box.

export type TrendPoint = { label: string; value: number | null; previous?: number | null }

type TrendChartProps = {
  data: TrendPoint[]
  /** Formats axis labels and the tooltip. */
  format: (v: number) => string
  /** Short axis format (compact). Defaults to `format`. */
  formatAxis?: (v: number) => string
  /** Name of the series, for the tooltip and the screen-reader summary. */
  name: string
  previousName?: string
  /** Why the series has gaps, shown over the first one ("Tracking was paused"). */
  gapReason?: string
  /** Rendered instead of the plot when there is no value at all. */
  empty?: React.ReactNode
  className?: string
}

export function TrendChart({ data, format, formatAxis = format, name, previousName = 'Previous period', gapReason, empty, className }: TrendChartProps) {
  const id = React.useId().replace(/:/g, '')
  const values = data.map((d) => d.value)
  const present = values.filter((v): v is number => v != null)
  const previous = data.map((d) => d.previous ?? null)
  const hasPrevious = previous.some((v) => v != null)

  if (!present.length && !hasPrevious) return <div className={cn('grid h-60 place-items-stretch rounded-lg ring-1 ring-border ring-inset', className)}>{empty}</div>

  const { domain, ticks } = niceScale([...present, ...previous.filter((v): v is number => v != null)])
  // the axis is as wide as its longest label (11px figures are about 6.5px each), so no label is cut
  const axisWidth = Math.ceil(Math.max(...ticks.map((t) => formatAxis(t).length)) * 6.5) + 10
  // five dates at most, evenly spaced, first and last included
  const xTicks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => data[Math.round(f * (data.length - 1))].label))]
  const gaps = gapsOf(values).filter(([a, b]) => !(a === 0 && b === values.length - 1))
  const config = { value: { label: name, color: 'var(--chart-1)' }, previous: { label: previousName, color: 'var(--chart-2)' } } satisfies ChartConfig
  const summary = present.length
    ? `${name}: ${data.length} points from ${data[0].label} to ${data[data.length - 1].label}, between ${format(Math.min(...present))} and ${format(Math.max(...present))}${gaps.length ? `; ${gapReason ?? 'some points have no data'}` : ''}.`
    : `${name}: no data in this period.`

  return (
    <div role="img" aria-label={summary} className={cn('relative', className)}>
      <ChartContainer config={config} className="aspect-auto h-60 w-full" aria-hidden>
        <ComposedChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--color-value)" stopOpacity={0.2} />
              <stop offset="1" stopColor="var(--color-value)" stopOpacity={0} />
            </linearGradient>
            <pattern id={`${id}-hatch`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--muted-foreground)" strokeOpacity={0.2} strokeWidth={2} />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          {gaps.map(([a, b], k) => (
            <ReferenceArea
              key={a}
              x1={data[Math.max(0, a - 1)].label}
              x2={data[Math.min(data.length - 1, b + 1)].label}
              fill={`url(#${id}-hatch)`}
              fillOpacity={1}
              ifOverflow="hidden"
              label={k === 0 && gapReason ? { value: gapReason, position: 'insideTop', fontSize: 11, fill: 'var(--subtle)', dy: 4 } : undefined}
            />
          ))}
          {domain[0] < 0 && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.6} />}
          <YAxis domain={domain} ticks={ticks} axisLine={false} tickLine={false} tickFormatter={formatAxis} tick={{ fontSize: 11 }} width={axisWidth} />
          <XAxis dataKey="label" ticks={xTicks} interval={0} axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 11 }} padding={data.length === 1 ? { left: 40, right: 40 } : { left: 8, right: 8 }} />
          <ChartTooltip cursor={{ stroke: 'var(--border)' }} content={<ChartTooltipContent formatter={(v, n) => <><span className="text-muted-foreground">{config[n as 'value' | 'previous']?.label}</span><span className="ms-auto font-medium num">{v == null ? MISSING : format(Number(v))}</span></>} />} />
          {hasPrevious && <Line dataKey="previous" type="monotone" stroke="var(--color-previous)" strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls={false} isAnimationActive={false} />}
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2}
            fill={`url(#${id}-fill)`}
            baseValue={Math.max(domain[0], 0)}
            connectNulls={false}
            isAnimationActive={false}
            dot={(p: { index: number; cx?: number; cy?: number }) => isolated(values, p.index) && p.cx != null && p.cy != null
              ? <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill="var(--color-value)" stroke="var(--card)" strokeWidth={3} />
              : <g key={p.index} />}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

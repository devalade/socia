import { change, compact, duration, money, num, pct } from '@/lib/format'

// How a metric prints, by kind. Money keeps cents under $10K, drops them under $1M, then reads $48.3M
// with the full value for a title. Counts go compact from 1M. A rate changes in points, not percent.
export type MetricKind = 'money' | 'count' | 'rate' | 'duration'
export type Metric = { label: string; kind: MetricKind; value: number | null; previous: number | null; invert?: boolean; note?: string }

export function formatMetric(kind: MetricKind, v: number | null): { text: string; title?: string } {
  if (v == null) return { text: num(null) }
  if (kind === 'money') return Math.abs(v) >= 1e6 ? { text: money(v, { compact: true }), title: money(v) } : { text: money(v, { cents: Math.abs(v) < 1e4 }) }
  if (kind === 'rate') return { text: pct(v) }
  if (kind === 'duration') return { text: duration(v) }
  return Math.abs(v) >= 1e6 ? { text: compact(v), title: num(v) } : { text: num(v) }
}

export function metricChange(m: Metric) {
  const value = m.kind === 'rate' ? (m.value == null || m.previous == null ? null : m.value - m.previous) : change(m.value, m.previous)
  return { value, unit: m.kind === 'rate' ? ' pt' : '%' }
}

/** The line under the number, in words: what it is compared with, or why there is nothing to compare. */
export function metricContext(m: Metric, period = 'last month') {
  if (m.note) return m.note
  if (m.value == null) return 'Not available yet'
  if (m.previous == null) return 'No earlier period to compare'
  if (m.previous === 0 && m.value === 0) return 'Nothing in either period'
  if (m.previous === 0) return `Nothing ${period}`
  if (m.kind === 'count') return `${num(Math.abs(m.value - m.previous))} ${m.value >= m.previous ? 'more' : 'fewer'} than ${period}`
  return `${m.value >= m.previous ? 'Up' : 'Down'} from ${formatMetric(m.kind, m.previous).text}`
}

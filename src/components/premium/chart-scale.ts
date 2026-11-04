// Nice axis steps (1, 2, 2.5, 5 × 10ⁿ) that always include zero, and runs of a series split at gaps.
export function niceScale(values: number[], count = 4) {
  let lo = Math.min(0, ...values), hi = Math.max(0, ...values)
  if (hi === lo) hi = lo + 1
  const raw = (hi - lo) / count, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6)
  return { domain: [lo, hi] as [number, number], ticks }
}

/** Index ranges where the series is missing: [[from, to], …] inclusive. */
export function gapsOf(values: (number | null | undefined)[]) {
  const out: [number, number][] = []
  values.forEach((v, i) => {
    if (v != null) return
    const last = out[out.length - 1]
    if (last && last[1] === i - 1) last[1] = i
    else out.push([i, i])
  })
  return out
}

/** A point with no neighbour on either side has no line to sit on; draw it as a dot. */
export const isolated = (values: (number | null | undefined)[], i: number) =>
  values[i] != null && values[i - 1] == null && values[i + 1] == null

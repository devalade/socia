// Formatting for real data. Every number that reaches the screen goes through here.
//
// - Missing is not zero: null, undefined, '' and NaN print an em dash, never 0, NaN or "undefined".
// - Negatives use the minus sign U+2212, as wide as a figure in tabular fonts. −0 prints as 0.
// - Big numbers shrink (48.3M) and keep the full value for a title.
// - A change from zero is "New", not +Infinity%; zero to zero is 0%.
// - A rate moves in points (−0.4 pt), everything else in percent.
// - Counts take a real plural: "1 order", "2 orders".

export const MISSING = 'n/d'
export type Maybe<T> = T | null | undefined

const LOCALE = typeof document !== 'undefined' ? document.documentElement.lang || 'fr-FR' : 'fr-FR'
const cache = new Map<string, Intl.NumberFormat>()
const nf = (o: Intl.NumberFormatOptions) => {
  const k = JSON.stringify(o)
  if (!cache.has(k)) cache.set(k, new Intl.NumberFormat(LOCALE, o))
  return cache.get(k)!
}

/** API numbers arrive as numbers, strings or nothing. '' and null are missing, not zero. */
export const toNumber = (v: unknown): number =>
  v === null || v === undefined || v === '' || typeof v === 'boolean' ? NaN : Number(v) + 0
export const isMissing = (v: unknown) => !Number.isFinite(toNumber(v))

// Intl prints a hyphen; swap it for the real minus, and drop the sign of a zero ("-$0.00")
const minus = (s: string) => (/^-[^1-9]*$/.test(s) ? s.slice(1) : s.replace(/-(?=[\d\p{Sc}])/u, '−'))

export const num = (v: unknown, digits = 0) =>
  isMissing(v) ? MISSING : minus(nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(toNumber(v)))

/** 1.2K, 48.3M. Under `under` stays whole so small counts keep their precision. */
export const compact = (v: unknown, { under = 10_000 } = {}) => {
  if (isMissing(v)) return MISSING
  const n = toNumber(v)
  return Math.abs(n) < under ? num(Math.round(n)) : minus(nf({ notation: 'compact', maximumSignificantDigits: 3 }).format(n))
}

export const money = (v: unknown, { currency = 'USD', cents = true, compact: short = false } = {}) => {
  if (isMissing(v)) return MISSING
  const n = toNumber(v)
  if (short && Math.abs(n) >= 1e6) return minus(nf({ style: 'currency', currency, notation: 'compact', maximumSignificantDigits: 3 }).format(n))
  return minus(nf({ style: 'currency', currency, ...(cents ? {} : { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }).format(n))
}

/** Money split so the cents can be set smaller: { whole: '−$1,280', cents: '.00' } */
export const moneyParts = (v: unknown, currency = 'USD') => {
  const s = money(v, { currency })
  const m = s.match(/^(.*?)([.,]\d{2})(\D*)$/)
  return m ? { whole: m[1], cents: m[2] + m[3] } : { whole: s, cents: '' }
}

export const pct = (v: unknown, digits = 1) => (isMissing(v) ? MISSING : minus(nf({ maximumFractionDigits: digits }).format(toNumber(v))) + '%')

export const duration = (ms: unknown) => {
  if (isMissing(ms)) return MISSING
  const v = toNumber(ms)
  if (v === 0) return '0 s'
  if (v < 1) return '<1 ms'
  if (v < 1000) return `${Math.round(v)} ms`
  const s = v / 1000
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)} s`
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d) return `${d}d ${h % 24}h`
  if (h) return `${h}h ${String(m % 60).padStart(2, '0')}m`
  return `${m}m ${String(Math.round(s % 60)).padStart(2, '0')}s`
}

export const date = (d: Date, now = new Date()) =>
  d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })

/** just now, 4m ago, 3h ago, yesterday, Oct 12, Oct 12, 2025 */
export const ago = (d: Maybe<Date>, now = new Date()) => {
  if (!d || Number.isNaN(d.getTime())) return MISSING
  const m = Math.round((now.getTime() - d.getTime()) / 60000)
  if (m < 1) return 'à l’instant'
  if (m < 60) return `il y a ${m} min`
  if (m < 1440 && d.getDate() === now.getDate()) return `il y a ${Math.floor(m / 60)} h`
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'hier'
  return date(d, now)
}

const rules = new Intl.PluralRules(LOCALE)
/** plural(1, 'order') → "1 order"; plural(10482, 'order') → "10,482 orders" */
export const plural = (n: number, one: string, many = one + 's') => `${num(n)} ${rules.select(n) === 'one' ? one : many}`

/** Percent change with the edge cases named: missing in, null out; from zero is Infinity ("New"). */
export const change = (now: unknown, before: unknown): number | null => {
  if (isMissing(now) || isMissing(before)) return null
  const a = toNumber(now), b = toNumber(before)
  if (b === 0) return a === 0 ? 0 : Infinity
  return ((a - b) / Math.abs(b)) * 100
}

export type Tone = 'up' | 'down' | 'flat'
/** A signed change and which way to colour it. invert: a fall is good (refunds, bounce rate). */
export const delta = (v: number | null, { digits = 1, unit = '%', invert = false } = {}): { text: string; tone: Tone } => {
  if (v === Infinity) return { text: 'Nouveau', tone: invert ? 'down' : 'up' }
  if (v === null || !Number.isFinite(v)) return { text: MISSING, tone: 'flat' }
  const r = Number(v.toFixed(digits))
  if (r === 0) return { text: `0${unit}`, tone: 'flat' }
  const up = r > 0
  return { text: (up ? '+' : '−') + nf({ maximumFractionDigits: digits }).format(Math.abs(r)) + unit, tone: up !== invert ? 'up' : 'down' }
}

/** Initials: two letters for Latin, Greek and Cyrillic; one character for CJK, Arabic, Hebrew, Thai; "?" when nothing is left. */
export const initials = (name: Maybe<string>) => {
  const s = String(name ?? '').replace(/\(.*?\)/g, ' ').replace(/[^\p{L}\p{M}\s'’-]/gu, ' ').trim()
  const parts = s.split(/\s+/).filter((p) => /\p{L}/u.test(p))
  if (!parts.length) return '?'
  const lead = (p: string) => [...p.replace(/^['’-]+/, '')][0] || ''
  if (/[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Thai}]/u.test(s)) return lead(parts[0])
  return (lead(parts[0]) + (parts.length > 1 ? lead(parts[parts.length - 1]) : '')).toLocaleUpperCase()
}

/** A stable hue per name, so a person keeps their colour across pages. */
export const hue = (key: Maybe<string>) => {
  let h = 2166136261
  for (const c of String(key ?? '')) h = Math.imul(h ^ c.codePointAt(0)!, 16777619)
  return (h >>> 0) % 360
}

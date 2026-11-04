export type ResultMeta = {
  rowCount: number | null
  summary: string
  took: number | null
  timedOut: boolean | null
  aggregationNames: string[]
  fields: string[]
  shape: string
}

/** Deterministic evidence description. It never interprets a 0 as absence of activity. */
export function describeResult(parsed: unknown): ResultMeta {
  let rowCount: number | null = null
  let shape = 'objet'
  let took: number | null = null
  let timedOut: boolean | null = null
  let aggregationNames: string[] = []
  let sample: Record<string, unknown>[] = []
  let fields: string[] = []

  if (Array.isArray(parsed)) {
    rowCount = parsed.length
    shape = 'tableau'
    sample = parsed.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    const hits = obj.hits as Record<string, unknown> | undefined
    if (hits && typeof hits === 'object') {
      shape = 'réponse Elasticsearch (hits)'
      const total = hits.total
      if (typeof total === 'number') rowCount = total
      else if (total && typeof total === 'object' && 'value' in total && typeof total.value === 'number') rowCount = total.value
      if (Array.isArray(hits.hits)) {
        rowCount ??= hits.hits.length
        sample = hits.hits
          .map((hit) =>
            hit && typeof hit === 'object' && '_source' in hit && hit._source && typeof hit._source === 'object'
              ? (hit._source as Record<string, unknown>)
              : hit && typeof hit === 'object'
                ? (hit as Record<string, unknown>)
                : null,
          )
          .filter((row): row is Record<string, unknown> => row !== null)
          .slice(0, 50)
      }
      if (typeof hits.max_score === 'number') fields.push('max_score')
    } else if (Array.isArray(obj.rows)) {
      shape = 'objet avec rows'
      rowCount = obj.rows.length
      sample = obj.rows.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row),
      )
    } else if (Array.isArray(obj.data)) {
      shape = 'objet avec data'
      rowCount = obj.data.length
      sample = obj.data.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row),
      )
    }
    if (typeof obj.took === 'number') took = obj.took
    if (typeof obj.timed_out === 'boolean') timedOut = obj.timed_out
    if (obj.aggregations && typeof obj.aggregations === 'object') {
      aggregationNames = Object.keys(obj.aggregations as Record<string, unknown>).slice(0, 8)
    }
    if (obj.error && typeof obj.error === 'object') {
      shape = 'réponse d’erreur Elasticsearch'
      const reason = (obj.error as Record<string, unknown>).reason
      if (typeof reason === 'string') fields.push(reason.slice(0, 160))
    }
  }

  const fieldSet = new Set<string>()
  for (const row of sample.slice(0, 10)) {
    for (const key of Object.keys(row).slice(0, 30)) fieldSet.add(key)
  }
  fields = Array.from(new Set([...fields, ...fieldSet])).slice(0, 24)

  const parts: string[] = []
  if (rowCount === null) parts.push('Nombre de lignes non déterminé.')
  else if (rowCount === 0) {
    parts.push(
      '0 ligne retournée. Un résultat vide ne prouve pas l’absence d’activité : il peut refléter un problème de collecte, d’index, de rétention, de filtre, de privilèges ou de plage temporelle.',
    )
  } else {
    parts.push(`${rowCount.toLocaleString('fr-FR')} ligne${rowCount > 1 ? 's' : ''} retournée${rowCount > 1 ? 's' : ''}.`)
  }
  if (took !== null) parts.push(`Temps Elasticsearch : ${took} ms.`)
  if (timedOut) parts.push('La requête a expiré côté SIEM : le résultat est partiel.')
  if (aggregationNames.length) parts.push(`Agrégations : ${aggregationNames.join(', ')}.`)
  if (fields.length) parts.push(`Champs observés : ${fields.slice(0, 10).join(', ')}.`)
  return { rowCount, summary: parts.join(' '), took, timedOut, aggregationNames, fields, shape }
}


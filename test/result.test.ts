import { describe, expect, it } from 'vitest'
import { describeResult } from '../src/lib/result'

describe('imported result description', () => {
  it('never turns an empty result into proof of absence', () => {
    const meta = describeResult([])
    expect(meta.rowCount).toBe(0)
    expect(meta.summary).toContain('ne prouve pas l’absence d’activité')
    expect(meta.summary).toContain('collecte')
  })

  it('reads Elasticsearch hits and aggregations', () => {
    const meta = describeResult({
      took: 12,
      timed_out: false,
      hits: {
        total: { value: 10482, relation: 'eq' },
        hits: [
          { _source: { host: { name: 'WIN-1' }, user: { name: 'a.koffi' } } },
          { _source: { host: { name: 'WIN-2' }, process: { name: 'powershell.exe' } } },
        ],
      },
      aggregations: { by_host: { buckets: [] } },
    })
    expect(meta.rowCount).toBe(10482)
    expect(meta.summary).toContain('10')
    expect(meta.aggregationNames).toEqual(['by_host'])
    expect(meta.fields).toContain('host')
    expect(meta.shape).toBe('réponse Elasticsearch (hits)')
  })

  it('supports a plain array and an object with rows', () => {
    expect(describeResult([{ a: 1 }, { a: 2 }]).rowCount).toBe(2)
    expect(describeResult({ rows: [{ a: 1 }] }).shape).toBe('objet avec rows')
  })
})

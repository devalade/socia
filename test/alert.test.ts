import { describe, expect, it } from 'vitest'
import { SAMPLE_ALERT } from '../src/lib/sample-alert'
import { parseAlertJson, summarizeAlert } from '../src/lib/alert'

describe('Elastic alert parsing', () => {
  it('extracts the common fields from a search hit', () => {
    const parsed = parseAlertJson(SAMPLE_ALERT)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.summary.ruleName).toBe('Encoded PowerShell launched from an Office application')
    expect(parsed.summary.severity).toBe('high')
    expect(parsed.summary.host).toBe('WIN-FIN-042')
    expect(parsed.summary.user).toBe('a.koffi')
    expect(parsed.summary.sourceIp).toBe('10.20.4.18')
    expect(parsed.summary.destinationIp).toBe('185.199.108.133')
    expect(parsed.summary.documentId).toBe('7f4c9a2e-3b1d-4a55-9c8e-1d2f4b6a8c90')
    expect(parsed.summary.missing).toHaveLength(0)
  })

  it('accepts a flat _source object', () => {
    const summary = summarizeAlert({
      '@timestamp': '2026-11-04T08:12:44.102Z',
      rule: { name: 'Test rule', severity: 'low' },
      host: { name: 'HOST-1' },
      message: 'A message',
    })
    expect(summary.ruleName).toBe('Test rule')
    expect(summary.severity).toBe('low')
    expect(summary.host).toBe('HOST-1')
  })

  it('derives severity from the risk score and reports absent fields', () => {
    const summary = summarizeAlert({ rule: { name: 'Risky', risk_score: 88 } })
    expect(summary.severity).toBe('critical')
    expect(summary.missing).toContain('Horodatage de l’alerte')
    expect(summary.missing).toContain('Hôte concerné')
    expect(summary.riskScore).toBe(88)
  })

  it('rejects malformed JSON with a readable message', () => {
    const parsed = parseAlertJson('{not json')
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toMatch(/JSON invalide/)
  })
})

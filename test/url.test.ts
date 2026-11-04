import { describe, expect, it } from 'vitest'
import { validateProviderBaseUrl } from '../src/lib/url'

describe('provider URL validation', () => {
  it('accepts a public HTTPS endpoint and trims the trailing slash', () => {
    expect(validateProviderBaseUrl('https://api.example.com/v1/')).toBe('https://api.example.com/v1')
  })

  it('rejects HTTP in production and credentials in the URL', () => {
    expect(() => validateProviderBaseUrl('http://api.example.com/v1')).toThrow(/HTTPS/)
    expect(() => validateProviderBaseUrl('https://user:pass@api.example.com/v1')).toThrow(/identifiants/)
  })

  it('rejects private networks and cloud metadata', () => {
    for (const host of [
      'https://10.0.0.1/v1',
      'https://192.168.1.10/v1',
      'https://172.20.0.4/v1',
      'https://127.0.0.1/v1',
      'https://169.254.169.254/latest',
      'https://metadata.google.internal/v1',
    ]) {
      expect(() => validateProviderBaseUrl(host)).toThrow(/privée|métadonnées/i)
    }
  })

  it('allows a local endpoint only when explicitly enabled for development', () => {
    expect(validateProviderBaseUrl('http://localhost:11434/v1', { allowHttp: true, allowPrivate: true })).toBe(
      'http://localhost:11434/v1',
    )
  })
})

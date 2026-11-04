export class UrlValidationError extends Error {}

/**
 * Provider URLs are fetched by the Worker, so this is also an SSRF boundary.
 * HTTPS is mandatory in production; HTTP is only allowed for a local Ollama-style endpoint.
 */
export function validateProviderBaseUrl(value: string, options: { allowHttp?: boolean; allowPrivate?: boolean } = {}): string {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new UrlValidationError('L’URL du fournisseur est invalide.')
  }
  if (url.protocol !== 'https:' && !(options.allowHttp && url.protocol === 'http:')) {
    throw new UrlValidationError('L’URL doit utiliser HTTPS (HTTP n’est accepté qu’en développement local).')
  }
  if (url.username || url.password) throw new UrlValidationError('L’URL ne doit pas contenir d’identifiants.')

  const host = url.hostname.toLowerCase()
  const parts = host.split('.').map(Number)
  const private172 = parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31
  const blocked =
    host === '169.254.169.254' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('127.') ||
    private172 ||
    /^fc[0-9a-f]{2}:/i.test(host) ||
    /^fe80:/i.test(host)

  if (blocked && !options.allowPrivate) {
    throw new UrlValidationError('Cette adresse réseau privée ou de métadonnées n’est pas autorisée.')
  }
  return url.toString().replace(/\/$/, '')
}

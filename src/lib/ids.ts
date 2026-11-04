const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

/** A collision-resistant, URL-safe id. The prefix makes logs and audit trails readable. */
export function newId(prefix: string, size = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  let body = ''
  for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length]
  return `${prefix}_${body}`
}

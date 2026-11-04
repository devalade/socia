import { env } from 'void/env'

const encoder = new TextEncoder()

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function key(): Promise<CryptoKey> {
  const material = `${env.AI_KEY_ENCRYPTION_KEY ?? env.BETTER_AUTH_SECRET}:socia-ai-provider-key-v1`
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(material))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export type SealedKey = { ciphertext: string; iv: string; tag: string; hint: string }

/** AES-GCM at rest. The plaintext key never reaches D1, logs, or the client bundle. */
export async function sealApiKey(plaintext: string): Promise<SealedKey> {
  const trimmed = plaintext.trim()
  if (!trimmed) throw new Error('La clé API est vide.')
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(),
    encoder.encode(trimmed),
  )
  const bytes = new Uint8Array(encrypted)
  return {
    ciphertext: toBase64(bytes.slice(0, bytes.length - 16)),
    iv: toBase64(iv),
    tag: toBase64(bytes.slice(bytes.length - 16)),
    hint: trimmed.slice(-4),
  }
}

export async function openApiKey(sealed: {
  ciphertext: string | null
  iv: string | null
  tag: string | null
}): Promise<string> {
  if (!sealed.ciphertext || !sealed.iv || !sealed.tag) {
    throw new Error('Aucune clé API enregistrée pour ce fournisseur.')
  }
  const ciphertext = fromBase64(sealed.ciphertext)
  const tag = fromBase64(sealed.tag)
  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext)
  combined.set(tag, ciphertext.length)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(sealed.iv) as BufferSource },
    await key(),
    combined as BufferSource,
  )
  return new TextDecoder().decode(plaintext)
}

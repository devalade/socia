export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(entity = 'Ressource'): AppError {
  return new AppError('not_found', `${entity} introuvable.`, 404)
}

export function forbidden(message = 'Vous n’avez pas les droits nécessaires pour cette action.'): AppError {
  return new AppError('forbidden', message, 403)
}

export function signedOut(): AppError {
  return new AppError('signed_out', 'Votre session a expiré. Reconnectez-vous.', 401)
}

export function invalid(message: string): AppError {
  return new AppError('invalid_input', message, 422)
}

/** Keep provider errors useful without ever echoing a credential. */
export function safeProviderError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const redacted = raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/(api[_-]?key|token|secret)\s*[:=]\s*["']?[^"'\s]+/gi, '$1=[redacted]')
    .replace(/sk-[A-Za-z0-9._-]{8,}/g, 'sk-[redacted]')
  return redacted.slice(0, 500)
}

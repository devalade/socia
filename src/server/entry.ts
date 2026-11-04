import handler from '@tanstack/react-start/server-entry'
import { _validateEnvOnce } from 'void/env'
import '../../env'
import { auth } from './auth'
import { detectLocalModel } from './ai/local'

// Better Auth owns /api/auth/*. Everything else goes through TanStack Start.
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

function secure(response: Response, production: boolean): Response {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
  if (production) {
    headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    )
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request: Request, env: unknown): Promise<Response> {
    await _validateEnvOnce(env)
    const production = (env as { APP_ENV?: string }).APP_ENV === 'production'
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/auth/')) return secure(await auth().handler(request), production)
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      let database = false
      try {
        const db = (env as { DB?: D1Database }).DB
        if (db) {
          const result = await db.prepare('SELECT 1 AS ok').first<{ ok: number }>()
          database = result?.ok === 1
        }
      } catch {
        database = false
      }
      let localModel: { available: boolean; model: string | null; endpoint: string; error: string | null } = {
        available: false,
        model: null,
        endpoint: '',
        error: null,
      }
      try {
        const model = await detectLocalModel()
        localModel = { available: model.available, model: model.available ? model.modelId : null, endpoint: model.endpoint, error: model.error }
      } catch {
        localModel.error = 'Détection Ollama impossible.'
      }
      return secure(
        Response.json(
          {
            ok: database,
            service: 'socia',
            database,
            aiBinding: Boolean((env as { AI?: unknown }).AI),
            aiLocal: localModel,
            at: new Date().toISOString(),
          },
          { status: database ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
        ),
        production,
      )
    }
    return secure(await handler.fetch(request), production)
  },
}

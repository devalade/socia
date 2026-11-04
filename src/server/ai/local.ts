import { env } from 'void/env'
import { AppError } from '../errors'
import type { ModelForRun } from './providers'

export const LOCAL_PROVIDER_ID = 'local-ollama'

export type LocalModelView = {
  providerId: typeof LOCAL_PROVIDER_ID
  providerName: string
  modelId: string
  label: string
  endpoint: string
  available: boolean
  error: string | null
}

const CACHE_MS = 5_000
let cache: { value: LocalModelView; at: number } | null = null

function endpoint(): string {
  return (env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '')
}

/** The configured local model, without probing Ollama. Drafts can be saved before the model is up. */
export function localModelConfig(): LocalModelView {
  const configured = (env.OLLAMA_MODEL || '').trim()
  return {
    providerId: LOCAL_PROVIDER_ID,
    providerName: 'Ollama local',
    modelId: configured || 'ollama',
    label: configured || 'Modèle local',
    endpoint: endpoint(),
    available: false,
    error: null,
  }
}

/** Probe the local Ollama daemon and use OLLAMA_MODEL, or the first installed model. */
export async function detectLocalModel(force = false): Promise<LocalModelView> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value
  const fallback = localModelConfig()
  let value: LocalModelView

  try {
    const response = await fetch(`${fallback.endpoint}/api/tags`, { signal: AbortSignal.timeout(800) })
    if (!response.ok) throw new Error(`Ollama a répondu ${response.status}.`)
    const payload = (await response.json()) as { models?: Array<{ name?: unknown }> }
    const installed = Array.isArray(payload.models)
      ? payload.models.map((model) => (typeof model?.name === 'string' ? model.name : '')).filter(Boolean)
      : []
    const modelId = (env.OLLAMA_MODEL || '').trim() || installed[0] || ''
    if (!modelId) {
      value = { ...fallback, error: 'Ollama répond, mais aucun modèle n’est installé. Lancez `ollama pull <modèle>`.' }
    } else {
      value = { ...fallback, modelId, label: modelId, available: true, error: null }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'connexion impossible'
    value = { ...fallback, error: `Ollama local n’est pas joignable sur ${fallback.endpoint}. ${detail}` }
  }

  cache = { value, at: Date.now() }
  return value
}

/** Resolve a runnable OpenAI-compatible model, or fail with an actionable message. */
export async function resolveLocalModelForRun(): Promise<ModelForRun> {
  const model = await detectLocalModel(true)
  if (!model.available) {
    throw new AppError('ai_local_unavailable', model.error ?? 'Ollama local n’est pas joignable.', 503)
  }
  return {
    providerId: model.providerId,
    providerName: model.providerName,
    providerKind: 'openai-compatible',
    baseUrl: `${model.endpoint}/v1`,
    modelId: model.modelId,
    apiKey: 'ollama',
  }
}

import { env } from 'void/env'
import { ai } from 'void/ai'
import { and, asc, eq } from 'void/db'
import { aiModels, aiProviders } from '../../../db/schema'
import { newId } from '../../lib/ids'
import { db } from '../db'
import { AppError, invalid, notFound, safeProviderError } from '../errors'
import { validateProviderBaseUrl } from '../../lib/url'
import { openApiKey } from '../vault'

export const WORKERS_AI_PROVIDER_ID = 'workers-ai'

export type ProviderKind = 'workers-ai' | 'openai-compatible'

export type ModelView = {
  id: string
  providerId: string
  providerName: string
  providerKind: ProviderKind
  modelId: string
  label: string
  task: string
  isRecommended: boolean
  isActive: boolean
}

export type ProviderView = {
  id: string
  kind: ProviderKind
  name: string
  baseUrl: string | null
  keyHint: string | null
  isActive: boolean
  lastCheckedAt: string | null
  lastError: string | null
  modelCount: number
}

export type DetectionResult = {
  providerId: string
  models: ModelView[]
  error: string | null
}

type WorkersModel = {
  name?: unknown
  id?: unknown
  description?: unknown
  task?: unknown
  properties?: unknown
}

const UNSUITABLE = /(embedding|embed|rerank|whisper|tts|text-to-speech|stable-diffusion|flux|sdxl|dreamshaper|guard|moderation|image-to-text|automatic-speech)/i

function prettyModelName(modelId: string): string {
  const last = modelId.split('/').pop() ?? modelId
  const words = last
    .replace(/@cf\//g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b(\d+)b\b/gi, (_, size: string) => `${size}B`)
    .replace(/\b(\w)/g, (char) => char.toUpperCase())
    .replace(/\bFp8\b/gi, 'FP8')
    .replace(/\bGpt\b/g, 'GPT')
    .replace(/\bOss\b/g, 'OSS')
    .replace(/\bGlm\b/g, 'GLM')
    .replace(/\bKimi\b/g, 'Kimi')
    .replace(/\bAi\b/g, 'AI')
  return words
}

function recommended(modelId: string): boolean {
  return /llama-3\.3-70b|gpt-oss-(20b|120b)|glm-5|glm-4\.7|deepseek-v4|qwen3|qwen2\.5|mistral-small-3\.1/i.test(
    modelId,
  )
}

function taskName(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') return value.name
  return ''
}

export function validateBaseUrl(value: string): string {
  try {
    return validateProviderBaseUrl(value, {
      allowHttp: env.APP_ENV === 'local',
      allowPrivate: env.APP_ENV === 'local',
    })
  } catch (error) {
    throw invalid(error instanceof Error ? error.message : 'URL invalide.')
  }
}

export async function ensureWorkersAiProvider(): Promise<void> {
  await db
    .insert(aiProviders)
    .values({
      id: WORKERS_AI_PROVIDER_ID,
      kind: 'workers-ai',
      name: 'Workers AI (Cloudflare)',
      baseUrl: null,
      isActive: true,
    })
    .onConflictDoNothing()
}

export async function listProviders(): Promise<ProviderView[]> {
  await ensureWorkersAiProvider()
  const providers = await db.select().from(aiProviders).orderBy(asc(aiProviders.createdAt))
  const models = await db
    .select({ providerId: aiModels.providerId, id: aiModels.id })
    .from(aiModels)
    .where(eq(aiModels.isActive, true))
  return providers.map((provider) => ({
    id: provider.id,
    kind: provider.kind === 'openai-compatible' ? 'openai-compatible' : 'workers-ai',
    name: provider.name,
    baseUrl: provider.baseUrl,
    keyHint: provider.keyHint,
    isActive: provider.isActive,
    lastCheckedAt: provider.lastCheckedAt,
    lastError: provider.lastError,
    modelCount: models.filter((model) => model.providerId === provider.id).length,
  }))
}

let detectionPromise: Promise<void> | null = null

/** First authenticated page load detects the built-in catalog once; later loads read D1. */
export async function ensureModelsDetected(): Promise<void> {
  const existing = await listModels()
  if (existing.length > 0) return
  detectionPromise ??= detectModels(WORKERS_AI_PROVIDER_ID)
    .then(() => undefined)
    .finally(() => {
      detectionPromise = null
    })
  await detectionPromise
}

export async function listModels(options: { includeInactive?: boolean } = {}): Promise<ModelView[]> {
  await ensureWorkersAiProvider()
  const providers = await db.select().from(aiProviders)
  const rows = await db
    .select()
    .from(aiModels)
    .where(options.includeInactive ? undefined : eq(aiModels.isActive, true))
    .orderBy(asc(aiModels.label))
  return rows.flatMap((row) => {
    const provider = providers.find((item) => item.id === row.providerId)
    if (!provider) return []
    return [
      {
        id: row.id,
        providerId: row.providerId,
        providerName: provider.name,
        providerKind: provider.kind === 'openai-compatible' ? 'openai-compatible' : 'workers-ai',
        modelId: row.modelId,
        label: row.label,
        task: row.task,
        isRecommended: row.isRecommended,
        isActive: row.isActive,
      },
    ]
  })
}

function normalizeWorkersModels(raw: unknown): { modelId: string; label: string; task: string }[] {
  let list: unknown[] = []
  if (Array.isArray(raw)) list = raw
  else if (raw && typeof raw === 'object' && 'models' in raw && Array.isArray(raw.models)) list = raw.models
  else if (raw && typeof raw === 'object' && 'result' in raw && Array.isArray(raw.result)) list = raw.result

  const out: { modelId: string; label: string; task: string }[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const model = item as WorkersModel
    const modelId = typeof model.name === 'string' ? model.name : typeof model.id === 'string' ? model.id : ''
    if (!modelId || !modelId.startsWith('@cf/')) continue
    const task = taskName(model.task) || 'Text Generation'
    if (!/text generation|text-to-text|conversational/i.test(task)) continue
    if (UNSUITABLE.test(modelId)) continue
    out.push({
      modelId,
      label: prettyModelName(modelId),
      task,
    })
  }
  return out
}

async function saveModels(
  providerId: string,
  models: { modelId: string; label: string; task: string }[],
): Promise<void> {
  await db.update(aiModels).set({ isActive: false }).where(eq(aiModels.providerId, providerId))
  for (const model of models) {
    await db
      .insert(aiModels)
      .values({
        id: newId('mdl', 16),
        providerId,
        modelId: model.modelId,
        label: model.label,
        task: model.task,
        isRecommended: recommended(model.modelId),
        isActive: true,
        detectedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [aiModels.providerId, aiModels.modelId],
        set: {
          label: model.label,
          task: model.task,
          isRecommended: recommended(model.modelId),
          isActive: true,
          detectedAt: new Date().toISOString(),
        },
      })
  }
}

export async function detectModels(providerId: string): Promise<DetectionResult> {
  await ensureWorkersAiProvider()
  const [provider] = await db.select().from(aiProviders).where(eq(aiProviders.id, providerId)).limit(1)
  if (!provider) throw notFound('Fournisseur IA')

  try {
    let detected: { modelId: string; label: string; task: string }[] = []
    if (provider.kind === 'workers-ai') {
      const raw = await ai.models({ task: 'Text Generation' })
      detected = normalizeWorkersModels(raw)
      if (detected.length === 0) {
        // Keep a small, honest fallback so a first boot with a cold catalog is still usable.
        detected = [
          {
            modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
            label: 'Llama 3.3 70B Instruct FP8 Fast',
            task: 'Text Generation',
          },
        ]
      }
    } else {
      if (!provider.baseUrl) throw invalid('Ce fournisseur n’a pas d’URL de base.')
      const secret = await openApiKey({
        ciphertext: provider.apiKeyCiphertext,
        iv: provider.apiKeyIv,
        tag: provider.apiKeyTag,
      })
      const response = await fetch(`${provider.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) {
        throw new AppError(
          'provider_detection_failed',
          `Le fournisseur a répondu ${response.status}.`,
          response.status === 401 ? 401 : 502,
        )
      }
      const payload = (await response.json()) as unknown
      const data =
        payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
      detected = data.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const id = 'id' in item && typeof item.id === 'string' ? item.id : ''
        if (!id || UNSUITABLE.test(id)) return []
        return [{ modelId: id, label: prettyModelName(id), task: 'Text Generation' }]
      })
    }

    await saveModels(provider.id, detected)
    await db
      .update(aiProviders)
      .set({ lastCheckedAt: new Date().toISOString(), lastError: null, updatedAt: new Date().toISOString() })
      .where(eq(aiProviders.id, provider.id))
    const models = await listModels()
    return { providerId: provider.id, models: models.filter((model) => model.providerId === provider.id), error: null }
  } catch (error) {
    const message = safeProviderError(error)
    await db
      .update(aiProviders)
      .set({ lastCheckedAt: new Date().toISOString(), lastError: message, updatedAt: new Date().toISOString() })
      .where(eq(aiProviders.id, provider.id))
    const cached = (await listModels()).filter((model) => model.providerId === provider.id)
    return { providerId: provider.id, models: cached, error: message }
  }
}

export async function detectAllModels(): Promise<DetectionResult[]> {
  await ensureWorkersAiProvider()
  const providers = await db.select({ id: aiProviders.id }).from(aiProviders).where(eq(aiProviders.isActive, true))
  const out: DetectionResult[] = []
  for (const provider of providers) out.push(await detectModels(provider.id))
  return out
}

export type ModelForRun = {
  providerId: string
  providerName: string
  providerKind: ProviderKind
  baseUrl: string | null
  modelId: string
  apiKey: string | null
}

export async function resolveModelForRun(providerId: string, modelId: string): Promise<ModelForRun> {
  const [model] = await db
    .select()
    .from(aiModels)
    .where(and(eq(aiModels.providerId, providerId), eq(aiModels.modelId, modelId), eq(aiModels.isActive, true)))
    .limit(1)
  if (!model) throw notFound('Modèle IA')
  const [provider] = await db.select().from(aiProviders).where(eq(aiProviders.id, providerId)).limit(1)
  if (!provider || !provider.isActive) throw notFound('Fournisseur IA')
  const kind: ProviderKind = provider.kind === 'openai-compatible' ? 'openai-compatible' : 'workers-ai'
  const apiKey =
    kind === 'openai-compatible'
      ? await openApiKey({
          ciphertext: provider.apiKeyCiphertext,
          iv: provider.apiKeyIv,
          tag: provider.apiKeyTag,
        })
      : null
  return {
    providerId: provider.id,
    providerName: provider.name,
    providerKind: kind,
    baseUrl: provider.baseUrl,
    modelId: model.modelId,
    apiKey,
  }
}

export type CompletionResult = {
  text: string
  inputTokens: number | null
  outputTokens: number | null
}

function normalizeWorkersOutput(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (!raw || typeof raw !== 'object') return ''
  const r = raw as Record<string, unknown>
  if (typeof r.response === 'string') return r.response
  if (typeof r.text === 'string') return r.text
  if (Array.isArray(r.choices) && r.choices[0] && typeof r.choices[0] === 'object') {
    const choice = r.choices[0] as Record<string, unknown>
    const message = choice.message
    if (message && typeof message === 'object' && 'content' in message && typeof message.content === 'string') {
      return message.content
    }
    if (typeof choice.text === 'string') return choice.text
  }
  if (r.result && typeof r.result === 'object') return normalizeWorkersOutput(r.result)
  return ''
}

function usageFrom(raw: unknown): { input: number | null; output: number | null } {
  if (!raw || typeof raw !== 'object') return { input: null, output: null }
  const usage = (raw as Record<string, unknown>).usage
  if (!usage || typeof usage !== 'object') return { input: null, output: null }
  const u = usage as Record<string, unknown>
  const input = typeof u.prompt_tokens === 'number' ? u.prompt_tokens : typeof u.input_tokens === 'number' ? u.input_tokens : null
  const output =
    typeof u.completion_tokens === 'number'
      ? u.completion_tokens
      : typeof u.output_tokens === 'number'
        ? u.output_tokens
        : null
  return { input, output }
}

export async function runChatCompletion(input: {
  model: ModelForRun
  system: string
  user: string
  maxTokens?: number
}): Promise<CompletionResult> {
  const timeout = Number(env.AI_REQUEST_TIMEOUT_MS) || 90_000
  const messages = [
    { role: 'system', content: input.system },
    { role: 'user', content: input.user },
  ]

  if (input.model.providerKind === 'workers-ai') {
    try {
      const raw = await ai.run(
        input.model.modelId,
        {
          messages,
          max_tokens: input.maxTokens ?? 4096,
          temperature: 0.1,
        },
        { signal: AbortSignal.timeout(timeout) },
      )
      const text = normalizeWorkersOutput(raw)
      if (!text.trim()) throw new Error('Le modèle n’a renvoyé aucun texte exploitable.')
      const usage = usageFrom(raw)
      return { text, inputTokens: usage.input, outputTokens: usage.output }
    } catch (error) {
      throw new AppError(
        'ai_failed',
        `L’appel au modèle a échoué : ${safeProviderError(error)}`,
        502,
      )
    }
  }

  if (!input.model.baseUrl || !input.model.apiKey) throw new AppError('ai_config', 'Fournisseur IA incomplet.', 500)
  const body = {
    model: input.model.modelId,
    messages,
    temperature: 0.1,
    max_tokens: input.maxTokens ?? 4096,
    response_format: { type: 'json_object' },
  }

  const call = async (withJsonMode: boolean) => {
    const response = await fetch(`${input.model.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.model.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(withJsonMode ? body : { ...body, response_format: undefined }),
      signal: AbortSignal.timeout(timeout),
    })
    return response
  }

  try {
    let response = await call(true)
    if (response.status === 400 || response.status === 422) response = await call(false)
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300)
      throw new AppError(
        'ai_provider_error',
        `Le fournisseur a répondu ${response.status}${detail ? ` : ${safeProviderError(detail)}` : ''}.`,
        502,
      )
    }
    const raw = (await response.json()) as unknown
    const r = raw as Record<string, unknown>
    const choices = Array.isArray(r.choices) ? r.choices : []
    const first = choices[0] as Record<string, unknown> | undefined
    const message = first?.message as Record<string, unknown> | undefined
    const text =
      message && typeof message.content === 'string'
        ? message.content
        : typeof first?.text === 'string'
          ? first.text
          : ''
    if (!text.trim()) throw new Error('Le fournisseur n’a renvoyé aucun texte exploitable.')
    const usage = usageFrom(raw)
    return { text, inputTokens: usage.input, outputTokens: usage.output }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('ai_failed', `L’appel au fournisseur a échoué : ${safeProviderError(error)}`, 502)
  }
}

export async function testProviderModel(providerId: string, modelId: string): Promise<{ ok: boolean; detail: string }> {
  const model = await resolveModelForRun(providerId, modelId)
  const result = await runChatCompletion({
    model,
    system: 'Tu réponds uniquement par le mot OK.',
    user: 'Réponds OK.',
    maxTokens: 16,
  })
  return { ok: result.text.trim().length > 0, detail: result.text.trim().slice(0, 120) }
}

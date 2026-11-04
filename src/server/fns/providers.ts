import { createServerFn } from '@tanstack/react-start'
import { env } from 'void/env'
import { z } from 'zod'
import { requireActor, requireAdmin } from '../session'
import { ensureModelsDetected, ensureWorkersAiProvider, listModels, listProviders } from '../ai/providers'
import {
  adminProviderData,
  createOpenAiProvider,
  deleteProvider,
  refreshModels,
  setProviderActive,
  testModel,
} from '../services/providers'

export const getModelOptionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requireActor()
  await ensureWorkersAiProvider()
  await ensureModelsDetected()
  const models = await listModels()
  const providers = await listProviders()
  return {
    models,
    providers: providers.filter((provider) => provider.isActive),
    defaultModelId: env.AI_DEFAULT_MODEL,
  }
})

export const getAdminProvidersFn = createServerFn({ method: 'GET' }).handler(async () =>
  adminProviderData(await requireAdmin()),
)

export const createOpenAiProviderFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      baseUrl: z.string().trim().url().max(500),
      apiKey: z.string().trim().min(8).max(500),
    }),
  )
  .handler(async ({ data }) => createOpenAiProvider(await requireAdmin(), data))

export const setProviderActiveFn = createServerFn({ method: 'POST' })
  .validator(z.object({ providerId: z.string().min(1).max(80), active: z.boolean() }))
  .handler(async ({ data }) => {
    await setProviderActive(await requireAdmin(), data.providerId, data.active)
    return { ok: true as const }
  })

export const deleteProviderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ providerId: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    await deleteProvider(await requireAdmin(), data.providerId)
    return { ok: true as const }
  })

export const refreshModelsFn = createServerFn({ method: 'POST' })
  .validator(z.object({ providerId: z.string().min(1).max(80).optional() }))
  .handler(async ({ data }) => {
    await refreshModels(await requireAdmin(), data.providerId)
    return { ok: true as const }
  })

export const testModelFn = createServerFn({ method: 'POST' })
  .validator(z.object({ providerId: z.string().min(1).max(80), modelId: z.string().min(1).max(200) }))
  .handler(async ({ data }) => testModel(await requireAdmin(), data.providerId, data.modelId))

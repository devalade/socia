import { desc, eq } from 'void/db'
import { aiModels, aiProviders } from '../../../db/schema'
import { invalid, notFound } from '../errors'
import { newId } from '../../lib/ids'
import { audit } from '../audit'
import { db } from '../db'
import type { Actor } from '../session'
import { refuse } from '../session'
import { sealApiKey } from '../vault'
import {
  detectModels,
  ensurePinnedModel,
  listProviders,
  testProviderModel,
  validateBaseUrl,
  WORKERS_AI_PROVIDER_ID,
} from '../ai/providers'

export async function createOpenAiProvider(
  actor: Actor,
  input: { name: string; baseUrl: string; apiKey: string },
): Promise<{ id: string; detectionError: string | null }> {
  refuse(actor, 'provider.manage')
  const name = input.name.trim()
  if (name.length < 2 || name.length > 80) throw invalid('Le nom du fournisseur doit contenir entre 2 et 80 caractères.')
  const baseUrl = validateBaseUrl(input.baseUrl)
  if (input.apiKey.trim().length < 8) throw invalid('La clé API est trop courte.')
  const sealed = await sealApiKey(input.apiKey)
  const id = newId('prv')
  await db.insert(aiProviders).values({
    id,
    kind: 'openai-compatible',
    name,
    baseUrl,
    apiKeyCiphertext: sealed.ciphertext,
    apiKeyIv: sealed.iv,
    apiKeyTag: sealed.tag,
    keyHint: sealed.hint,
    isActive: true,
    createdBy: actor.userId,
  })
  await audit(actor, {
    action: 'provider.create',
    entityType: 'provider',
    entityId: id,
    metadata: { kind: 'openai-compatible', baseUrl, keyHint: sealed.hint },
  })
  const detection = await detectModels(id)
  return { id, detectionError: detection.error }
}

export async function setProviderActive(actor: Actor, providerId: string, active: boolean): Promise<void> {
  refuse(actor, 'provider.manage')
  if (providerId === WORKERS_AI_PROVIDER_ID) throw invalid('Le fournisseur Workers AI est toujours actif.')
  const [provider] = await db.select().from(aiProviders).where(eq(aiProviders.id, providerId)).limit(1)
  if (!provider) throw notFound('Fournisseur IA')
  await db
    .update(aiProviders)
    .set({ isActive: active, updatedAt: new Date().toISOString() })
    .where(eq(aiProviders.id, providerId))
  await audit(actor, {
    action: active ? 'provider.enable' : 'provider.disable',
    entityType: 'provider',
    entityId: providerId,
  })
}

export async function deleteProvider(actor: Actor, providerId: string): Promise<void> {
  refuse(actor, 'provider.manage')
  if (providerId === WORKERS_AI_PROVIDER_ID) throw invalid('Le fournisseur Workers AI ne peut pas être supprimé.')
  await db.delete(aiModels).where(eq(aiModels.providerId, providerId))
  await db.delete(aiProviders).where(eq(aiProviders.id, providerId))
  await audit(actor, { action: 'provider.delete', entityType: 'provider', entityId: providerId })
}

export async function refreshModels(actor: Actor, providerId?: string): Promise<void> {
  refuse(actor, 'provider.manage')
  if (providerId) {
    await detectModels(providerId)
  } else {
    await listProviders()
    const providers = await db.select({ id: aiProviders.id }).from(aiProviders)
    for (const provider of providers) await detectModels(provider.id)
  }
  await audit(actor, {
    action: 'provider.detect_models',
    entityType: 'provider',
    entityId: providerId ?? 'all',
  })
}

export async function testModel(actor: Actor, providerId: string, modelId: string): Promise<{ ok: boolean; detail: string }> {
  refuse(actor, 'provider.manage')
  const result = await testProviderModel(providerId, modelId)
  await audit(actor, {
    action: 'provider.test_model',
    entityType: 'model',
    entityId: `${providerId}/${modelId}`,
    metadata: { ok: result.ok },
  })
  return result
}

export async function adminProviderData(actor: Actor): Promise<{
  providers: Awaited<ReturnType<typeof listProviders>>
  model: Awaited<ReturnType<typeof ensurePinnedModel>>
}> {
  refuse(actor, 'provider.manage')
  return { providers: await listProviders(), model: await ensurePinnedModel() }
}

export async function modelHistory(): Promise<{ id: string; providerId: string; modelId: string; label: string; isActive: boolean }[]> {
  return db
    .select({
      id: aiModels.id,
      providerId: aiModels.providerId,
      modelId: aiModels.modelId,
      label: aiModels.label,
      isActive: aiModels.isActive,
    })
    .from(aiModels)
    .orderBy(desc(aiModels.detectedAt))
    .limit(200)
}

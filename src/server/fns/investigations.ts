import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { SEVERITIES, VERDICTS } from '../../lib/alert'
import { requireActor } from '../session'
import {
  addComment,
  archiveInvestigation,
  createInvestigation,
  createManualQuery,
  getInvestigationDetail,
  importQueryResult,
  listInvestigations,
  reopenInvestigation,
  requireInvestigation,
  setConclusion,
  setQueryStatus,
  updateHypothesisStatus,
  updateInvestigation,
} from '../services/investigations'

const id = z.string().min(3).max(80)

export const createInvestigationFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      alertJson: z.string().min(2),
      title: z.string().trim().max(160).optional(),
      ruleDefinition: z.string().max(120_000).optional(),
      observations: z.string().max(20_000).optional(),
      priorSearches: z.string().max(250_000).optional(),
    }),
  )
  .handler(async ({ data }) => createInvestigation(await requireActor(), data))

export const getInvestigationFn = createServerFn({ method: 'GET' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => getInvestigationDetail(await requireActor(), data.id))

export const listInvestigationsFn = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      search: z.string().max(200).optional(),
      status: z.string().max(40).optional(),
      severity: z.string().max(40).optional(),
      verdict: z.string().max(40).optional(),
      page: z.number().int().min(1).max(10_000).optional(),
      pageSize: z.number().int().min(5).max(50).optional(),
    }),
  )
  .handler(async ({ data }) => listInvestigations(await requireActor(), data))

export const updateInvestigationFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id,
      title: z.string().trim().min(2).max(160),
      severity: z.enum(SEVERITIES),
      ruleDefinition: z.string().max(120_000).optional(),
      observations: z.string().max(20_000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await updateInvestigation(await requireActor(), data.id, data)
    return { ok: true as const }
  })

export const importQueryResultFn = createServerFn({ method: 'POST' })
  .validator(z.object({ investigationId: id, queryId: id, rawJson: z.string().min(1) }))
  .handler(async ({ data }) => importQueryResult(await requireActor(), data.investigationId, data.queryId, data.rawJson))

export const createManualQueryFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      investigationId: id,
      question: z.string().trim().min(3).max(1000),
      rationale: z.string().max(3000).default(''),
      kql: z.string().trim().min(3).max(5000),
      targetIndex: z.string().max(300).default('logs-*'),
      timeRange: z.string().max(200).default('Dernières 24 heures'),
    }),
  )
  .handler(async ({ data }) => createManualQuery(await requireActor(), data.investigationId, data))

export const setQueryStatusFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      investigationId: id,
      queryId: id,
      status: z.enum(['skipped', 'inconclusive']),
    }),
  )
  .handler(async ({ data }) => {
    await setQueryStatus(await requireActor(), data.investigationId, data.queryId, data.status)
    return { ok: true as const }
  })

export const updateHypothesisStatusFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      investigationId: id,
      hypothesisId: id,
      status: z.enum(['open', 'supported', 'refuted', 'inconclusive']),
    }),
  )
  .handler(async ({ data }) => {
    await updateHypothesisStatus(await requireActor(), data.investigationId, data.hypothesisId, data.status)
    return { ok: true as const }
  })

export const addCommentFn = createServerFn({ method: 'POST' })
  .validator(z.object({ investigationId: id, body: z.string().min(1).max(5000) }))
  .handler(async ({ data }) => addComment(await requireActor(), data.investigationId, data.body))

export const setConclusionFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      investigationId: id,
      verdict: z.enum(VERDICTS),
      confidence: z.number().int().min(0).max(100),
      justification: z.string().trim().min(20).max(5000),
    }),
  )
  .handler(async ({ data }) => {
    await setConclusion(await requireActor(), data.investigationId, data)
    return { ok: true as const }
  })

export const reopenInvestigationFn = createServerFn({ method: 'POST' })
  .validator(z.object({ investigationId: id }))
  .handler(async ({ data }) => {
    await reopenInvestigation(await requireActor(), data.investigationId)
    return { ok: true as const }
  })

export const archiveInvestigationFn = createServerFn({ method: 'POST' })
  .validator(z.object({ investigationId: id }))
  .handler(async ({ data }) => {
    await archiveInvestigation(await requireActor(), data.investigationId)
    return { ok: true as const }
  })

export const getInvestigationAccessFn = createServerFn({ method: 'GET' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    const row = await requireInvestigation(actor, data.id, 'view')
    return { canEdit: row.ownerId === actor.userId || actor.role === 'admin' }
  })

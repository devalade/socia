import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireActor } from '../session'
import { generateReport, getReport, recordExport } from '../services/reports'

export const generateReportFn = createServerFn({ method: 'POST' })
  .validator(z.object({ investigationId: z.string().min(3).max(80) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    const result = await generateReport(actor, data.investigationId)
    return { id: result.id, version: result.version }
  })

export const getReportFn = createServerFn({ method: 'GET' })
  .validator(z.object({ investigationId: z.string().min(3).max(80), version: z.number().int().min(1).optional() }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    return getReport(actor, data.investigationId, data.version)
  })

export const recordExportFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      investigationId: z.string().min(3).max(80),
      format: z.enum(['pdf', 'markdown']),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor()
    await recordExport(actor, data.investigationId, data.format)
    return { ok: true as const }
  })

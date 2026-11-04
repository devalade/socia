import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireActor } from '../session'
import { runAnalysis } from '../services/analysis'

export const runAnalysisFn = createServerFn({ method: 'POST' })
  .validator(z.object({ investigationId: z.string().min(3).max(80) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    return runAnalysis(actor, data.investigationId)
  })

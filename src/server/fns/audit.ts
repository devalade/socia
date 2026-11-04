import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAdmin } from '../session'
import { listAudit } from '../services/audit-log'

export const getAuditFn = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      search: z.string().max(200).optional(),
      page: z.number().int().min(1).max(10_000).optional(),
      pageSize: z.number().int().min(10).max(100).optional(),
    }),
  )
  .handler(async ({ data }) => listAudit(await requireAdmin(), data))

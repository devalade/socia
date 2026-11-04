import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ROLES } from '../../lib/roles'
import { requireAdmin } from '../session'
import { listMembers, updateMemberRole } from '../services/team'

export const getTeamFn = createServerFn({ method: 'GET' }).handler(async () => listMembers(await requireAdmin()))

export const updateMemberRoleFn = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string().min(1).max(80), role: z.enum(ROLES) }))
  .handler(async ({ data }) => {
    await updateMemberRole(await requireAdmin(), data.userId, data.role)
    return { ok: true as const }
  })

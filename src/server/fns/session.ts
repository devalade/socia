import { createServerFn } from '@tanstack/react-start'
import { getActor } from '../session'

export const getViewerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const actor = await getActor()
  return actor ? { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role } : null
})

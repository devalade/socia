import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'void/db'
import { profiles, user } from '../../db/schema'
import { can, type Action, type Role } from '../lib/roles'
import { db } from './db'
import { forbidden, signedOut } from './errors'
import { sessionFrom } from './auth'

export type Actor = {
  userId: string
  email: string
  name: string
  role: Role
  ip: string
}

export function clientIp(headers?: Headers): string {
  const h = headers ?? requestHeaders()
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
}

export function requestHeaders(): Headers {
  return getRequest().headers
}

export async function ensureProfile(input: { id: string; email: string; name: string }): Promise<Role> {
  const [existing] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.userId, input.id))
    .limit(1)
  if (existing) return normalizeRole(existing.role)

  const rows = await db.select({ id: user.id }).from(user).limit(2)
  const role: Role = rows.length <= 1 ? 'admin' : 'analyst'
  await db.insert(profiles).values({ userId: input.id, role }).onConflictDoNothing()
  return role
}

function normalizeRole(value: string): Role {
  if (value === 'admin' || value === 'viewer' || value === 'analyst') return value
  return 'analyst'
}

export async function getActor(headers?: Headers): Promise<Actor | null> {
  const h = headers ?? requestHeaders()
  const session = await sessionFrom(h)
  if (!session) return null
  const role = await ensureProfile({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role,
    ip: clientIp(h),
  }
}

export async function requireActor(headers?: Headers): Promise<Actor> {
  const actor = await getActor(headers)
  if (!actor) throw signedOut()
  return actor
}

export function requireAbility(actor: Actor, action: Action): void {
  if (!can(actor.role, action)) throw forbidden()
}

export function refuse(actor: Actor, action: Action): void {
  if (!can(actor.role, action)) throw forbidden()
}

export async function requireAnalyst(headers?: Headers): Promise<Actor> {
  const actor = await requireActor(headers)
  requireAbility(actor, 'investigation.create')
  return actor
}

export async function requireAdmin(headers?: Headers): Promise<Actor> {
  const actor = await requireActor(headers)
  if (actor.role !== 'admin') throw forbidden('Cette section est réservée aux administrateurs.')
  return actor
}

export async function getViewer(): Promise<{ actor: Actor; unread?: number } | null> {
  const actor = await getActor()
  return actor ? { actor } : null
}

/** Used by loaders that only need to know whether a session exists. */
export async function hasSession(headers?: Headers): Promise<boolean> {
  const h = headers ?? requestHeaders()
  const session = await sessionFrom(h)
  return Boolean(session)
}

export async function touchProfile(userId: string): Promise<void> {
  await db
    .update(profiles)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(profiles.userId, userId)))
}

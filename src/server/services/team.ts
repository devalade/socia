import { asc, eq } from 'void/db'
import { profiles, user } from '../../../db/schema'
import { isRole, ROLE_LABELS, type Role } from '../../lib/roles'
import { audit } from '../audit'
import { db } from '../db'
import { invalid, notFound } from '../errors'
import type { Actor } from '../session'
import { refuse } from '../session'

export type MemberView = {
  userId: string
  name: string
  email: string
  role: Role
  title: string
  createdAt: string
}

export async function listMembers(actor: Actor): Promise<MemberView[]> {
  refuse(actor, 'member.manage')
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: profiles.role,
      title: profiles.title,
      createdAt: profiles.createdAt,
    })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .orderBy(asc(user.name))
  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: isRole(row.role ?? '') ? (row.role as Role) : 'analyst',
    title: row.title ?? 'Analyste SOC',
    createdAt: row.createdAt ?? new Date().toISOString(),
  }))
}

export async function updateMemberRole(actor: Actor, userId: string, role: Role): Promise<void> {
  refuse(actor, 'member.manage')
  if (!isRole(role)) throw invalid('Rôle invalide.')
  const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  if (!target) throw notFound('Utilisateur')
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
  if (!profile) throw notFound('Profil')
  if (profile.role === 'admin' && role !== 'admin') {
    const admins = await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.role, 'admin'))
    if (admins.length <= 1) throw invalid('Impossible de retirer le dernier administrateur.')
  }
  await db.update(profiles).set({ role, updatedAt: new Date().toISOString() }).where(eq(profiles.userId, userId))
  await audit(actor, {
    action: 'member.role_change',
    entityType: 'user',
    entityId: userId,
    metadata: { from: profile.role, to: role, label: ROLE_LABELS[role] },
  })
}

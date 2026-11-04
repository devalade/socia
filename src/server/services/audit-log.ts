import { desc, like, or } from 'void/db'
import { auditLogs } from '../../../db/schema'
import { db } from '../db'
import type { Actor } from '../session'
import { refuse } from '../session'

export type AuditView = {
  id: string
  actorEmail: string
  action: string
  entityType: string
  entityId: string
  investigationId: string | null
  metadata: Record<string, string | number | boolean | null>
  ip: string
  createdAt: string
}

export async function listAudit(
  actor: Actor,
  options: { search?: string; page?: number; pageSize?: number } = {},
): Promise<{ rows: AuditView[]; total: number; page: number; pageSize: number }> {
  refuse(actor, 'audit.view')
  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.min(100, Math.max(10, options.pageSize ?? 30))
  const term = options.search?.trim() ? `%${options.search.trim()}%` : null
  const rows = await db
    .select()
    .from(auditLogs)
    .where(term ? or(like(auditLogs.actorEmail, term), like(auditLogs.action, term), like(auditLogs.entityId, term)) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  const all = await db.select({ id: auditLogs.id }).from(auditLogs)
  return {
    total: all.length,
    page,
    pageSize,
    rows: rows.map((row) => ({
      id: row.id,
      actorEmail: row.actorEmail,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      investigationId: row.investigationId,
      metadata: safeMetadata(row.metadataJson),
      ip: row.ip,
      createdAt: row.createdAt,
    })),
  }
}

function safeMetadata(value: string): Record<string, string | number | boolean | null> {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string | number | boolean | null> = {}
    for (const [key, item] of Object.entries(parsed)) {
      if (item === null || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        out[key] = item
      } else {
        out[key] = JSON.stringify(item).slice(0, 500)
      }
    }
    return out
  } catch {
    return {}
  }
}

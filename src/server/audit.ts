import { auditLogs } from '../../db/schema'
import { newId } from '../lib/ids'
import { db } from './db'
import type { Actor } from './session'

export type AuditInput = {
  action: string
  entityType?: string
  entityId?: string
  investigationId?: string
  metadata?: Record<string, string | number | boolean | null>
}

/**
 * Audit rows never contain alert bodies, query results or credentials. They name who did what,
 * to which id, and the small facts needed to reconstruct the action.
 */
export async function audit(actor: Actor | null, input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: newId('aud', 16),
      actorId: actor?.userId ?? null,
      actorEmail: actor?.email ?? '',
      action: input.action,
      entityType: input.entityType ?? '',
      entityId: input.entityId ?? '',
      investigationId: input.investigationId ?? null,
      metadataJson: JSON.stringify(input.metadata ?? {}),
      ip: actor?.ip ?? '',
    })
  } catch (error) {
    // An audit failure must be visible in logs, but it must not destroy the user's work.
    console.error('audit.write_failed', error)
  }
}

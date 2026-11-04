export const ROLES = ['admin', 'analyst', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  analyst: 'Analyste',
  viewer: 'Lecteur',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Tous les droits, gestion des modèles IA, de l’équipe et du journal d’audit.',
  analyst: 'Crée et conduit ses investigations, importe les résultats KQL, génère les rapports.',
  viewer: 'Consulte les investigations et les rapports, sans modifier ni relancer d’analyse.',
}

export type Action =
  | 'investigation.create'
  | 'investigation.view'
  | 'investigation.edit'
  | 'investigation.archive'
  | 'query.import'
  | 'comment.write'
  | 'analysis.run'
  | 'report.generate'
  | 'provider.manage'
  | 'member.manage'
  | 'audit.view'

const ABILITIES: Record<Role, readonly Action[]> = {
  admin: [
    'investigation.create',
    'investigation.view',
    'investigation.edit',
    'investigation.archive',
    'query.import',
    'comment.write',
    'analysis.run',
    'report.generate',
    'provider.manage',
    'member.manage',
    'audit.view',
  ],
  analyst: [
    'investigation.create',
    'investigation.view',
    'investigation.edit',
    'investigation.archive',
    'query.import',
    'comment.write',
    'analysis.run',
    'report.generate',
  ],
  viewer: ['investigation.view'],
}

export function can(role: Role, action: Action): boolean {
  return ABILITIES[role].includes(action)
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

/** Owners can edit their work; admins can edit anyone's. Viewers never write. */
export function canEditInvestigation(role: Role, userId: string, ownerId: string): boolean {
  if (!can(role, 'investigation.edit')) return false
  return role === 'admin' || userId === ownerId
}

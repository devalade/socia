export const INVESTIGATION_STATUSES = ['draft', 'analyzing', 'in_progress', 'concluded', 'archived'] as const
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number]

export const STATUS_LABELS: Record<InvestigationStatus, string> = {
  draft: 'Brouillon',
  analyzing: 'Analyse en cours',
  in_progress: 'En investigation',
  concluded: 'Clôturée',
  archived: 'Archivée',
}

export const QUERY_STATUSES = ['proposed', 'executed', 'skipped', 'inconclusive'] as const
export type QueryStatus = (typeof QUERY_STATUSES)[number]

export const QUERY_STATUS_LABELS: Record<QueryStatus, string> = {
  proposed: 'À exécuter',
  executed: 'Exécutée',
  skipped: 'Ignorée',
  inconclusive: 'Non concluante',
}

export const HYPOTHESIS_STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte',
  supported: 'Soutenue',
  refuted: 'Réfutée',
  inconclusive: 'Non concluante',
}

export function isInvestigationStatus(value: string): value is InvestigationStatus {
  return (INVESTIGATION_STATUSES as readonly string[]).includes(value)
}

import type { AlertSummary, Severity, Verdict } from './alert'
import { VERDICT_LABELS } from './alert'
import type { InvestigationAnalysis } from './ai'

export const NOT_PROVIDED = 'Non renseigné'

export type ReportQuery = {
  question: string
  rationale: string
  kql: string
  targetIndex: string
  timeRange: string
  status: string
  resultSummary: string | null
  resultRowCount: number | null
  importedAt: string | null
}

export type ReportHypothesis = {
  statement: string
  status: string
  confidence: number | null
  rationale: string
  evidence: string
}

export type ReportInput = {
  investigationId: string
  title: string
  severity: Severity
  analystName: string
  createdAt: string
  closedAt: string | null
  modelId: string
  providerName: string
  alertSummary: AlertSummary
  analysis: InvestigationAnalysis | null
  hypotheses: ReportHypothesis[]
  queries: ReportQuery[]
  verdict: Verdict
  confidence: number | null
  justification: string
  analystComments: string[]
}

export type ReportContent = {
  title: string
  generatedAt: string
  investigationId: string
  analystName: string
  scope: {
    ruleName: string
    ruleId: string
    severity: string
    alertTime: string
    host: string
    user: string
    process: string
    sourceIp: string
    destinationIp: string
    index: string
    documentId: string
    categories: string
  }
  executiveSummary: string
  ruleExplanation: string
  triggeringEvent: string
  contextReconstruction: string
  facts: string[]
  deductions: string[]
  hypotheses: ReportHypothesis[]
  missingInformation: string[]
  timeline: { timestamp: string; event: string; source: string; certainty: string }[]
  evidence: ReportQuery[]
  verdict: Verdict
  verdictLabel: string
  confidence: number | null
  justification: string
  recommendations: string[]
  limitations: string[]
  comments: string[]
  modelId: string
  providerName: string
  createdAt: string
  closedAt: string | null
}

const or = (value: string | null | undefined) => (value && value.trim() ? value.trim() : NOT_PROVIDED)

export function buildReportContent(input: ReportInput): ReportContent {
  const analysis = input.analysis
  const missing = new Set<string>(analysis?.missingInformation ?? [])
  if (!input.alertSummary.ruleName) missing.add('Nom de la règle')
  if (!input.alertSummary.timestamp) missing.add('Horodatage de l’alerte')
  if (!input.alertSummary.host) missing.add('Hôte concerné')
  if (!input.alertSummary.user) missing.add('Utilisateur concerné')
  for (const field of input.alertSummary.missing) missing.add(field)
  if (!input.justification.trim()) missing.add('Justification du verdict')
  if (input.confidence === null) missing.add('Niveau de confiance')

  const recommendations = buildRecommendations(input.verdict, analysis, Array.from(missing))
  const evidence = input.queries.filter((query) => query.status === 'executed')

  return {
    title: input.title,
    generatedAt: new Date().toISOString(),
    investigationId: input.investigationId,
    analystName: input.analystName,
    scope: {
      ruleName: or(input.alertSummary.ruleName),
      ruleId: or(input.alertSummary.ruleId),
      severity: or(input.severity),
      alertTime: or(input.alertSummary.timestamp),
      host: or(input.alertSummary.host),
      user: or(input.alertSummary.user),
      process: or(input.alertSummary.process),
      sourceIp: or(input.alertSummary.sourceIp),
      destinationIp: or(input.alertSummary.destinationIp),
      index: or(input.alertSummary.index),
      documentId: or(input.alertSummary.documentId),
      categories: or(input.alertSummary.eventCategories.join(', ')),
    },
    executiveSummary: or(analysis?.summary),
    ruleExplanation: or(analysis?.ruleExplanation),
    triggeringEvent: or(analysis?.triggeringEvent),
    contextReconstruction: or(analysis?.contextReconstruction),
    facts: analysis?.facts.length ? analysis.facts : [],
    deductions: analysis?.deductions.length ? analysis.deductions : [],
    hypotheses: input.hypotheses,
    missingInformation: Array.from(missing),
    timeline: analysis?.timeline ?? [],
    evidence,
    verdict: input.verdict,
    verdictLabel: VERDICT_LABELS[input.verdict],
    confidence: input.confidence,
    justification: or(input.justification),
    recommendations,
    limitations: [
      'SOCIA ne se connecte ni à Kibana ni à Elasticsearch et n’exécute aucune requête. Toutes les recherches ont été exécutées par l’analyste dans son SIEM.',
      'Les résultats vides, partiels ou non importés ne constituent pas une preuve d’absence d’activité.',
      'Le rapport ne reflète que les informations transmises à SOCIA à la date de génération.',
    ],
    comments: input.analystComments,
    modelId: input.modelId,
    providerName: input.providerName,
    createdAt: input.createdAt,
    closedAt: input.closedAt,
  }
}

function buildRecommendations(
  verdict: Verdict,
  analysis: InvestigationAnalysis | null,
  missing: string[],
): string[] {
  const out: string[] = []
  if (verdict === 'confirmed_incident') {
    out.push('Isoler ou contenir l’hôte concerné selon la procédure d’incident en vigueur.')
    out.push('Préserver les artefacts (mémoire, journaux, processus, connexions) avant toute remédiation.')
    out.push('Révoquer les sessions et identifiants exposés, puis vérifier les mouvements latéraux.')
  }
  if (verdict === 'false_positive') {
    out.push('Documenter la cause du faux positif et joindre la preuve utilisée.')
    out.push('Proposer un ajustement de la règle au propriétaire de la détection, sans le modifier directement.')
  }
  if (verdict === 'legitimate') {
    out.push('Documenter l’activité légitime et l’entité qui l’a autorisée.')
    out.push('Vérifier si une exception de détection est justifiée, avec validation du propriétaire de la règle.')
  }
  if (verdict === 'watch') {
    out.push('Définir un critère de reprise et une échéance de réévaluation.')
    out.push('Surveiller les entités concernées et rouvrir l’investigation si un nouvel événement apparaît.')
  }
  for (const item of missing.slice(0, 5)) out.push(`Obtenir l’information manquante : ${item}.`)
  for (const hypothesis of analysis?.hypotheses.filter((h) => h.status === 'open').slice(0, 3) ?? []) {
    out.push(`Tester l’hypothèse ouverte : ${hypothesis.statement}.`)
  }
  return Array.from(new Set(out)).slice(0, 12)
}

function h(level: number, text: string): string {
  return `${'#'.repeat(level)} ${text}`
}

function bullets(items: string[], fallback = 'Aucun élément fourni.'): string {
  if (items.length === 0) return `- ${fallback}`
  return items.map((item) => `- ${item}`).join('\n')
}

function value(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return NOT_PROVIDED
  return String(value)
}

export function reportToMarkdown(report: ReportContent): string {
  const timeline = report.timeline.length
    ? report.timeline
        .map(
          (event) =>
            `| ${value(event.timestamp)} | ${event.event} | ${value(event.source)} | ${event.certainty} |`,
        )
        .join('\n')
    : `| ${NOT_PROVIDED} | Aucun événement horodaté reconstruit. | ${NOT_PROVIDED} | ${NOT_PROVIDED} |`

  const evidence = report.evidence.length
    ? report.evidence
        .map(
          (query, index) => `### Requête ${index + 1} : ${query.question}

- **Statut** : ${query.status === 'executed' ? 'Exécutée par l’analyste' : query.status}
- **Index** : ${value(query.targetIndex)}
- **Période** : ${value(query.timeRange)}
- **Lignes retournées** : ${value(query.resultRowCount)}
- **Importée le** : ${value(query.importedAt)}
- **Justification** : ${value(query.rationale)}

\`\`\`kql
${query.kql}
\`\`\`

**Interprétation du résultat** : ${value(query.resultSummary)}`,
        )
        .join('\n\n---\n\n')
    : `Aucun résultat de recherche n’a été importé. ${NOT_PROVIDED}.`

  const hypotheses = report.hypotheses.length
    ? report.hypotheses
        .map(
          (hypothesis) =>
            `- **${hypothesis.statement}** · statut : ${hypothesis.status} · confiance : ${value(hypothesis.confidence)}%\n  - Raisonnement : ${value(hypothesis.rationale)}\n  - Preuves : ${value(hypothesis.evidence)}`,
        )
        .join('\n')
    : `- ${NOT_PROVIDED}.`

  return `${h(1, 'Rapport d’investigation SOC')}

**${report.title}**

| Champ | Valeur |
| --- | --- |
| Identifiant | ${report.investigationId} |
| Analyste | ${report.analystName} |
| Généré le | ${report.generatedAt} |
| Modèle | ${report.providerName} · ${report.modelId} |
| Ouvert le | ${report.createdAt} |
| Clôturé le | ${value(report.closedAt)} |

${h(2, 'Verdict')}

**${report.verdictLabel}** · confiance : ${report.confidence === null ? NOT_PROVIDED : `${report.confidence}%`}

${report.justification}

${h(2, 'Périmètre de l’alerte')}

| Champ | Valeur |
| --- | --- |
| Règle | ${report.scope.ruleName} |
| Identifiant de règle | ${report.scope.ruleId} |
| Sévérité | ${report.scope.severity} |
| Horodatage | ${report.scope.alertTime} |
| Hôte | ${report.scope.host} |
| Utilisateur | ${report.scope.user} |
| Processus | ${report.scope.process} |
| IP source | ${report.scope.sourceIp} |
| IP destination | ${report.scope.destinationIp} |
| Index | ${report.scope.index} |
| Document | ${report.scope.documentId} |

${h(2, 'Synthèse exécutive')}

${report.executiveSummary}

${h(2, 'Lecture de la règle et événement déclencheur')}

${h(3, 'Règle')}

${report.ruleExplanation}

${h(3, 'Événement déclencheur')}

${report.triggeringEvent}

${h(3, 'Contexte et limites')}

${report.contextReconstruction}

${h(2, 'Faits observés')}

${bullets(report.facts, 'Aucun fait explicitement extrait.')}

${h(2, 'Déductions')}

${bullets(report.deductions, 'Aucune déduction formulée.')}

${h(2, 'Hypothèses')}

${hypotheses}

${h(2, 'Chronologie')}

| Horodatage | Événement | Source | Nature |
| --- | --- | --- | --- |
${timeline}

${h(2, 'Preuves et recherches')}

${evidence}

${h(2, 'Informations manquantes')}

${bullets(report.missingInformation, `Aucune information manquante identifiée. ${NOT_PROVIDED} si l’analyste n’a pas documenté ce point.`)}

${h(2, 'Recommandations')}

${bullets(report.recommendations, 'Aucune recommandation particulière.')}

${h(2, 'Notes de l’analyste')}

${bullets(report.comments, 'Aucun commentaire.')}

${h(2, 'Limites')}

${bullets(report.limitations)}

${h(2, 'Traçabilité')}

- Généré par SOCIA le ${report.generatedAt}
- Modèle : ${report.providerName} · ${report.modelId}
- Version du prompt : soc-v1
- Aucune commande n’a été exécutée par SOCIA.
`
}

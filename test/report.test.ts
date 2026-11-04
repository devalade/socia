import { describe, expect, it } from 'vitest'
import { buildReportContent, reportToMarkdown, NOT_PROVIDED } from '../src/lib/report'

const summary = {
  ruleName: null,
  ruleId: null,
  ruleDescription: null,
  severity: 'high' as const,
  riskScore: 73,
  timestamp: null,
  host: 'WIN-FIN-042',
  user: null,
  process: 'powershell.exe',
  sourceIp: null,
  destinationIp: null,
  message: 'Encoded PowerShell',
  index: 'logs-windows.*',
  documentId: 'doc-1',
  eventCategories: ['process'],
  keyFields: [],
  missing: ['Nom de la règle', 'Horodatage de l’alerte'],
}

describe('report generation', () => {
  const content = buildReportContent({
    investigationId: 'inv_test',
    title: 'Alerte PowerShell',
    severity: 'high',
    analystName: 'Alade',
    createdAt: '2026-11-04T10:00:00.000Z',
    closedAt: '2026-11-04T11:00:00.000Z',
    modelId: 'model-test',
    providerName: 'Workers AI',
    alertSummary: summary,
    analysis: {
      summary: 'Synthèse.',
      ruleExplanation: 'Règle.',
      triggeringEvent: 'Événement.',
      contextReconstruction: 'Contexte.',
      timeline: [],
      facts: ['Fait A'],
      deductions: [],
      hypotheses: [],
      missingInformation: ['Hash du document'],
      investigationAxes: [],
      provisionalAssessment: { verdict: 'undetermined', confidence: 20, rationale: 'À confirmer.' },
    },
    hypotheses: [],
    queries: [
      {
        question: 'Quel est le hash ?',
        rationale: 'Identifier le document.',
        kql: 'file.name: *',
        targetIndex: 'logs-*',
        timeRange: '24 h',
        status: 'executed',
        resultSummary: '3 lignes retournées.',
        resultRowCount: 3,
        importedAt: '2026-11-04T10:30:00.000Z',
      },
    ],
    verdict: 'watch',
    confidence: 60,
    justification: 'Les preuves sont insuffisantes pour confirmer un incident.',
    analystComments: ['À revoir demain.'],
  })

  it('marks absent fields as Non renseigné', () => {
    expect(content.scope.ruleName).toBe(NOT_PROVIDED)
    expect(content.scope.user).toBe(NOT_PROVIDED)
    expect(content.missingInformation).toContain('Nom de la règle')
  })

  it('keeps the imported evidence and the human verdict', () => {
    expect(content.evidence).toHaveLength(1)
    expect(content.evidence[0]?.resultRowCount).toBe(3)
    expect(content.verdict).toBe('watch')
    expect(content.justification).toContain('preuves')
  })

  it('renders Markdown without em dashes and with explicit limitations', () => {
    const markdown = reportToMarkdown(content)
    expect(markdown).toContain('Preuves et recherches')
    expect(markdown).toContain('Quel est le hash ?')
    expect(markdown).toContain(NOT_PROVIDED)
    expect(markdown).toContain('n’exécute aucune requête')
    expect(markdown).not.toContain('—')
  })
})

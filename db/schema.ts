import { sql } from 'void/db'
import { index, integer, sqliteTable, text, uniqueIndex } from 'void/schema-d1'

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

/* ------------------------------------------------------------------------------------------------
 * Better Auth core tables. Better Auth reads and writes these; app code reads `user` only.
 * Timestamps are integer milliseconds because the adapter expects Date objects.
 * ---------------------------------------------------------------------------------------------- */

const authTimestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
}

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  ...authTimestamps,
})

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...authTimestamps,
  },
  (table) => [index('session_user_idx').on(table.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    ...authTimestamps,
  },
  (table) => [index('account_user_idx').on(table.userId)],
)

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ...authTimestamps,
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

// Sign-in rate limits live in D1, not memory: one Worker isolate cannot see another's counters.
export const rateLimit = sqliteTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: integer('last_request').notNull(),
})

/* ------------------------------------------------------------------------------------------------
 * SOCIA domain.
 * Every table is scoped by investigation; access always goes through requireInvestigation().
 * ---------------------------------------------------------------------------------------------- */

export const profiles = sqliteTable(
  'profiles',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('analyst'), // admin | analyst | viewer
    title: text('title').notNull().default('Analyste SOC'),
    createdAt: text('created_at').notNull().default(nowIso),
    updatedAt: text('updated_at').notNull().default(nowIso),
  },
  (table) => [index('profiles_role_idx').on(table.role)],
)

export const investigations = sqliteTable(
  'investigations',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'), // draft | analyzing | in_progress | concluded | archived
    severity: text('severity').notNull().default('unknown'), // critical | high | medium | low | info | unknown
    verdict: text('verdict'), // false_positive | legitimate | confirmed_incident | watch
    confidence: integer('confidence'),
    conclusionJustification: text('conclusion_justification').notNull().default(''),
    modelId: text('model_id').notNull(),
    providerId: text('provider_id').notNull().default('workers-ai'),
    alertRaw: text('alert_raw').notNull(),
    alertSummaryJson: text('alert_summary_json').notNull(),
    ruleDefinition: text('rule_definition').notNull().default(''),
    observations: text('observations').notNull().default(''),
    priorSearches: text('prior_searches').notNull().default(''),
    currentAnalysisId: text('current_analysis_id'),
    reportId: text('report_id'),
    createdAt: text('created_at').notNull().default(nowIso),
    updatedAt: text('updated_at').notNull().default(nowIso),
    lastActivityAt: text('last_activity_at').notNull().default(nowIso),
    closedAt: text('closed_at'),
  },
  (table) => [
    index('investigations_owner_idx').on(table.ownerId, table.updatedAt),
    index('investigations_status_idx').on(table.status, table.updatedAt),
    index('investigations_severity_idx').on(table.severity),
    index('investigations_updated_idx').on(table.updatedAt),
  ],
)

export const analysisRuns = sqliteTable(
  'analysis_runs',
  {
    id: text('id').primaryKey(),
    investigationId: text('investigation_id')
      .notNull()
      .references(() => investigations.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // initial | reanalysis
    status: text('status').notNull().default('running'), // running | completed | failed
    modelId: text('model_id').notNull(),
    providerId: text('provider_id').notNull(),
    promptVersion: text('prompt_version').notNull().default('soc-v1'),
    contentJson: text('content_json'),
    rawResponse: text('raw_response'),
    inputContextJson: text('input_context_json'),
    error: text('error'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    durationMs: integer('duration_ms'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: text('created_at').notNull().default(nowIso),
    completedAt: text('completed_at'),
  },
  (table) => [
    index('analysis_runs_investigation_idx').on(table.investigationId, table.createdAt),
    index('analysis_runs_status_idx').on(table.status),
  ],
)

export const hypotheses = sqliteTable(
  'hypotheses',
  {
    id: text('id').primaryKey(),
    investigationId: text('investigation_id')
      .notNull()
      .references(() => investigations.id, { onDelete: 'cascade' }),
    analysisRunId: text('analysis_run_id'),
    statement: text('statement').notNull(),
    status: text('status').notNull().default('open'), // open | supported | refuted | inconclusive
    confidence: integer('confidence'),
    rationale: text('rationale').notNull().default(''),
    evidence: text('evidence').notNull().default(''),
    isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default(nowIso),
    updatedAt: text('updated_at').notNull().default(nowIso),
  },
  (table) => [
    index('hypotheses_investigation_idx').on(table.investigationId, table.createdAt),
    index('hypotheses_status_idx').on(table.status),
  ],
)

export const queries = sqliteTable(
  'queries',
  {
    id: text('id').primaryKey(),
    investigationId: text('investigation_id')
      .notNull()
      .references(() => investigations.id, { onDelete: 'cascade' }),
    analysisRunId: text('analysis_run_id'),
    question: text('question').notNull(),
    rationale: text('rationale').notNull().default(''),
    kql: text('kql').notNull(),
    targetIndex: text('target_index').notNull().default('logs-*'),
    timeRange: text('time_range').notNull().default('last 24 hours'),
    priority: text('priority').notNull().default('medium'), // high | medium | low
    status: text('status').notNull().default('proposed'), // proposed | executed | skipped | inconclusive
    resultRaw: text('result_raw'),
    resultMetaJson: text('result_meta_json'),
    resultSummary: text('result_summary'),
    resultRowCount: integer('result_row_count'),
    importedBy: text('imported_by'),
    importedAt: text('imported_at'),
    createdAt: text('created_at').notNull().default(nowIso),
    updatedAt: text('updated_at').notNull().default(nowIso),
  },
  (table) => [
    index('queries_investigation_idx').on(table.investigationId, table.createdAt),
    index('queries_status_idx').on(table.status),
  ],
)

export const timelineEvents = sqliteTable(
  'timeline_events',
  {
    id: text('id').primaryKey(),
    investigationId: text('investigation_id')
      .notNull()
      .references(() => investigations.id, { onDelete: 'cascade' }),
    analysisRunId: text('analysis_run_id'),
    timestampText: text('timestamp_text').notNull().default(''),
    event: text('event').notNull(),
    source: text('source').notNull().default(''),
    certainty: text('certainty').notNull().default('fact'), // fact | deduction | hypothesis
    createdAt: text('created_at').notNull().default(nowIso),
  },
  (table) => [index('timeline_investigation_idx').on(table.investigationId, table.createdAt)],
)

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    investigationId: text('investigation_id')
      .notNull()
      .references(() => investigations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: text('created_at').notNull().default(nowIso),
  },
  (table) => [index('comments_investigation_idx').on(table.investigationId, table.createdAt)],
)

export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    investigationId: text('investigation_id')
      .notNull()
      .references(() => investigations.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    verdict: text('verdict').notNull(),
    confidence: integer('confidence'),
    contentJson: text('content_json').notNull(),
    markdown: text('markdown').notNull(),
    generatedBy: text('generated_by')
      .notNull()
      .references(() => user.id),
    modelId: text('model_id').notNull(),
    createdAt: text('created_at').notNull().default(nowIso),
  },
  (table) => [
    index('reports_investigation_idx').on(table.investigationId, table.version),
    uniqueIndex('reports_investigation_version_idx').on(table.investigationId, table.version),
  ],
)

export const aiProviders = sqliteTable(
  'ai_providers',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(), // workers-ai | openai-compatible
    name: text('name').notNull(),
    baseUrl: text('base_url'),
    apiKeyCiphertext: text('api_key_ciphertext'),
    apiKeyIv: text('api_key_iv'),
    apiKeyTag: text('api_key_tag'),
    keyHint: text('key_hint'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    lastCheckedAt: text('last_checked_at'),
    lastError: text('last_error'),
    createdBy: text('created_by'),
    createdAt: text('created_at').notNull().default(nowIso),
    updatedAt: text('updated_at').notNull().default(nowIso),
  },
  (table) => [index('ai_providers_kind_idx').on(table.kind, table.isActive)],
)

export const aiModels = sqliteTable(
  'ai_models',
  {
    id: text('id').primaryKey(),
    providerId: text('provider_id').notNull(),
    modelId: text('model_id').notNull(),
    label: text('label').notNull(),
    task: text('task').notNull().default('Text Generation'),
    isRecommended: integer('is_recommended', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    detectedAt: text('detected_at').notNull().default(nowIso),
    metadataJson: text('metadata_json').notNull().default('{}'),
  },
  (table) => [
    uniqueIndex('ai_models_provider_model_idx').on(table.providerId, table.modelId),
    index('ai_models_provider_idx').on(table.providerId, table.isActive),
  ],
)

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id'),
    actorEmail: text('actor_email').notNull().default(''),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull().default(''),
    entityId: text('entity_id').notNull().default(''),
    investigationId: text('investigation_id'),
    metadataJson: text('metadata_json').notNull().default('{}'),
    ip: text('ip').notNull().default(''),
    createdAt: text('created_at').notNull().default(nowIso),
  },
  (table) => [
    index('audit_logs_created_idx').on(table.createdAt),
    index('audit_logs_actor_idx').on(table.actorId, table.createdAt),
    index('audit_logs_investigation_idx').on(table.investigationId, table.createdAt),
  ],
)

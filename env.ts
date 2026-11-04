import { defineEnv, oneOf, string, url } from 'void/env'

export default defineEnv({
  APP_ENV: oneOf(['local', 'preview', 'production']).default('local'),
  BETTER_AUTH_URL: url().default('http://localhost:3000'),
  BETTER_AUTH_SECRET: string(),
  AI_REQUEST_TIMEOUT_MS: string().default('90000'),
  OLLAMA_BASE_URL: string().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: string().default(''),
  AI_KEY_ENCRYPTION_KEY: string().optional(),
  SOCIA_REPORT_FOOTER: string().default('SOCIA · Triage et investigation SOC'),
})

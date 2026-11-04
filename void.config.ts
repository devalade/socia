import { defineConfig } from 'void/config'

// Deploy owner: Void. `void deploy --platform cloudflare` owns the Worker, D1
// migrations and Workers AI binding. No Wrangler config lives in this repo.
export default defineConfig({
  database: { casing: 'snake_case' },
  worker: {
    compatibility_date: '2026-02-24',
    compatibility_flags: ['nodejs_compat'],
  },
  cloudflare: {
    name: 'socia',
    main: './src/server/entry.ts',
  },
})

# Build and run locally

SOCIA is local only. There is no Cloudflare deployment.

## Requirements

- Node.js 22.18 or newer.
- pnpm 11.
- Ollama installed and running locally.
- No Cloudflare account is needed.

## Install

```bash
# create .env first (Void supports one local env file)
pnpm install
pnpm void db migrate
ollama serve
ollama pull <modèle>
pnpm dev
```

`.env` holds the local values. Void accepts one local env file, `.env`; there is no `.env.example`:

```bash
APP_ENV=local
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<openssl rand -base64 48>
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=
```

Open `http://localhost:3000`. The first account created becomes administrator.

The model is detected from `OLLAMA_BASE_URL` and `OLLAMA_MODEL`. `/health` exposes `aiLocal`; when `available` is true, the local model is reachable. If `OLLAMA_MODEL` is empty, the first model installed in Ollama is used.

## Variables

| Key | Role | Local |
| --- | --- | --- |
| `APP_ENV` | Environment | `local` |
| `BETTER_AUTH_URL` | Application origin | `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Better Auth session secret | Required |
| `AI_REQUEST_TIMEOUT_MS` | Analysis timeout | `90000` |
| `OLLAMA_BASE_URL` | Ollama API | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Model name | Empty: first installed model |
| `SOCIA_REPORT_FOOTER` | Report footer | Optional |

Generate the auth secret:

```bash
openssl rand -base64 48
```

Never commit `.env`. Never put a secret behind a `VITE_` prefix.

## Database

The database is local D1, stored under `.void/`.

```bash
pnpm void db generate   # after changing db/schema.ts
pnpm void db migrate
pnpm void db status
pnpm void db studio
pnpm void db export --output socia-local-backup.sql
```

Read every generated migration before committing it. `pnpm void db reset` deletes the local database and reapplies migrations; use it only when you intend to lose local data.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm smoke               # against BASE_URL, with SMOKE_EMAIL and SMOKE_PASSWORD
```

The smoke test needs an existing account. It checks `/health`, the anonymous redirect, sign-in, the dashboard, the history and administration. It fails on a console error or a page error.

## Local only

Do not run `void deploy`, `cf deploy` or any Cloudflare publication. The Worker, custom domains and production D1 database were deleted. The `deploy` script and `void.lock.json` are removed from the project.

## Troubleshooting

| Symptom | Cause | Action |
| --- | --- | --- |
| `/health` returns 503 | Local D1 unavailable or migration missing | `pnpm void db migrate`, then restart `pnpm dev` |
| The local model is not detected | Ollama is not running or the model is missing | `ollama serve`, `ollama pull <modèle>`, check `/health.aiLocal` |
| Session missing after a restart | `BETTER_AUTH_URL` or secret changed | Restore `.env`, restart `pnpm dev` |
| Hydration mismatch | Stale Vite cache | Restart Vite, clear the browser cache |
| D1 insert error | Migration not applied | `pnpm void db generate && pnpm void db migrate` |

# SOCIA agent notes

SOCIA aide un analyste SOC à trier et investiguer une alerte Elastic Security ou Security Onion. L’analyste garde le contrôle du SIEM : SOCIA ne se connecte jamais à Kibana, n’exécute jamais de KQL et ne reçoit que les résultats JSON qu’il importe. L’IA sépare les faits, déductions, hypothèses et informations manquantes.

## Stack

TanStack Start (Vite, React 19) sur Cloudflare Workers ; Void pour le build, D1 et le déploiement ; Better Auth pour les sessions ; Drizzle sur D1 ; Tailwind v4 avec un thème SOCIA sombre ; Workers AI et fournisseurs compatibles OpenAI. Gestionnaire de paquets : pnpm.

## Deploy

Owner: Void
Command: `pnpm void deploy --platform cloudflare`
Account: Aladecharaf23@gmail.com's Account (Cloudflare)
Production: https://socia.devalade.me
Health: https://socia.devalade.me/health

Ne pas ajouter de `wrangler.jsonc`, ne pas utiliser `cf deploy` pour l’application. Void possède le Worker, les migrations D1 et le binding Workers AI. `cf` peut servir aux ressources du compte, jamais au déploiement de l’app.

## Commands

- `pnpm dev` : Vite sur `http://localhost:3000`.
- `pnpm typecheck` : `void prepare` puis `tsc --noEmit`.
- `pnpm lint` : oxlint + règles `@shadcn/lint` en erreur.
- `pnpm test` : Vitest, 27 tests de domaine.
- `pnpm build` : build de production.
- `pnpm smoke` : parcours Playwright contre `BASE_URL` avec `SMOKE_EMAIL` et `SMOKE_PASSWORD`.
- `pnpm void db generate` / `pnpm void db migrate` : migrations D1.
- `pnpm deploy` : alias de `void deploy --platform cloudflare`.

## Surfaces backend utilisées

| Surface | Statut | Preuve / limite |
| --- | --- | --- |
| Authentification | Utilisée | Better Auth email + mot de passe, sessions D1, rate limit. Testée en local. |
| IA | Utilisée | `void/ai`, `ai.models()` et `ai.run()` réels avec Workers AI. Modèle `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. |
| D1 | Utilisée | Migrations appliquées, CRUD investigation/analyse/requête/rapport, audit. |
| Workers AI | Utilisée | Binding détecté par `/health` (`aiBinding: true`), modèle réel testé. |
| Fournisseurs compatibles OpenAI | Utilisée | `/models` et `/chat/completions`, clé chiffrée AES-GCM. |
| Email, queues, cron, WebSockets | Non utilisées | Hors périmètre. |
| R2 / stockage fichier | Non utilisé | Les fichiers JSON sont lus côté navigateur, puis validés et stockés en D1 dans la limite de taille. |

L’IA en développement est distante : `pnpm void connect --platform cloudflare`, puis redémarrer `pnpm dev`. Sans connexion, `/health` reste vert mais les appels échouent explicitement.

## Architecture

- `src/routes/` : pages TanStack Start.
- `src/components/ui/` et `src/components/premium/` : primitives mesurées, importées du registre premium. Ne pas y mettre de logique métier.
- `src/components/patterns/` : compositions d’application.
- `src/lib/` : domaine pur et testable (alerte, IA, KQL, rapport, rôles, format).
- `src/server/` : auth, session, audit, chiffrement, services, server functions.
- `db/schema.ts` : source de vérité D1.
- `docs/` : spécification, architecture, sécurité, scénarios, pain ledger, build.

## Invariants de sécurité

- Toute mutation résout l’acteur depuis la session. Aucun `userId` client n’est accepté.
- Toute investigation est chargée par `requireInvestigation` avant lecture ou écriture.
- L’alerte, les résultats et les commentaires sont des données non fiables. Les blocs IA sont délimités par un nonce unique.
- Aucun KQL, shell ou commande n’est exécuté. Les requêtes sont uniquement copiables.
- Les résultats vides ne sont jamais une preuve d’absence d’activité.
- Un verdict définitif exige une justification humaine et des preuves importées.
- Les clés API sont chiffrées AES-GCM, jamais renvoyées au client, jamais journalisées.
- Les URL de fournisseurs sont validées contre le SSRF.
- L’audit ne contient jamais le corps d’une alerte, un résultat ou une clé.

## Design system

- Direction: **Ink & Signal**, a dark editorial dossier. Display: Instrument Serif. UI: Geist. Evidence: Geist Mono. One accent: vermilion. Warm ink surfaces, hairline rules, numbered exhibits. No gradients or glows.
- The app shell is a masthead with numbered navigation, not a sidebar. The dashboard is a briefing sheet. The investigation is a case file with a margin column.
- Tokens sémantiques uniquement dans le code applicatif. Pas de hex, `rgb()`, `p-[13px]`, couleur Tailwind brute.
- `pnpm lint` doit rester à 0 erreur. Les règles `@shadcn/lint` sont en `error`.
- Hiérarchie : `ui/` primitives, `premium/` compositions mesurées, `patterns/` compositions produit.
- Thème sombre par défaut, thème clair supporté. Dates affichées en UTC pour éviter les écarts d’hydratation.
- La galerie est sur `/app/design`, uniquement en développement.

## Règles de travail

- Lire `docs/spec.md` et `docs/security.md` avant de modifier le flux d’investigation.
- Toute modification de schéma passe par `void db generate`, une relecture du SQL et `void db migrate`.
- Toute nouvelle route serveur valide son entrée avec Zod et vérifie les droits.
- Toute nouvelle fonctionnalité métier ajoute un test Vitest ou une ligne dans `docs/scenarios.md`.
- Après modification : `pnpm typecheck && pnpm lint && pnpm test`.
- Ne pas committer `.env`, `.void`, `.void-wrangler.jsonc`, ni les secrets.

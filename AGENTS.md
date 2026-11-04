# SOCIA agent notes

SOCIA aide un analyste SOC à trier et investiguer une alerte Elastic Security ou Security Onion. L’analyste garde le contrôle du SIEM : SOCIA ne se connecte jamais à Kibana, n’exécute jamais de KQL et ne reçoit que les résultats JSON qu’il importe. L’IA sépare les faits, déductions, hypothèses et informations manquantes.

## Stack

TanStack Start (Vite, React 19) sur le runtime local workerd via Void ; Better Auth pour les sessions ; Drizzle sur D1 local ; Tailwind v4 avec un thème SOCIA sombre ; modèle local Ollama via l’API OpenAI-compatible. Gestionnaire de paquets : pnpm.

## Local only

This project is not deployed. Do not run `void deploy`, `cf deploy` or any Cloudflare publication. Run `pnpm dev` with the local D1 database and Ollama. The Cloudflare Worker, custom domains and production D1 database were deleted; a JSON backup of the old D1 data exists outside the repository. The `deploy` script and `void.lock.json` were removed.

## Commands

- `pnpm dev` : Vite sur `http://localhost:3000`.
- `pnpm typecheck` : `void prepare` puis `tsc --noEmit`.
- `pnpm lint` : oxlint + règles `@shadcn/lint` en erreur.
- `pnpm test` : Vitest, 27 tests de domaine.
- `pnpm build` : build local.
- `pnpm smoke` : parcours Playwright contre `BASE_URL` avec `SMOKE_EMAIL` et `SMOKE_PASSWORD`.
- `pnpm void db generate` / `pnpm void db migrate` : migrations D1.

## Surfaces backend utilisées

| Surface | Statut | Preuve / limite |
| --- | --- | --- |
| Authentification | Utilisée | Better Auth email + mot de passe, sessions D1, rate limit. Testée en local. |
| IA | Utilisée | Ollama local, modèle unique détecté via `/api/tags`, chat via `/v1/chat/completions`. |
| D1 | Utilisée | Migrations appliquées, CRUD investigation/analyse/requête/rapport, audit. |
| Workers AI | Non utilisée | Le binding reste déclaré mais aucun appel IA ne passe par Workers AI. |
| Fournisseurs compatibles OpenAI | Utilisée (Ollama) | Ollama expose `/v1/chat/completions`; aucune clé distante, aucun catalogue ni sélecteur. |
| Email, queues, cron, WebSockets | Non utilisées | Hors périmètre. |
| R2 / stockage fichier | Non utilisé | Les fichiers JSON sont lus côté navigateur, puis validés et stockés en D1 dans la limite de taille. |

L’IA locale utilise Ollama : `ollama serve`, `ollama pull <modèle>`, puis `pnpm dev`. Renseignez `OLLAMA_MODEL` si plusieurs modèles sont installés. `/health` expose `aiLocal` pour vérifier la détection.

## Architecture

- `src/routes/` : pages TanStack Start.
- `src/components/ui/` et `src/components/premium/` : primitives mesurées, importées du registre premium. Ne pas y mettre de logique métier.
- `src/components/patterns/` : compositions d’application.
- `src/lib/` : domaine pur et testable (alerte, IA, KQL, rapport, rôles, format).
- `src/server/` : auth, session, audit, chiffrement, services, server functions.
- `src/server/ai/local.ts` : détection Ollama et résolution du modèle local unique.
- `db/schema.ts` : source de vérité D1.
- `docs/` : spécification, architecture, sécurité, scénarios, pain ledger, build.

## Invariants de sécurité

- Toute mutation résout l’acteur depuis la session. Aucun `userId` client n’est accepté.
- Toute investigation est chargée par `requireInvestigation` avant lecture ou écriture.
- L’alerte, les résultats et les commentaires sont des données non fiables. Les blocs IA sont délimités par un nonce unique.
- Aucun KQL, shell ou commande n’est exécuté. Les requêtes sont uniquement copiables.
- Pour chaque règle, le prompt demande toutes les requêtes KQL utiles à l’investigation en une passe (8 à 24 axes distincts), pas une requête par cycle.
- Les résultats vides ne sont jamais une preuve d’absence d’activité.
- Un verdict définitif exige une justification humaine et des preuves importées.
- Les clés API sont chiffrées AES-GCM, jamais renvoyées au client, jamais journalisées.
- Les URL de fournisseurs sont validées contre le SSRF.
- L’audit ne contient jamais le corps d’une alerte, un résultat ou une clé.

## Design system

- Modèle unique local : Ollama (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`). Détection via `/api/tags`, premier modèle installé si `OLLAMA_MODEL` est vide. Aucun catalogue ni sélecteur de modèle n’est exposé.
- Direction: **Signal Room**. The premium-react measurements applied to the SOCIA security console. Geist for every UI and display surface. Geist Mono only for KQL, ids, timestamps and raw JSON. Paper-white primary actions in dark, ink primary in light. Vermilion is a signal colour: focus, active navigation, critical data, charts and the brand mark. Warm ink surfaces, one hairline ring, no glows, no serif, no numbered masthead.
- Shell: 256px sidebar, 56px header, 1200px content max. The dashboard is a measured KPI, trend and table surface. The investigation is a tabbed case workspace with a context rail. Authentication is a centred 400px column.
- Controls: 36px product, 40px auth and marketing, 44px primary on phones. Labels 13/500, body 14, meta 12. No 9px uppercase mono labels. Control radii 8px, surfaces 12 to 16px.
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

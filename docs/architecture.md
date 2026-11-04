# Architecture

## Vue d’ensemble

```text
Navigateur
  │ HTTPS, cookie Better Auth
  ▼
TanStack Start (React 19, Vite, SSR)
  │ createServerFn : validation Zod, session, rôle
  ▼
Services serveur
  ├── investigations, analyses, requêtes, rapports, audit
  ├── modèle local Ollama (API OpenAI-compatible)
  └── D1 via Drizzle
        │
        └── Ollama local (127.0.0.1:11434 ou OLLAMA_BASE_URL)
```

Le déploiement est possédé par Void. `void deploy --platform cloudflare` construit le Worker, applique les migrations D1 et publie l’application. Le Worker ne peut pas joindre un Ollama sur `127.0.0.1`; l’IA locale tourne avec l’application en local, ou avec une URL Ollama accessible. Aucun `wrangler.jsonc` n’est présent.

## Stack

| Couche | Choix |
| --- | --- |
| Framework | TanStack Start 1.169, React 19, Vite 8 |
| Runtime | Cloudflare Workers |
| SDK et déploiement | Void 1.2.1 |
| Base | Cloudflare D1, Drizzle ORM |
| Auth | Better Auth 1.7, email + mot de passe, sessions D1 |
| IA | Ollama local : `/api/tags` et `/v1/chat/completions` |
| UI | Tailwind v4, shadcn/ui, composants premium mesurés |
| Tests | Vitest pour le domaine, Playwright pour le smoke |

## Entrée Worker

`src/server/entry.ts` est l’entrée personnalisée déclarée dans `void.config.ts` (`cloudflare.main`).

1. Valide l’environnement Void au démarrage.
2. Route `/api/auth/*` vers Better Auth.
3. Répond à `/health` avec l’état D1 et du binding IA.
4. Délègue le reste à TanStack Start.

## Flux d’une analyse

1. `runAnalysisFn` valide l’identifiant et résout l’acteur depuis la session.
2. `requireInvestigation` vérifie le droit de lecture puis d’écriture (propriétaire ou admin).
3. Le modèle local est résolu depuis `OLLAMA_BASE_URL` et `OLLAMA_MODEL`; le premier modèle installé est utilisé si `OLLAMA_MODEL` est vide.
4. `buildSystemPrompt` et `buildUserPrompt` assemblent le contexte :
   - alerte brute, champs extraits, champs absents ;
   - règle, observations, recherches antérieures ;
   - analyse précédente ;
   - requêtes exécutées et résultats importés.
5. Chaque bloc non fiable est enveloppé dans un tag à nonce unique.
6. L’appel IA est borné par un timeout (`AI_REQUEST_TIMEOUT_MS`).
7. La réponse est extraite, parsée et validée par `analysisSchema` (Zod).
8. Une appréciation définitive est rétrogradée en « non déterminée » s’il n’existe aucun résultat importé.
9. Le run est enregistré avec son JSON, ses tokens, sa durée et une éventuelle erreur.
10. Les hypothèses courantes sont marquées non courantes, les nouvelles sont insérées.
11. La chronologie dérivée est remplacée.
12. Toutes les requêtes KQL utiles sont demandées en une passe, filtrées (pas de SPL/SQL/pipeline), dédupliquées puis ajoutées.
13. L’investigation pointe vers le nouveau run et passe en investigation.

Une erreur d’appel ou de parsing laisse un run `failed`, remet le statut précédent et n’efface aucune donnée.

## Versionnement

- **Analyses** : chaque run conserve son JSON et sa réponse brute (tronquée à 200 000 caractères).
- **Hypothèses** : `is_current = true` pour le jeu actif ; les anciennes restent en base.
- **Chronologie** : vue dérivée de la dernière analyse ; l’historique reste dans les runs.
- **Requêtes** : jamais supprimées lors d’une réanalyse ; les doublons KQL sont évités.
- **Rapports** : numéro de version croissant et unique par investigation.

## Génération du rapport

Le rapport n’est pas une nouvelle génération IA. Il est construit de façon déterministe par `buildReportContent` à partir de :

- l’alerte et son résumé ;
- la dernière analyse ;
- les hypothèses actives ;
- les requêtes exécutées et leurs résumés ;
- les commentaires ;
- le verdict, la confiance et la justification humaine.

Avantages : structure stable, absence d’hallucination dans le rapport, champs manquants explicites, export Markdown identique à l’affichage. Le PDF utilise l’impression navigateur et une feuille `@media print`.

## Modèle local

### Ollama

- Le modèle est détecté via `OLLAMA_BASE_URL` (par défaut `http://127.0.0.1:11434`) et `/api/tags`.
- `OLLAMA_MODEL` fixe le modèle ; sinon le premier modèle installé est utilisé.
- L’appel passe par l’API OpenAI-compatible de Ollama, `POST /v1/chat/completions`.
- Aucun catalogue ni sélecteur de modèle n’est exposé.
- Les requêtes KQL sont demandées en une passe (8 à 24 axes), puis filtrées et dédupliquées.
- Un Worker Cloudflare ne peut pas joindre `127.0.0.1`. La version déployée a besoin d’une URL Ollama accessible, ou doit être exécutée localement.

## Données et limites

- Alerte : 1,5 Mo maximum.
- Résultat importé : 900 Ko maximum (limite de ligne D1).
- Règle : 120 Ko ; observations : 20 000 caractères ; recherches antérieures : 250 Ko.
- Les résultats bruts sont tronqués dans le prompt (6 blocs de 5 000 caractères).
- Les horodatages sont affichés en UTC pour éviter toute ambiguïté et tout écart d’hydratation.

## Sécurité des types

- `db/schema.ts` est la source de vérité.
- Les server functions valident chaque entrée avec Zod.
- Les services reçoivent un acteur résolu, jamais un identifiant utilisateur fourni par le client.
- Les retours client ne contiennent ni secret, ni clé, ni contenu de prompt système.

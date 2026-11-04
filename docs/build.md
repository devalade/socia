# Build, run and deploy

## Prérequis

- Node.js 22.18 ou plus récent (le CLI `cf` en a besoin ; Void fonctionne avec Node 22+).
- pnpm 11.
- Un compte Cloudflare pour le Worker et D1. Un Ollama local pour l’analyse.
- `void` installé localement via le paquet du projet.

## Installation

```bash
pnpm install
cp .env.example .env
# remplacer les valeurs de développement
pnpm void db migrate
pnpm dev
```

Ouvrir `http://localhost:3000`. Le premier compte créé devient administrateur.

L’IA utilise Ollama local. Démarrez-le et vérifiez `/health` : le champ `aiLocal` doit indiquer `available: true`.

```bash
pnpm void cloudflare status
pnpm void connect --platform cloudflare
pnpm dev
```

Sans cette connexion, `/health` reste vert mais les appels IA échouent et l’interface affiche « IA à configurer ».

## Variables

| Clé | Rôle | Production |
| --- | --- | --- |
| `APP_ENV` | `local`, `preview` ou `production` | `production` |
| `BETTER_AUTH_URL` | URL publique de l’application | URL HTTPS |
| `BETTER_AUTH_SECRET` | Secret de session Better Auth | `void secret put` |
| `AI_REQUEST_TIMEOUT_MS` | Timeout des appels IA | 90000 |
| `AI_KEY_ENCRYPTION_KEY` | Clé de chiffrement des clés fournisseurs | `void secret put` |

Générer les secrets :

```bash
openssl rand -base64 48   # BETTER_AUTH_SECRET
openssl rand -base64 48   # AI_KEY_ENCRYPTION_KEY
```

Ne jamais committer `.env`. Ne jamais mettre un secret derrière un préfixe `VITE_`.

## Base de données

```bash
pnpm void db generate   # après modification de db/schema.ts
pnpm void db migrate    # applique les migrations locales
pnpm void db status
pnpm void db studio
```

Lire chaque migration générée avant de la committer. Le déploiement applique les migrations.

## Vérifications

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm smoke               # contre BASE_URL, avec SMOKE_EMAIL et SMOKE_PASSWORD
```

Le smoke nécessite un compte existant. Il vérifie `/health`, la redirection anonyme, la connexion, le tableau de bord, l’historique et l’administration. Il échoue si une erreur console ou page apparaît.

## Déploiement

Le propriétaire du déploiement est **Void**, pas `cf` ni Wrangler.

```bash
pnpm void connect --platform cloudflare   # une fois
pnpm void secret put BETTER_AUTH_SECRET
pnpm void secret put BETTER_AUTH_URL=https://votre-domaine
pnpm void secret put AI_KEY_ENCRYPTION_KEY
pnpm void deploy --platform cloudflare
```

Après le déploiement :

```bash
curl https://votre-domaine/health
pnpm void project status
pnpm void project logs
```

Le premier déploiement crée la base D1. `void.lock.json` enregistre les ressources et doit être commité.

### Rollback

Lister les déploiements puis revenir à la version précédente :

```bash
pnpm void project status
pnpm void project rollback
```

Le rollback du Worker ne défait pas une migration D1. Les migrations sont forward-only ; une correction de schéma passe par une nouvelle migration.

## Domaine personnalisé

Ajouter le domaine dans la configuration Cloudflare ou via `void domain`. Vérifier ensuite `BETTER_AUTH_URL` et redéployer pour que les cookies et les redirections utilisent la bonne origine.

## Dépannage

| Symptôme | Cause | Action |
| --- | --- | --- |
| `AI requires authentication` | Void n’est pas connecté au compte Cloudflare | `pnpm void connect --platform cloudflare`, redémarrer |
| `/health` renvoie 503 | D1 indisponible ou migration absente | `pnpm void db migrate`, vérifier les logs |
| Le modèle local n’est pas détecté | Ollama n’est pas joignable | Démarrer `ollama serve`, vérifier `OLLAMA_BASE_URL` et `/health` |
| Session absente après déploiement | `BETTER_AUTH_URL` incorrect | Corriger le secret, redéployer |
| Hydratation incohérente | Ancien cache de dev | Redémarrer Vite, vider le cache navigateur |
| Erreur d’insertion D1 | Migration non appliquée | `pnpm void db generate && pnpm void db migrate` |

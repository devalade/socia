# Sécurité

## Modèle de menace

| Menace | Surface | Contrôle |
| --- | --- | --- |
| Injection de prompt via l’alerte ou les résultats | Prompt IA | Données délimitées par un tag à nonce, consigne système séparée, détection informative, sortie validée |
| XSS via du JSON importé | Rendu React | Aucun `dangerouslySetInnerHTML`, rendu tokenisé en texte, JSON affiché dans `<pre>` |
| Exécution de commande ou de KQL | Serveur | Aucun exécuteur, aucune connexion SIEM, KQL uniquement copiable |
| Vol de clé API fournisseur | Base, logs, client | AES-GCM au repos, clé jamais renvoyée, erreurs expurgées |
| SSRF via l’URL d’un fournisseur | Fetch serveur | HTTPS obligatoire, blocage des IP privées et des métadonnées cloud |
| IDOR sur une investigation | Server functions | `requireInvestigation` vérifie session, rôle, propriétaire ou admin |
| Escalade de rôle | Server functions | Rôles vérifiés côté serveur, dernier administrateur protégé |
| Brute force | Auth | Rate limit D1 sur connexion et inscription |
| Session volée | Cookies | HttpOnly, SameSite Lax, Secure en production, session révocable |
| Fuite de secret dans le dépôt | Code | `.env` ignoré, secrets de production via `void secret`, aucune clé littérale |
| Journalisation excessive | Audit | Métadonnées seulement, jamais le contenu d’alerte ou une clé |
| Déni de service par gros fichier | Upload JSON | Limites de taille à la validation et à l’import |
| Hallucination présentée comme preuve | Rapport | Rapport déterministe, verdict humain, champs manquants explicites |
| Résultat vide interprété comme absence | Prompt et UI | Avertissement explicite dans le prompt, la carte de résultat et le rapport |

## Authentification et sessions

- Better Auth, email + mot de passe.
- Hachage géré par Better Auth, jamais lu par l’application.
- Longueur minimale du mot de passe : 10 caractères.
- Sessions de 14 jours, renouvelées au bout de 4 heures d’activité.
- `cookieCache` désactivé : une session révoquée cesse d’être acceptée immédiatement.
- Cookies sécurisés en production (`APP_ENV !== local`).
- Rate limit D1 : 10 tentatives de connexion et 5 inscriptions par minute et par IP.

## Rôles et autorisation

| Action | Admin | Analyste | Lecteur |
| --- | --- | --- | --- |
| Voir une investigation | Oui | Oui | Oui |
| Créer une investigation | Oui | Oui | Non |
| Modifier une investigation | Toutes | Les siennes | Non |
| Importer un résultat | Oui | Oui | Non |
| Lancer une analyse | Oui | Oui | Non |
| Commenter | Oui | Oui | Non |
| Clôturer et générer un rapport | Oui | Oui | Non |
| Gérer les fournisseurs IA | Oui | Non | Non |
| Gérer les rôles | Oui | Non | Non |
| Lire le journal d’audit | Oui | Non | Non |

Le dernier administrateur ne peut pas être rétrogradé.

## Données non fiables

Tout contenu importé (alerte, règle, observations, recherches, résultats, commentaires) est traité comme une donnée.

- Il est délimité par un tag dont le nom contient un nonce aléatoire par requête.
- Le tag de fermeture présent dans les données est neutralisé.
- Le prompt système interdit d’obéir aux instructions contenues dans les données.
- Les formulations suspectes sont signalées à l’analyste, mais le contenu reste analysé.
- Les requêtes KQL proposées sont filtrées si elles ressemblent à du SPL, du SQL ou un pipeline.
- Aucune sortie du modèle n’est exécutée.

## Journal d’audit

Actions enregistrées : création et modification d’investigation, analyse initiale et réanalyse, échec et sortie invalide, import de résultat, création manuelle de requête, changement de statut d’hypothèse, commentaire, clôture, réouverture, archivage, génération et export de rapport, création, test, activation, désactivation et suppression de fournisseur, détection de modèles, changement de rôle.

Chaque entrée contient : acteur, e-mail, action, type et identifiant de cible, investigation liée, métadonnées courtes, IP, horodatage UTC. Aucun contenu d’alerte, aucun résultat et aucune clé n’y sont écrits.

## Limites connues

- Pas de vérification d’adresse e-mail.
- Pas de MFA ni de SSO.
- Pas de politique de rétention automatique.
- Pas de DLP : l’analyste doit être autorisé à transmettre le contenu de l’alerte au fournisseur IA choisi.
- Le PDF dépend de l’impression du navigateur, pas d’un moteur PDF serveur.
- Les résultats importés sont limités à 900 Ko par requête.
- En développement local, `BETTER_AUTH_SECRET` et `AI_KEY_ENCRYPTION_KEY` sont des valeurs de test dans `.env`, jamais des secrets de production.

## Checklist avant production

- [ ] `BETTER_AUTH_SECRET` généré avec au moins 32 octets aléatoires, stocké via `void secret`.
- [ ] `AI_KEY_ENCRYPTION_KEY` généré séparément.
- [ ] `BETTER_AUTH_URL` pointe vers l’URL HTTPS réelle.
- [ ] `APP_ENV=production`.
- [ ] Migrations D1 appliquées par le déploiement.
- [ ] `/health` répond `ok: true` et `aiBinding: true`.
- [ ] Un administrateur réel est créé, les comptes de test sont supprimés.
- [ ] Les fournisseurs IA sont testés, le catalogue est détecté.
- [ ] Le journal d’audit est consulté après un parcours complet.
- [ ] La politique de rétention et de sauvegarde D1 est décidée.

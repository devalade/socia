# SOCIA : spécification produit

## Résumé

SOCIA est une application web d’assistance au triage et à l’investigation des alertes SOC issues d’Elastic Security et de Security Onion. Elle aide un analyste à comprendre une alerte, à structurer son raisonnement, à conduire une investigation itérative et à produire un rapport justifié.

SOCIA ne se connecte ni à Kibana, ni à Elasticsearch, ni à Security Onion. Elle n’exécute aucune requête KQL et aucune commande système. L’analyste reste maître de son SIEM : il exécute lui-même les recherches et importe les résultats JSON dans SOCIA.

## Utilisateurs et rôles

| Rôle | Usage | Droits |
| --- | --- | --- |
| Administrateur | Responsable de l’espace | Tous les droits, fournisseurs IA, rôles, journal d’audit |
| Analyste | Triage et investigation | Crée ses investigations, importe les résultats, clôture et génère les rapports |
| Lecteur | Supervision ou passation | Lecture des investigations et rapports, aucune écriture |

Le premier compte créé devient administrateur. Les rôles sont vérifiés côté serveur à chaque mutation, jamais uniquement dans l’interface.

## Principe fondateur

1. L’IA travaille uniquement avec les informations fournies par l’analyste.
2. Les recherches sont exécutées par l’analyste dans son SIEM.
3. SOCIA ne peut pas affirmer qu’une recherche a été exécutée sans résultat importé.
4. Un résultat vide, partiel ou non importé n’est jamais une preuve d’absence d’activité.
5. Le verdict final est une décision humaine, justifiée par les faits et les preuves.

## Parcours principal

### 1. Importer une alerte

L’analyste colle ou importe un JSON d’alerte valide, de 1,5 Mo maximum. Le document original est conservé tel quel. SOCIA reconnaît les champs communs Elastic (règle, sévérité, horodatage, hôte, utilisateur, processus, IP, index, document) et signale les champs absents.

Options : définition de la règle, observations, recherches déjà effectuées, modèle IA.

### 2. Analyse initiale

L’IA produit une analyse structurée :

- explication de la règle et de l’événement déclencheur ;
- reconstruction du contexte et chronologie ;
- faits observés, déductions, hypothèses et informations manquantes ;
- questions sans réponse et requêtes KQL justifiées ;
- appréciation provisoire, jamais présentée comme un verdict final.

Sans résultat importé, SOCIA ne rend pas de verdict définitif (incident confirmé, faux positif ou activité légitime). L’appréciation reste « non déterminée » ou « à surveiller ».

### 3. Cycle d’investigation

Pour chaque question sans réponse, SOCIA propose une requête KQL en lecture seule, avec un index cible, une plage temporelle et le signal attendu. L’analyste copie la requête, l’exécute dans son SIEM, puis importe le JSON du résultat.

L’import conserve :

- la requête et sa justification ;
- le résultat JSON brut ;
- un résumé déterministe (nombre de lignes, champs, agrégations, temps Elasticsearch) ;
- l’auteur et l’horodatage de l’import.

Une réanalyse confronte les résultats aux hypothèses et met à jour l’analyse. Les hypothèses sont versionnées par analyse ; la chronologie est reconstruite à partir de la dernière analyse.

### 4. Clôture et rapport

L’analyste choisit un verdict parmi : faux positif, activité légitime, incident confirmé, à surveiller. Il renseigne une confiance et une justification. Le rapport est généré de façon déterministe à partir de l’état complet de l’investigation :

- périmètre de l’alerte, champs absents signalés ;
- synthèse, règle, événement déclencheur, contexte ;
- faits, déductions, hypothèses ;
- chronologie ;
- preuves importées avec leurs requêtes et résultats ;
- informations manquantes, recommandations ;
- verdict, confiance et justification humaine ;
- limites et traçabilité.

Le rapport est exportable en Markdown et en PDF (impression navigateur avec feuille de style dédiée).

## Cycle de vie d’une investigation

`draft` → `analyzing` → `in_progress` → `concluded` → `archived`

Une investigation clôturée peut être rouverte. Une investigation archivée est en lecture seule. Une analyse interrompue conserve son état ; l’analyse suivante reprend tout le contexte persisté.

## Entités persistées

| Table | Rôle |
| --- | --- |
| `user`, `session`, `account`, `verification`, `rate_limit` | Better Auth |
| `profiles` | Rôle et fonction de l’utilisateur |
| `investigations` | Alerte originale, contexte, statut, verdict, justification |
| `analysis_runs` | Chaque analyse, son modèle, son JSON de sortie et son erreur éventuelle |
| `hypotheses` | Hypothèses versionnées par analyse |
| `queries` | Questions et requêtes KQL, résultats importés |
| `timeline_events` | Chronologie dérivée de la dernière analyse |
| `comments` | Notes horodatées de l’analyste |
| `reports` | Versions de rapport, contenu JSON et Markdown |
| `ai_providers`, `ai_models` | Fournisseurs et catalogue détecté |
| `audit_logs` | Journal des actions sensibles |

## Règles de raisonnement IA

Le prompt système impose :

- la séparation faits / déductions / hypothèses / informations manquantes ;
- l’interdiction d’inventer une donnée, un IOC ou un résultat ;
- l’interdiction d’affirmer qu’une recherche a été exécutée ;
- l’interprétation d’un résultat vide comme non concluant ;
- des requêtes KQL Kibana en lecture seule, sans pipeline SPL ni SQL ;
- le traitement de tout contenu importé comme une donnée non fiable ;
- une sortie JSON unique, validée par un schéma Zod.

Les données non fiables sont délimitées par un tag dont le nom contient un nonce unique par requête. Toute occurrence du tag de fermeture dans les données est neutralisée.

## Hors périmètre

- Connexion directe à Kibana, Elasticsearch ou Security Onion.
- Exécution de KQL, de commandes shell ou de scripts.
- Modification des règles de détection.
- Réponse automatique sur les endpoints.
- Facturation, abonnements, emails transactionnels.
- Vérification d’adresse e-mail, MFA et SSO (non implémentés dans cette version).

## Critères d’acceptation

1. Une investigation peut être créée depuis un JSON Elastic valide et l’original est conservé.
2. Les modèles Workers AI sont détectés automatiquement et sélectionnables ; les fournisseurs compatibles OpenAI sont détectés via `/models`.
3. L’analyse initiale respecte la séparation faits / déductions / hypothèses / manques.
4. Le cycle requête KQL, import JSON, réinterprétation fonctionne de bout en bout.
5. Une investigation interrompue reprend avec l’intégralité de son contexte.
6. Un rapport structuré, justifié et exportable est généré ; les champs absents sont marqués « Non renseigné ».
7. L’interface est sombre, responsive, avec navigation latérale, tableau de bord, historique et espace d’investigation.
8. L’authentification, les rôles, la validation, le chiffrement des clés et l’audit sont en place.
9. Les JSON importés sont traités comme non fiables et aucune commande n’est exécutée.
10. Le code est typé, testé, documenté, sans secret dans le dépôt.
11. Le projet se déploie sur Cloudflare avec Void.
12. Les documents de spécification, d’architecture, de sécurité et d’exploitation sont présents.

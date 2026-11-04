# Scénarios et couverture

Cette matrice est la référence de vérification. Les tests unitaires couvrent le domaine pur. Le parcours complet a été vérifié dans Chromium avec un vrai appel Workers AI, un import de résultat, une réanalyse, une clôture et un rapport. Le script `scripts/smoke.mjs` vérifie le parcours de lecture sur un environnement déployé. Le smoke a passé sur `https://socia.devalade.me` après le déploiement, puis le compte de vérification a été supprimé.

## Acteurs

- `anonyme` : aucune session.
- `viewer` : compte en lecture seule.
- `analyst` : compte analyste.
- `admin` : compte administrateur.
- `provider` : fournisseur IA distant ou Workers AI.

## Matrice

| ID | Acteur | État de départ | Action | Résultat attendu | Couverture |
| --- | --- | --- | --- | --- | --- |
| S01 | anonyme | aucune session | Ouvrir `/app` | Redirection vers `/connexion` | Smoke |
| S02 | anonyme | formulaire | Mauvais mot de passe | Message générique, aucune session | Manuel |
| S03 | anonyme | premier compte | Créer un compte | Compte créé, rôle admin | Manuel |
| S04 | anonyme | espace existant | Créer un deuxième compte | Rôle analyste | Manuel |
| S05 | analyst | nouvelle investigation | JSON invalide | Erreur de validation, rien n’est créé | Test unitaire `alert` |
| S06 | analyst | nouvelle investigation | JSON de plus de 1,5 Mo | Refus explicite | Revue de code, validation Zod |
| S07 | analyst | JSON valide | Créer un brouillon | Investigation créée, alerte brute conservée | Manuel |
| S08 | analyst | brouillon | Lancer l’analyse initiale | Faits, déductions, hypothèses, manques | Manuel + IA réelle |
| S09 | analyst | analyse sans résultat | Vérifier l’appréciation | Aucun verdict définitif sans preuve importée | Test unitaire + post-traitement |
| S10 | analyst | requête proposée | Importer un résultat vide | 0 ligne, avertissement « ne prouve pas l’absence » | Test unitaire `result` |
| S11 | analyst | requête proposée | Importer un résultat Elasticsearch | Résumé, nombre de lignes, JSON conservé, audit | Manuel + test unitaire |
| S12 | analyst | résultat importé | Réanalyser | Nouveau run, hypothèses mises à jour, requêtes conservées | Manuel + IA réelle |
| S13 | analyst | alerte avec injection | Lancer l’analyse | Contenu signalé, traité comme donnée, analyse poursuivie | Test unitaire `prompt` |
| S14 | viewer | investigation | Tenter une mutation | Refus serveur 403 | Test unitaire `roles` |
| S15 | analyst | administration | Ouvrir les fournisseurs | Redirection ou refus admin | Test unitaire `roles` |
| S16 | admin | un seul admin | Rétrograder le dernier admin | Refus explicite | Revue de code |
| S17 | analyst | appel IA en échec | Attendre l’erreur | Run `failed`, contexte conservé, bouton Réessayer | Revue de code |
| S18 | analyst | sortie IA invalide | Analyser | Run `failed`, aucune hypothèse écrasée | Test unitaire `ai` |
| S19 | analyst | investigation non clôturée | Générer un rapport | Refus : verdict et justification requis | Revue de code |
| S20 | analyst | rapport | Champs absents | « Non renseigné » dans l’écran, le Markdown et le PDF | Test unitaire `report` |
| S21 | analyst | rapport | Exporter en Markdown | Téléchargement `.md`, action auditée | Manuel |
| S22 | analyst | rapport | Exporter en PDF | Impression avec feuille dédiée, action auditée | Manuel |
| S23 | admin | investigation clôturée | Rouvrir | Statut `in_progress`, verdict conservé | Revue de code |
| S24 | admin | investigation | Archiver | Statut `archived`, lecture seule | Revue de code |
| S25 | anonyme | `/health` | GET | `ok`, état D1, binding IA | Smoke |
| S26 | admin | fournisseur OpenAI | Ajouter, détecter, tester | Fournisseur actif, catalogue, test | Manuel |
| S27 | anonyme | auth | 11 connexions en une minute | 429 après la limite | Better Auth |
| S28 | analyst | deux investigations | Utiliser un queryId d’une autre | 404, aucune fuite | Revue de code |
| S29 | analyst | deux analyses simultanées | Double clic | 409 ou reprise après 3 minutes | Revue de code |
| S30 | analyst | run bloqué > 3 min | Relancer | Run marqué échoué, nouvelle analyse possible | Revue de code |
| S31 | analyst | résultat de 900 Ko+ | Importer | Refus explicite | Validation serveur |
| S32 | admin | clé API enregistrée | Inspecter la réponse réseau | Aucune clé en clair | Revue de code + chiffrement |
| S33 | analyst | alerte avec HTML/script | Afficher les preuves | Texte échappé, aucun script exécuté | Rendu React |
| S34 | admin | fournisseur avec URL privée | Ajouter | Refus SSRF en production | Revue de code |
| S35 | admin | fournisseur supprimé | Consulter une investigation | Le modèle historique reste lisible | Revue de code |

## Preuves du parcours réel

Vérifié le 4 novembre 2026 dans Chromium, sur l’environnement local avec Workers AI :

1. Création d’une investigation depuis l’alerte d’exemple.
2. Analyse initiale réelle avec `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
3. Appréciation initiale « Non déterminé », aucune conclusion définitive sans preuve.
4. Deux requêtes KQL Kibana valides proposées.
5. Import d’un résultat Elasticsearch de 3 événements.
6. Réanalyse réelle avec mise à jour des hypothèses.
7. Clôture avec verdict « Incident confirmé », confiance 85 %, justification humaine.
8. Génération du rapport version 1.
9. Vérification du contenu du rapport, des preuves importées et des champs manquants.
10. Vérification du rendu avant impression.

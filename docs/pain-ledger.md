# Pain ledger

Chaque douleur absorbée est décrite avec ce qu’elle coûte et la preuve qui la couvre.

| Douleur | Qui la subit | Sans SOCIA | Ce que SOCIA absorbe | Coût / limite | Vérification |
| --- | --- | --- | --- | --- | --- |
| Perte du contexte entre deux recherches | Analyste | Notes éparses, mémoire, fichiers temporaires | Alerte, analyses, requêtes, résultats et commentaires persistés | Croissance D1 à surveiller | S07, S12, reprise |
| Mélange faits / hypothèses | Analyste, supervision | Conclusion difficile à relire | Quatre sections imposées et rendues séparément | Dépend de la qualité du modèle | S08, tests `ai` |
| Résultat vide pris pour une absence | Analyste, SOC | Conclusion hâtive | Avertissement dans le prompt, la carte de résultat et le rapport | Ne remplace pas une revue humaine | S10, tests `result` |
| Copier les requêtes dans le SIEM | Analyste | Aller-retour manuel | Requête, justification, index et plage prêts à copier | Aucune exécution automatique, par conception | S11 |
| Rapport final rédigé de zéro | Analyste, management | Temps perdu, structure variable | Rapport déterministe versionné, exportable Markdown et PDF | Pas de signature électronique | S20, S21, S22 |
| Clés API éparpillées | Admin | Stockage en clair, rotation difficile | Fournisseurs centralisés, clé chiffrée AES-GCM, indice de clé | Rotation manuelle | S26, S32 |
| Modèles IA inconnus | Admin | Configuration au hasard | Détection Workers AI et compatible OpenAI, catalogue, test | Les modèles testés ne sont pas garantis pour tous les prompts | S26 |
| Injection de prompt via une alerte | SOC | Instructions malveillantes suivies | Délimiteurs à nonce, consigne système séparée, signalement | Le modèle reste probabiliste | S13 |
| Traçabilité des actions | Admin, audit | Journaux dispersés | Journal d’audit sans secrets ni contenu d’alerte | Pas d’export d’audit dans cette version | S21, S32 |
| Passation entre analystes | Équipe SOC | Contexte oral | Commentaires, hypothèses, preuves et rapport partagés | Analyste en lecture seule | S14, S23 |
| Hallucination présentée comme preuve | SOC | Confiance excessive | Séparation stricte, appréciation provisoire, verdict humain, rapport déterministe | L’IA peut encore se tromper | S08, S09, S18, S20 |
| Vérification d’un fournisseur | Admin | Test manuel dans un autre outil | Test d’un modèle depuis l’administration | Coût d’un appel | S26 |

## Ce que SOCIA refuse de faire

- Se connecter au SIEM.
- Exécuter du KQL, du shell ou une commande.
- Écrire un verdict final à la place de l’analyste.
- Transformer un résultat vide en preuve d’absence.
- Journaliser une clé, un secret ou le corps d’une alerte.

## Coûts assumés

- Chaque analyse consomme des neurones Workers AI ou des tokens du fournisseur distant.
- Les résultats importés sont limités à 900 Ko pour rester compatibles avec D1.
- Le PDF dépend du navigateur de l’analyste.
- La détection des modèles coûte un appel de catalogue à chaque premier chargement si le cache D1 est vide.

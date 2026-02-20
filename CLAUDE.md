# CLAUDE.md — Uklio Extension Chrome

## Projet

Extension Chrome compagnon du SaaS Uklio. Elle permet d'ajouter un prospect LinkedIn en un clic en scrapant automatiquement les données du profil et en les envoyant au backend Uklio.

L'extension fonctionne uniquement sur les pages `linkedin.com/in/*`.

### Rôle dans le parcours utilisateur

Dans Uklio, l'ajout d'un prospect se fait via un wizard multi-étapes où l'utilisateur saisit manuellement les informations du profil LinkedIn. L'extension remplace cette saisie manuelle en extrayant automatiquement toutes les données directement depuis la page LinkedIn. Plus l'extension remonte de données, plus l'IA sera pertinente dans ses suggestions de contextes et stratégies.

## Flux utilisateur

1. L'utilisateur navigue sur un profil LinkedIn (`linkedin.com/in/...`)
2. Un badge "!" apparaît sur l'icône de l'extension
3. L'utilisateur ouvre la popup
4. L'extension vérifie que l'utilisateur est connecté à Uklio
5. L'extension scrape automatiquement le profil LinkedIn affiché
6. La popup affiche un aperçu du prospect avec son niveau de complétion
7. L'utilisateur choisit la campagne de destination et un objectif optionnel
8. Il clique « Ajouter » — le prospect apparaît immédiatement dans Uklio

## Données extraites du profil LinkedIn

| Donnée | Description |
|--------|-------------|
| Prénom / Nom | Nom complet du prospect |
| URL LinkedIn | URL de la page profil |
| Poste actuel | Intitulé du poste |
| Entreprise actuelle | Nom de l'entreprise |
| Photo de profil | URL de la photo |
| Headline | Sous-titre du profil |
| Bio | Section "À propos" |
| Localisation | Ville / région |
| Expériences passées | Historique de carrière (max 8) |
| Formations | Diplômes et établissements |
| Compétences | Liste des compétences (max 15) |
| Langues | Langues parlées |
| Nombre de connexions | Taille du réseau |
| 5 derniers posts | Contenu des posts récents |

Plus la fiche est complète, plus l'IA d'Uklio pourra suggérer des contextes et stratégies pertinents.

## États de la popup

- **Non connecté à LinkedIn** — invite à naviguer sur un profil LinkedIn
- **Non connecté à Uklio** — lien vers la page de connexion Uklio
- **Chargement** — scraping en cours
- **Principal** — aperçu du prospect + sélection campagne/objectif + bouton d'ajout
- **Succès** — confirmation avec lien vers Uklio
- **Erreur** — message d'erreur avec bouton réessayer

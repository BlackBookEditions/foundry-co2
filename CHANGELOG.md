# 1.3.1
## Améliorations
- Changement du logo de la pause
- Messages de tchat : amélioration du CSS des compétences utilisées
- Journaux : les puces des listes sont des losanges
- Un équipement de sous-type Divers a maintenant la propriété Rechargeable
- Inventaire : Le bouton Augmenter la quantité n'est proposé que si l'équipement est empilable

## Corrections
- Personnage et adversaire : lors de la création par import de données, la source des actions est mise à jour

# 1.3.0
## Améliorations
- Ajout d'une infobulle précisant le calcul du critique dans la fenêtre d'attaque (issue [#222](https://github.com/BlackBookEditions/foundry-co2/issues/222))
- Ajout des compétences utilisées dans le message de tchat (issue [#257](https://github.com/BlackBookEditions/foundry-co2/issues/257))
- Voie : pour désapprendre une capacité, il faut que les capacités de rang supérieur aient été désapprises
- Capacité : le coût en charges peut être mis à 0 au niveau de l'action (issue [#339](https://github.com/BlackBookEditions/foundry-co2/issues/339))
- Prise en compte du dé bonus pour une caractéristique supérieure
- Prise en compte du dé malus pour l'état préjudiciable Affaibli
- Ajout des Effets d'état (statusEffects, visibles depuis le token) dans la partie Etats de la sidebar
- Equipement : Le changement de sous-type réinitialise tous les champs de Type d'équipement, Propriétés et Usage
- Tri des actions sur l'écran principal : Tri par défaut par nom, tri par rang de capacité, tri par type, tri par temps d'action

## Corrections
- Corrige un bug qui pouvait empêcher l'ouverture d'une fiche de personnage qui avait un effet lui infligeant des dommages périodiques en combat
- Corrige un bug qui empêchait le calcul d'une difficulté s'il y avait une formule dedans (ex : 10 + 1) (issue [#335](https://github.com/BlackBookEditions/foundry-co2/issues/335))
- Correction de la formule des dommages dans le cas du dé évolutif (issue [#341](https://github.com/BlackBookEditions/foundry-co2/issues/341))
- Correction des statusEffects : Immobilisé, Paralysé et affaibli
- Correction de la vision des rencontres qui à la création avaient la vision activée par défaut (issue [#347](https://github.com/BlackBookEditions/foundry-co2/issues/347))
- Rencontre : correction de l'affichage de la portée de l'attaque (issue [#352](https://github.com/BlackBookEditions/foundry-co2/issues/352))

# 1.2.1
## Corrections
- Les cases à cocher des propriétés d'une capacité ne sont plus perdues lors de l'édition quand on est pas en mode DEBUG

# 1.2.0
## Améliorations
- Empêche la suppression dans le cas où l'objet est possédé par un acteur
- La case Apprise d'une capacité est modifiable uniquement en mode Edition, par un MJ, et si l'option Debug est activée (issue [#325](https://github.com/BlackBookEditions/foundry-co2/issues/325))
- La case Equipé d'un équipement est modifiable uniquement en mode Edition, par un MJ, et si l'option Debug est activée
- Capacité et Equipement : pour le modifier d'une action, la saisie d'un dé (dx ou Dx) n'est possible que pour les dommages
- Durée des effets supplémentaires : Ajout d'une option 'cobmat' qui fait durer l'effet tout le long du combat. Les effets sont dorénavant automatiquement supprimés lorsque le combat est terminé par le MJ.
## Corrections
- Effets supplémentaires : correction de la gestion de la durée (issue [#320](https://github.com/BlackBookEditions/foundry-co2/issues/320))

# 1.1.0
## Améliorations
- Profil : Editer une voie, Trait : Editer une voie et Editer une capacité
- Récupération complète : gestion du cas où le DR est déjà au max et du cas particulier de DR max à 0
- Modificateur de type Combat et sous-type Dommages : possibilités de saisir un dé (1d6, 1d4°, etc...)
- Onglet Inventaire : possibilité d'augmenter ou diminuer la quantité d'objets ou de charges/ressources
- Correction sur les objets et acteurs de tous les champs qui étaient éditables alors que la fiche était en lecture seule
- Gestion des droits Limité et Observateur pour les acteurs et les objets

## Corrections
- Correction d'un critique lorsque le total est inférieur à la difficulté

# 1.0.9
- Correction des id des flags (suite changement id)

# 1.0.8
- Modifiers : correction de l'évaluation pour des formules plus complexes
- Correction de la clé du système pour les statistiques
- Amélioration pour permettre l'édition de l'image des acteurs par le module Tokenizer

# 1.0.7
- Amélioration de la qualité de l'image du logo
- Correction de la suppression des capacités liées (issue [#313](https://github.com/BlackBookEditions/foundry-co2/issues/313))
- Correction des settings (suite changement id)

# 1.0.6
- Correctif sur les liens des compendiums

# 1.0.5
- Diverses corrections suite au changement d'id

# 1.0.2
- Correction du lien vers l'image (suite changement id)

# 1.0.1
- Changement de l'id du package Foundry
- Correction du nom de fichier d'une image (par rapport aux Status Effects) (issue 311)
- Ajout du déploiement automatique

# 1.0.0
- Sortie officielle du système
#  1.4.3

## Améliorations
- Drop d'un action dans la hotbar : amélioration des différents raccourcis selon le type d'action
| Type d'action                      │        Clic        │ Alt+Clic │ Ctrl+Clic │ Shift+Clic │
│ Temporaire (activable/désactivable)│ Activer/Désactiver │ -        │ Chat      │ Fiche      │
│ Attaque avec dommages (mêlée, distance, magique, sort)  │ Attaque            │ Dommages │ Chat      │ Fiche │
│ Attaque sans dommages                                   │ Attaque            │ -        │ Chat      │ Fiche │
│ Autres (soin, buff, debuff, consommable, auto)          │ Utiliser           │ -        │ Chat      │ Fiche |
- Voies : possibilité de réorganiser l'ordre des voies par glisser-déposer dans l'onglet Voies
- Chat : SHIFT+clic sur le bouton d'envoi au chat envoie le message en mode public (visible par tous) au lieu du mode privé (MJ uniquement)
- Affichage du nombre d'actions configurées entre parenthèses dans l'onglet Actions/Effets des fiches d'objets (capacité, équipement, attaque). Le compteur ne s'affiche que si au moins une action est configurée.
- Ajout de deux nouveaux types de modificateurs d'attributs : "Récupération rapide" et "Récupération complète". Ces modificateurs permettent d'ajouter des bonus ou malus (incluant des formules de dés comme 1d4 ou 1d°) aux tests de récupération des points de vigueur.
- Changement d'image : lorsque l'image de base d'une fiche Personnage ou Rencontre est modifiée, l'image du token prototype est automatiquement mise à jour avec la même image.

## Corrections
- Mode Lecture des fiches d'objets : les champs de formulaire (input, select, checkbox) et les images sont maintenant correctement en lecture seule

# 1.4.2

## Améliorations
- Les dommages ne sont pas lancés si la formule vaut 0

## Corrections
- Utilisation du point de chance sur un jet d'attaque
- Corrige une erreur sur la résolution de type jet opposé

# 1.4.1

## Corrections
- Les dommages n'étaient plus lancés en cas de succès au jet d'attaque. Par contre, ils sont lancés même si la formule vaut 0 (comme 0+0).
- Affichage du jet de sauvegarde avec le thème sombre

# 1.4.0

## Améliorations

- Refactoring global de la gestion des messages et de l'affichage dans le chat
- CustomEffects : amélioration infobulle et changement de la génération du nom des CustomEffects
- CustomEffects : Durée minimum à 1, cible aucune équivalente à cible unique, correction suppression
- Ajout d'une option de durée "illimité" sur le seffets supplémentaire qui peux maintenant s'activer hors combat et devra donc se supprimer manuellement. Permet des effets qui n'ont pas de notions de durée (issue [#355](https://github.com/BlackBookEditions/foundry-co2/issues/355))
- Ajout de l'affichage du résultat du jet opposé si on affiche la difficultée (issue [#329](https://github.com/BlackBookEditions/foundry-co2/issues/329))
- Ajout de la prise en charge d'un effet supplémentaire illimité et utilisable hors des combats
- Attaque automatique : affichage des cibles
- Ajout de l'affichage d'un message indiquant qui a lancé un buff/debuff sur quelles cibles (issue [#363](https://github.com/BlackBookEditions/foundry-co2/issues/363))
- Ajout de l'affichage de la fenêtre de jet de compétences si une attaque opposée s'oppose à un attribut du personnage (issue [#179](https://github.com/BlackBookEditions/foundry-co2/issues/179))
- Rencontre : le clic sur l'icône d'une attaque ouvre l'objet correspondant
- Rencontre : drag n drop des caractéristiques, des attaques et des actions dans la Hotbar
- Résolution d'attaque : si la formule de dommage n'est pas définie, l'icône de poing n'apparait pas dans la liste des actions, les dommages ne sont pas lancés, et il n'y a pas de messages avec 0 DM

## Corrections

- Correction d'un bug qui empêchait l'affichage de la fenêtre de jet de compétences en cas où le joueur avait été ciblé par un buff provenant d'un autre joueur et augmentant son jet de compétences (issue [#356](https://github.com/BlackBookEditions/foundry-co2/issues/356))
- Correction du drop d'un item depuis une rencontre vers un personnage
- Tooltip d'une action : Correction de l'affichage des modificateurs. Affiche la valeur au lieu de la formule
- Seuls les Effets actifs sont pris en compte lors du transfert
- Message d'attaque dans le chat : correction de l'affichage des options
- Correction d'un bug permetttait de mettre une valeur courante de PV, Mana, points de chance, dé de recup supérieur au max sur les personnage et les rencontres (issue [#210](https://github.com/BlackBookEditions/foundry-co2/issues/210))

# 1.3.1

## Améliorations

- Changement du logo de la pause (Merci Mystery Man From Outerspace)
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

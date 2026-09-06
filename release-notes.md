<!--
  Notes de version affichées au MJ dans Foundry (fenêtre « Notes de version »).

  Format : un titre de niveau 1 par version, le plus récent en premier — le numéro doit être exactement celui de la release (`# 2.4.0`), c'est lui qui sert à la comparaison de versions.
  En dessous, du Markdown libre : titres de niveau 2, listes, gras, liens… Un bloc de citation (« > ») est mis en avant comme message important.

  Ce fichier est destiné aux joueuses et joueurs : il complète le CHANGELOG.md, qui reste le  journal exhaustif et technique.
-->

# 2.3.8

## Corrections

- Un personnage tombé à 0 point de vigueur ne passait plus automatiquement inconscient, et une rencontre à 0 PV n'était plus déclarée morte.
- Soigner des dommages temporaires les aggravait au lieu de les réduire.
- Un soin de dommages temporaires demandé par un joueur non-MJ appliquait en réalité un soin normal.
- L'application de dégâts pouvait écrire des données incohérentes dans la fiche de l'acteur et n'appliquait pas correctement le statut « mort » des rencontres à 0 PV.
- Un profil dont une voie était refusée à la création pouvait laisser une entrée invalide dans les voies du personnage.
- Deux messages d'interface manquants s'affichaient sous forme de clé brute au lieu d'un texte.
- Le repos rapide pouvait écrire des données incohérentes dans les dés de récupération du personnage.
- La suppression ou l'expiration d'effets personnalisés sur un acteur pouvait en oublier ou en supprimer le mauvais lorsque plusieurs étaient présents en même temps.
- Un coup bénéficiant d'une réduction de dégâts suffisante pouvait ne faire aucun dégât, au lieu du minimum d'un point garanti par les règles.
- Une famille de personnage inconnue ou renommée par un module de contenu pouvait faire planter entièrement la fiche.
- Une durée d'effet mal formée pouvait se propager comme une valeur invalide au lieu d'être ramenée à 1.
- Fiabilisation de la détection du type de jet (attaque/compétence) pour les modules tiers.
- Un modificateur ciblant « Soi-même » posé via un effet personnalisé (buff/debuff sur le lanceur) était ignoré à la lecture des statistiques ([#429](https://github.com/BlackBookEditions/foundry-co2/issues/429))

## Améliorations

- Le malus d'armure peut désormais être modifié par un modificateur (ex. capacité), en plus de la valeur de base de l'armure équipée ([#342](https://github.com/BlackBookEditions/foundry-co2/issues/342))
- Ajout du système de Compagnon. Les compagnons sont les créatures (rencontre) qui suivent un joueur et dont certaines caractéristiques sont liées à ce joueur. On parle de 'master' et de 'companion'. Cocher la case 'Est un compagnon' sur une fiche de rencontre, fera s'afficher l'onglet 'Compagnon'. Glisser déposer un joueur sur une fiche de rencontre le rendra alors 'master' et vous pourrez remplacer les caractéristiques de base de la créature par une formule comprenant des informations du maitre via le mot clef : @master. Exemple @master.agi correspondra à l'agilité du maitre. chaque valeurs de 'abilities', 'combat' ainsi que .niv (niveau du maitre) sont disponibles.

# 2.3.7

## Améliorations

- Les modules de règles peuvent désormais remplacer un statut par un autre et déclarer les statuts qui rendent automatiquement critiques les attaques reçues, avec un filtrage possible par type d'attaque.
- Les bonus de compétence contextuels peuvent être présélectionnés à l'ouverture de la fenêtre de jet ; leur valeur est immédiatement intégrée au total et au récapitulatif du test.

# 2.3.5

## Corrections

- Une capacité liée dont la capacité parente n'existe plus sur l'acteur n'était rendue nulle part sur la feuille — elle n'est affichée qu'à travers le `linkedCapacity` de son hôte — alors que ses modificateurs continuaient de s'appliquer, produisant des écarts de calcul inexplicables. Elle réapparaît désormais dans _Capacités hors voie_, signalée par une icône d'alerte, et peut y être supprimée.

# 2.3.4

## Améliorations

- Les cartes de chat d'attaque, de dommages et de sauvegarde portent l'identifiant de l'objet à l'origine du jet (`data-item-uuid` / `data-item-id`). Les modules d'animation tels que _Automated Animations_ déclenchent désormais l'animation au moment du jet, quel que soit le point de lancement (feuille, carte de chat, HUD, macro). En contrepartie, publier un objet dans le chat ne déclenche plus d'animation : c'est le jet qui la porte.

# 2.3.3

## Corrections

- Les voies apportées par un trait restent affichées lorsque la feuille de personnage est verrouillée, dès qu'une capacité de la voie est apprise ([#427](https://github.com/BlackBookEditions/foundry-co2/issues/427))
- Les notes des modificateurs d'un trait, ainsi que leur bénéficiaire (soi-même, les autres, les deux), sont conservées lorsque le trait est glissé sur un personnage ([#427](https://github.com/BlackBookEditions/foundry-co2/issues/427))
- La suppression d'un trait, d'un profil ou d'une voie ne laisse plus de voies ni de capacités orphelines sur le personnage. Les capacités déjà orphelines des personnages existants réapparaissent dans _Capacités hors voie_ et peuvent y être supprimées ([#427](https://github.com/BlackBookEditions/foundry-co2/issues/427))

# 2.3.2

## Corrections

- Le modificateur de caractéristiques _Toutes les caractéristiques_ est désormais pris en compte sur les acteurs de type Rencontre
- Les voies apportées par un trait restent affichées lorsque la feuille de personnage est verrouillée, dès qu'une capacité de la voie est apprise
- Les notes des modificateurs d'un trait, ainsi que leur bénéficiaire (soi-même, les autres, les deux), sont conservées lorsque le trait est glissé sur un personnage
- La suppression d'un trait, d'un profil ou d'une voie ne laisse plus de voies ni de capacités orphelines sur le personnage. Les capacités déjà orphelines réapparaissent dans _Capacités hors voie_ et peuvent y être supprimées

# 2.3.1

## Améliorations

- Lisibilité des couleurs de chat avec le thème sombre de Foundry

# 2.3.0

> **Important** — Les postures défensives, les boutons de récupération, les points de chance, les dés de récupération et les dommages temporaires sont des règles propres à _Chroniques Oubliées Fantasy_ : le module **Chroniques Oubliées Fantasy 2e édition : Livre des règles ** est désormais nécessaire pour en disposer. Les mécaniques, elles, restent dans le système. <br><br> Dorénavant les versions du module COF2 Livre de base suivront la version du système. La version 2.3.0 permet la gestion des contenants. <br> **Il faut donc le système ET le module en 2.3.0** pour avoir les profils avec l'équipement de départ. Chaque profil a maintenant un équipement de départ qui inclut un sac d'aventurier.

## Nouveautés

- Nouveau type d'objet : le **conteneur**. Glissez-y des objets pour organiser l'équipement d'un personnage, avec une limite de contenu facultative.
- Les **profils** peuvent embarquer un équipement de départ : il est copié automatiquement sur le personnage lors de l'attribution du profil.

## Améliorations

- Les couleurs du système sont regroupées dans une palette unique : un module peut désormais rhabiller entièrement l'interface, en thème clair comme en thème sombre.

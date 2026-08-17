# 2.3.5

## Corrections
- Une capacité liée dont la capacité parente n'existe plus sur l'acteur n'était rendue nulle part sur la feuille — elle n'est affichée qu'à travers le `linkedCapacity` de son hôte — alors que ses modificateurs continuaient de s'appliquer, produisant des écarts de calcul inexplicables. Elle réapparaît désormais dans *Capacités hors voie*, signalée par une icône d'alerte, et peut y être supprimée.

# 2.3.4

## Améliorations
- Les cartes de chat d'attaque, de dommages et de sauvegarde portent l'identifiant de l'objet à l'origine du jet (`data-item-uuid` / `data-item-id`). Les modules d'animation tels que *Automated Animations* déclenchent désormais l'animation au moment du jet, quel que soit le point de lancement (feuille, carte de chat, HUD, macro). En contrepartie, publier un objet dans le chat ne déclenche plus d'animation : c'est le jet qui la porte.

# 2.3.3

## Corrections
- Les voies apportées par un trait restent affichées lorsque la feuille de personnage est verrouillée, dès qu'une capacité de la voie est apprise ([#427](https://github.com/BlackBookEditions/foundry-co2/issues/427))
- Les notes des modificateurs d'un trait, ainsi que leur bénéficiaire (soi-même, les autres, les deux), sont conservées lorsque le trait est glissé sur un personnage ([#427](https://github.com/BlackBookEditions/foundry-co2/issues/427))
- La suppression d'un trait, d'un profil ou d'une voie ne laisse plus de voies ni de capacités orphelines sur le personnage. Les capacités déjà orphelines des personnages existants réapparaissent dans *Capacités hors voie* et peuvent y être supprimées ([#427](https://github.com/BlackBookEditions/foundry-co2/issues/427))


# 2.3.2

## Corrections
- Le modificateur de caractéristiques *Toutes les caractéristiques* est désormais pris en compte sur les acteurs de type Rencontre (([#426](https://github.com/BlackBookEditions/foundry-co2/issues/426))

# 2.3.1

## Améliorations
- Lisibilité des couleurs de chat avec le thème sombre de Foundry
- L'usage (nb mains) n'est pas affiché pour les armures
- Les notes de version sont intégrées au système et affichées aux MJs

# 2.3.0

## Améliorations

- Profil : gestion de l'équipement de départ (par glisser-déposer) automatiquement copié sur le personnage lors de l'attribution du profil
- Nouveau type d'objet : Conteneur

## Refactoring

- Les postures défensives (défense partielle et défense totale) sont une manœuvre propre à Chroniques Oubliées Fantasy. **Le module cof2-base est désormais nécessaire pour en disposer.** Les effets restés sur les acteurs sont retirés automatiquement si plus aucun module ne déclare ces postures.
- Les boutons de récupération rapide et de récupération complète sont eux aussi propres à Chroniques Oubliées Fantasy . **Le module cof2-base est désormais nécessaire pour en disposer.** La mécanique — dépense du dé de récupération, soin, recharge des capacités, hooks `co2.preUseRecovery` / `co2.postUseRecovery` — reste dans le système et est inchangée.
- Trois règles propres à Chroniques Oubliées Fantasy — les points de chance, les dés de récupération et les dommages temporaires sont propres à Chroniques Oubliées Fantasy. **Le module cof2-base est désormais nécessaire pour en disposer.** Toutes les mécaniques restent dans le système : relance et mise à jour des cartes de chat, récupération, application des dommages.
- Les trois tags d'équipement — DM temporaires, DM temporaires possibles, arme légère — sont propres à Chroniques Oubliées Fantasy et ne sont portés que par les compendiums de cof2-base : leur déclaration y est déplacée. `game.system.CONST.EQUIPMENT_TAGS` est désormais vide par défaut et complété par un module de contenu.
- La palette du système est consolidée dans `styles/palette.less` : toutes les couleurs de thème y sont déclarées en un seul endroit, sur `.theme-light` / `.theme-dark`. Un module peut désormais rhabiller entièrement le système en redéclarant ces deux sélecteurs dans sa propre feuille de style. **Rupture** : les variables sont renommées en `--co-<domaine>-<rôle>` (par exemple `--color-characterSheet` devient `--co-sheet-accent`), un thème tiers doit être mis à jour. Les couleurs des fenêtres de jet et des résultats de jet, jusqu'ici écrites en dur, sont également variabilisées.
- Les fiches d'objets attaque, capacité, équipement et conteneur partageaient la même structure css dupliquée : leur tronc commun est factorisé dans `styles/applications/sheets/items/full-sheet.less`. Le rendu est inchangé.

# 2.2.0

## Corrections

- Envoie bien la capacité liée dans le chat et non la capacité mère
- Corrige les dommages lancés malgré un échec critique ([#421](https://github.com/BlackBookEditions/foundry-co2/issues/421))

## Améliorations

- Ajout de points d'extension pour gérer les points d'ego et les pouvoirs psioniques


# 2.1.7

## Corrections

- Capacité liée : Cliquer sur Envoyer dans le chat envoie bien la capacité liée et non la capacité mère

# 2.1.6

## Améliorations

- Cartes de dommages et de sauvegarde : le MJ peut désormais forcer manuellement la valeur des DM appliqués à une cible (par exemple le maximum) via une icône d'édition. En mode manuel, la valeur saisie remplace le total de base (la RD et le minimum de 1 restent appliqués) et les boutons multiplicateurs sont désactivés. La valeur forcée est conservée et restaurée à l'affichage du message
- Ajout l'immunité à l'étourdisement et à l'affaiblissement (Le compagnon p. 50)

# 2.1.5

## Corrections

- Affiche correctement les champs d'un trait en mode édition lorsqu'il est possédé par un personnage
- Retire l'ajout automatique de l'équipement Mains nues d'une rencontre, car elle a un butin et non un inventaire
- Corrige l'affichage des capacités dans les rencontres qui n'affichait plus si on décochait la case 'appris' (#412)

# 2.1.4

## Améliorations

- Ajoute l'immunité au saignement
- Ajoute le modifier 'improvedDice' (Adaptation du dé évolutif). Améliore la gestion du dé évolutif : il est possible d'augmenter ou de diminuer de x crans le dé dans le tableau du livre des règles. On ajoute de plus l'option 2d6
- Prise en compte des dés bonus/malus dans les jets opposés
- Profil et Trait : pour les modificateurs, il est maintenant possible de grouper par choix pour gérer le cas où il faut choisir entre 2 caractéristiques
- Résolution, dans le champ nombre de cibles : possibilité d'utiliser les raccourcis, par exemple @cha au lieu d'un entier. Le résultat du calcul s'affiche en infobulle sur un item possédé par un personnage

## Corrections

- La création automatique de Mains nues et Support pour un nouveau personnage est de nouveau fonctionnel
- Résolution Soin : lorsqu'une cible ne correspond pas au type attendu (allié/ennemi), un avertissement est affiché et l'action est bloquée (au lieu d'appliquer silencieusement le soin aux seules cibles valides ou de ne rien faire sans feedback)
- Résolution Attaque : lorsqu'aucune cible valide n'est sélectionnée (toutes filtrées par le type allié/ennemi), un avertissement est affiché
- Résolution Attaque, Cible Unique : les cibles hors type (allié/ennemi) sont correctement affichées grisées avec bordure rouge dans la fenêtre de dialogue, y compris pour les jets opposés
- Résolution Attaque, Cible Unique : si plusieurs cibles sont sélectionnées, un avertissement bloque l'action au lieu d'afficher toutes les cibles dans le dialogue
- Filtrage des cibles : les tokens de disposition Neutre et Secret sont acceptés par les deux types de cibles (alliés et ennemis)

# 2.1.3

## Corrections

- Corrige le remplacement de dés d'évolution qui ne prenaient en compte que le premier de la formule (#85 sur le module)
- Fréquence d'utilisation et charge : corrige l'utilisation d'une capacité qui ne consomme pas de charge
- Corrige les jets opposés pour prendre en compte les dés bonus / dés malus (#85 du module)

# 2.1.2

## Corrections

- Corrige les sauvegardes avec "cible unique" qui proposaient le jet au lanceur au lieu de la cible visée (#405)

# 2.1.1

## Améliorations

- Corrige la gestion des effets supplémentaires pour les jets opposés sans DM configurés
- Corrige la gestion des effets supplémentaires pour les jets de sauvegarde sans DM configurés

## Corrections

- Les modifications css prose-mirror sont limités au système et ne touche plus l'interface de Foundry (zone de chat qui avait disparu)

# 2.1.0

## Améliorations

### Attaques multi-cibles

- Chaque cible est désormais évaluée individuellement lors d'un jet d'attaque : la Défense de chaque cible est comparée au résultat pour déterminer le succès ou l'échec
- Le message d'attaque affiche la liste des cibles avec une icône colorée indiquant le résultat individuel (succès, critique, échec, fumble)
- L'utilisation d'un Point de Chance recalcule les résultats individuellement pour chaque cible

### Jets opposés par cible

- Un bouton "Jet opposé" apparaît pour chaque cible dans le message d'attaque
- Chaque défenseur effectue son propre jet en opposition indépendamment
- Le défenseur peut utiliser un Point de Chance pour augmenter son jet de 10 points

### Jets de sauvegarde multi-cibles

- Les jets de sauvegarde sont résolus cible par cible, chacune avec son propre résultat
- Chaque cible peut dépenser un Point de Chance sur sa sauvegarde
- Ajout d'une formule de Dommages optionnelle sur la résolution de type Sauvegarde
- Ajout de l'option "Dommages moitié sur réussite" pour les sauvegardes

### Carte de Dommages

- Deux modes d'application : "Ciblées" (cibles de l'attaque) et "Sélectionnées" (tokens sélectionnés manuellement sur la scène)
- Multiplicateurs individuels par cible : Soin, ×0, ×½, ×1, ×2
- Réduction de Dommages (RD) gérée individuellement par cible
- Bouton unique "Appliquer" pour traiter toutes les cibles en une seule action
- Les multiplicateurs et la RD sont automatiquement pré-sélectionnés en fonction du résultat de l'attaque (×2 sur critique, ×0 sur raté)
- Les choix de multiplicateurs et de RD sont conservés si le message est rafraîchi

### Effets et conditions

- Les effets additionnels d'une attaque sont désormais appliqués individuellement à chaque cible touchée
- Ajout du statut "Autre" pour les effets particuliers qui ne correspondent à aucun état existant

### Buff/Debuff

- Les Buff/Debuff peuvent désormais fonctionner avec uniquement des Statuts et/ou une Durée, sans nécessiter obligatoirement des Modificateurs de statistiques

### Cibles

- Le nombre de cibles "0" en mode Multiple signifie désormais un nombre de cibles illimité

### Visuel des cartes de chat

- Nouveau design des cartes d'attaque, de dommages et de sauvegarde avec l'image et le nom de l'objet utilisé en en-tête
- Sections dépliables pour les détails des jets et la liste des cibles
- Portraits circulaires et icônes colorées pour les résultats par cible

### Confidentialité

- Si un joueur fait un jet privé (whisper au MJ), le message de dommages associé hérite automatiquement de la même visibilité

### Options du système

- Suppression de l'option "Ne pas utiliser ni afficher la difficulté" — la difficulté est désormais toujours affichée (pour tout le monde ou uniquement au MJ)
- Suppression de l'option "Afficher les boutons de Dommages pour tout le monde" — remplacée par le nouveau système intégré de gestion des cibles
- L'option "Autoriser les joueurs à modifier les cibles" contrôle désormais l'accès aux contrôles de la carte de Dommages

### Bonus de compétence

- Le dialogue d'attaque propose de sélectionner des bonus de compétence applicables au jet
- Prise en compte des compétences pour les attaques basées sur les caractéristiques

## Corrections

- Correction du calcul des dommages temporaires : la Force de la cible est désormais correctement soustraite du total
- Correction de la double application des effets additionnels (always/critical + jet opposé)
- Correction de la formule invalide lorsque plusieurs modificateurs avec dés sont combinés
- Correction de l'info-bulle sur les boutons "jet opposé" qui affichait une valeur non traduite pour @atc, @atd et @atm
- Correction de la gestion de @Test depuis un journal dont la fenêtre a été détachée

# 2.0.2

## Corrections

- Corrige le retour à la ligne automatique manquant dans les descriptions

# 2.0.1

## Corrections

- Compatibilité V14 : game.settings.get("core", "rollMode") remplacé par game.settings.get("core", "messageMode")
- Corrige l'absence de scrollbar dans les journaux

# 2.0.0

- Compatibilité Foundry V14

# 1.6.5

## Améliorations

- Tooltip des formules dans le chat : les messages d'attaque et de dégâts affichent maintenant un tooltip sur la ligne de formule dans le footer, permettant au MJ de vérifier les formules utilisées par les joueurs (bonus, malus, capacités activées). ([#395](https://github.com/BlackBookEditions/foundry-co2/issues/395))

## Corrections

- Modificateurs Dé Bonus et Dé Malus pour les jets d'attaque : les modificateurs de type Dé Bonus/Malus ne s'appliquaient pas aux jets d'attaque. Trois causes corrigées : le dropdown de cible était vide sur les fiches de profil et de trait (filtre incorrect), le type d'attaque magique n'était pas reconnu (mismatch "magical" vs "magic"), et la formule d'attaque était écrasée par le tooltip avant la détection du type d'attaque.

# 1.6.4

## Corrections

- L'état affaibli donne maintenant un dé de malus pour les trois types d'attaque

# 1.6.3

## Corrections

- Modificateurs des actions activables avec conditions : pour les actions activables (temporaires ou non) possédant des conditions (ex : `isLearned`), les modificateurs n'étaient vérifiés que sur les conditions et ignoraient le flag `enabled`. Cela provoquait l'application permanente des bonus dès l'acquisition de la capacité (ex : bonus d'attaque et DM de Feinte actifs en permanence). Les conditions contrôlent désormais la visibilité du bouton, et `enabled` contrôle l'activation effective des modificateurs.

# 1.6.2

## Améliorations

- Fiche Personnage et Rencontre : ajout d'un bouton sur le portrait pour partager l'image avec tous les joueurs connectés (visible au survol)
- Fiche Personnage : les icônes de Peuple et de Profil dans l'en-tête sont cliquables pour ouvrir la fiche de l'objet correspondant, en mode Lecture comme en Écriture
- Fiche Personnage - Biographie : Taille et Langages sont affichés sur la même ligne dans la section Divers
- Fiche Personnage - Biographie : en mode Lecture, les blocs Publique et Privée de Biographie et Apparence ne sont affichés que s'ils contiennent du texte

## Corrections

- Conditions des actions d'équipement : les conditions (est possédé, est équipé, etc.) définies sur les actions d'un équipement sont maintenant évaluées lors de la collecte des modificateurs. Auparavant, seul le flag `enabled` était vérifié et les conditions étaient ignorées, ce qui empêchait les bonus conditionnels de s'appliquer aux jets de compétences.

# 1.6.1

## Corrections

- Le Groupe de joueurs est maintenant accessible uniquement au MJ

# 1.6.0

## Améliorations

- Info-bulles des bonus : les info-bulles listant des bonus (caractéristiques, combat, initiative, défense, critique, RD, PV, ressources) sont maintenant affichées en colonne au lieu d'être en ligne, pour une meilleure lisibilité.
- Transfert d'objets empilables : SHIFT + glisser-déposer permet de transférer une seule unité d'un objet empilable entre personnages ou rencontres. La quantité est décrémentée sur l'acteur source et incrémentée sur l'acteur cible. Sans SHIFT, le comportement reste inchangé (transfert complet).
- Nettoyage : suppression de 7 helpers Handlebars inutilisés (isPathProfile, isset, sum, getValueFromMartialTraining, buildItemTemplatePath, isActionable, isEnabled)
- Enricher @Test : dans le message de résultat du jet, les compétences demandées par le test (ex : histoire) sont maintenant affichées sous le nom de la caractéristique dans l'en-tête, au lieu d'être mélangées avec les compétences bonus sélectionnées dans la fenêtre de dialogue.
- Possibilité de faire un jet opposé depuis le dialogue de test de caractéristique. Un seul opposant pour l'instant. Si pas de cibles, tout le monde peut participer, sinon seuls les cibles le peuvent.
- Tooltip des bonus : les bonus de compétences utilisés dans le message de chat affichent le nom complet en info-bulle.
- Ajout d'un menu Groupe de joueurs pour visualiser les personnages des joueurs connectés. Un clic sur une entête de caractéristique demander un jet à tout le monde. un clic sur la valeur d'une caractéristique d'un personnage lui demande un jet.

## Corrections

- Fiche d'objet : correction d'un bug où appuyer sur ENTER après avoir modifié le nom d'un équipement supprimait la résolution de l'action
- Rencontres : correction des modificateurs de dommages avec formule de dés (ex : +1d6) qui étaient ignorés pour les attaques de rencontre (retournaient 0 au lieu de la formule)
- Fiche d'objet : la section "Propriétés (DEBUG)" dans l'onglet Actions/Effets n'est maintenant visible que si l'option DEBUG du système est activée

# 1.5.2

## Améliorations

- Points de chance : le bouton pour utiliser un point de chance (+10) est maintenant affiché même lorsque la difficulté n'est pas gérée. Il suffit que le personnage ait des points de chance et que ce ne soit pas un critique.
- Jet de chance : le message affiché dans le chat utilise maintenant la même mise en forme que les jets de caractéristique.

## Corrections

- Capacités de soin : correction de la consommation des points de mana qui n'était pas effectuée lors de l'activation d'un sort de soin

# 1.5.1

## Améliorations

- Ajout d'une durée 'instantanée' sur les effets supplémentaires pour appliquer un effet supplémentaire sans durée qui s'applique tout de suite. Attention : il convient pour des dommages ou des soins, mais si vous l'utilisez sur des statuts (ex : empoisonné) la durée ne sera plus gérée. Cette durée peut être activée hors combat.
- Effets supplémentaires : possibilité de choisir parmi les statuts à appliquer (issue [#163](https://github.com/BlackBookEditions/foundry-co2/issues/163))

## Corrections

- Tokens non-liés : correction de l'activation des actions pour les tokens non-liés à un acteur (les actions utilisaient l'acteur de base au lieu du syntheticActor du token)
- Resolver Buff/Debuff : correction du filtrage des modificateurs selon la cible. Les modificateurs avec apply="Soi-même" sont maintenant correctement appliqués quand la cible du Resolver est "Soi-même". Les modificateurs avec apply="Les Autres" ne s'appliquent plus à l'acteur source. Les modificateurs avec apply="Les Deux" s'appliquent correctement à la fois sur l'acteur source ET sur les cibles
- Résolution avec effet supplémentaire : la sélection des statuts n'est plus perdu lors du passage en mode Edition

# 1.5.0

## Améliorations

- Drop d'un action dans la hotbar : amélioration des différents raccourcis selon le type d'action
  | Type d'action │ Clic │ Alt+Clic │ Ctrl+Clic │ Shift+Clic │
  │ Temporaire (activable/désactivable)│ Activer/Désactiver │ - │ Chat │ Fiche │
  │ Attaque avec dommages (mêlée, distance, magique, sort) │ Attaque │ Dommages │ Chat │ Fiche │
  │ Attaque sans dommages │ Attaque │ - │ Chat │ Fiche │
  │ Autres (soin, buff, debuff, consommable, auto) │ Utiliser │ - │ Chat │ Fiche |
- Voies : possibilité de réorganiser l'ordre des voies par glisser-déposer dans l'onglet Voies
- Chat : SHIFT+clic sur le bouton d'envoi au chat envoie le message en mode public (visible par tous) au lieu du mode privé (MJ uniquement)
- Affichage du nombre d'actions configurées entre parenthèses dans l'onglet Actions/Effets des fiches d'objets (capacité, équipement, attaque). Le compteur ne s'affiche que si au moins une action est configurée.
- Ajout de deux nouveaux types de modificateurs d'attributs : "Récupération rapide" et "Récupération complète". Ces modificateurs permettent d'ajouter des bonus ou malus (incluant des formules de dés comme 1d4 ou 1d°) aux tests de récupération des points de vigueur.
- Changement d'image : lorsque l'image de base d'une fiche Personnage ou Rencontre est modifiée, l'image du token prototype est automatiquement mise à jour avec la même image.
- Modificateurs des Traits et Profils : harmonisation de l'interface des modificateurs avec celle des capacités et équipement. Les modificateurs ne s'appliquent qu'à soi-même.
- Jet de sauvegarde : affichage d'un ? avant le jet
- Onglet des actions : symbole d'une balance si c'est un test opposé (@oppose dans la difficulté)
- Ajout d'une option de resolver : Seuil de succès pour gérer les cas de succès d'attaque automatique au-delà d'une valeur de jet de dé. Ajout d'un déclencheur de resolver si le résultat est au-dessus du seuil de succès défini. Ajout d'une condition d'application d'effets supplémentaires via le dépassement du seuil de succès

## Corrections

- Mode Lecture des fiches d'objets : les champs de formulaire (input, select, checkbox) et les images sont maintenant correctement en lecture seule
- Jet de compétence : correction de l'affichage de la source des bonus pour les capacités. Affichage de la voie.
- Un effet additionnel n'est créé que s'il est actif
- Statut Immobilisé : ajout du dé malus aux tests d'attaque (en plus du blocage du déplacement déjà géré)

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

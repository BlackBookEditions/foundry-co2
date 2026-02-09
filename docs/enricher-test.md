# Enricher @Test - Demande de jet de caractéristique

L'enricher `@Test` permet d'insérer dans un journal ou une description un lien cliquable pour demander un jet de caractéristique aux joueurs. Lorsqu'un joueur clique sur le lien, un message apparaît dans le chat avec un bouton pour effectuer le jet.

## Syntaxe

```
@Test[car:CARACTERISTIQUE|paramètre1:valeur1|paramètre2:valeur2|...]
```

## Paramètres

| Paramètre | Obligatoire | Description |
|-----------|-------------|-------------|
| `car` | Oui | La caractéristique à tester |
| `diff` | Non | La difficulté du test |
| `comp` | Non | Le nom de la ou des compétences associées |
| `suc` | Non | Texte décrivant les conséquences en cas de succès (visible uniquement par le MJ) |
| `ech` | Non | Texte décrivant les conséquences en cas d'échec (visible uniquement par le MJ) |
| `sucdm` | Non | Formule de dés pour les dommages en cas de succès |
| `echdm` | Non | Formule de dés pour les dommages en cas d'échec |
| `sucstatut` | Non | Statuts à appliquer en cas de succès (séparés par des virgules) |
| `echstatut` | Non | Statuts à appliquer en cas d'échec (séparés par des virgules) |
| `options` | Non | Options supplémentaires (séparées par des virgules) |

## Valeurs possibles

### Caractéristiques (`car`)

| Valeur | Caractéristique |
|--------|-----------------|
| `for` | Force |
| `agi` | Agilité |
| `con` | Constitution |
| `int` | Intelligence |
| `per` | Perception |
| `cha` | Charisme |
| `vol` | Volonté |

### Statuts (`sucstatut` / `echstatut`)

Les statuts disponibles sont les identifiants des effets de statut du système :

| Valeur | Statut |
|--------|--------|
| `dead` | Mort |
| `confused` | Confus |
| `enslaved` | Asservi |
| `stun` | Étourdi |
| `overturned` | Renversé |
| `blind` | Aveuglé |
| `weakened` | Affaibli |
| `outOfBreath` | Essoufflé |
| `immobilized` | Immobilisé |
| `invalid` | Invalide |
| `paralysis` | Paralysé |
| `slowed` | Ralenti |
| `surprised` | Surpris |
| `invisible` | Invisible |
| `unconscious` | Inconscient |
| `silence` | Réduit au silence |
| `bleeding` | En train de saigner |
| `poison` | Empoisonné |

### Options (`options`)

| Valeur | Description |
|--------|-------------|
| `secret` | Le jet est effectué en mode "Uniquement le MJ" (le résultat n'est visible que par le MJ) |

## Exemples

### Test simple
```
@Test[car:for|diff:10]
```
Demande un test de Force difficulté 10.

### Test avec compétence
```
@Test[car:agi|diff:15|comp:acrobaties]
```
Demande un test d'Agilité difficulté 15 avec la compétence Acrobaties.

### Test avec plusieurs compétences
```
@Test[car:int|diff:12|comp:histoire, rumeurs et légendes]
```
Demande un test d'Intelligence difficulté 12 avec plusieurs compétences possibles.

### Test avec conséquences textuelles
```
@Test[car:con|diff:10|suc:résiste au poison|ech:perd 1d6 PV et est empoisonné]
```
Demande un test de Constitution avec des descriptions de conséquences (visibles uniquement par le MJ dans le chat).

### Test avec dommages automatiques
```
@Test[car:con|diff:12|sucdm:1d6|echdm:2d6]
```
Demande un test de Constitution. En cas de succès, un jet de 1d6 dommages est effectué. En cas d'échec, un jet de 2d6 dommages est effectué. Les dommages apparaissent dans le chat avec les boutons d'application.

### Test avec application de statuts
```
@Test[car:per|diff:15|echstatut:stun]
```
Demande un test de Perception. En cas d'échec, le statut "Étourdi" est automatiquement appliqué au personnage.

### Test avec plusieurs statuts
```
@Test[car:for|diff:18|echstatut:overturned,stun]
```
Demande un test de Force. En cas d'échec, les statuts "Renversé" et "Étourdi" sont appliqués.

### Test secret
```
@Test[car:per|diff:12|comp:perception|options:secret]
```
Demande un test de Perception en mode secret. Le résultat du jet n'est visible que par le MJ.

### Exemple complet
```
@Test[car:con|diff:14|comp:résistance|suc:résiste à la maladie|ech:contracte la peste|echdm:1d8|echstatut:weakened,poison|options:secret]
```
Demande un test de Constitution difficulté 14 :
- Compétence : résistance
- En cas de succès : message "résiste à la maladie"
- En cas d'échec : message "contracte la peste", 1d8 dommages, statuts Affaibli et Empoisonné appliqués
- Le jet est effectué en mode secret

## Affichage

### Dans le journal
Le lien s'affiche sous la forme d'une icône de dé suivie du nom de la caractéristique, de la compétence et de la difficulté, par exemple : **Constitution (résistance) Difficulté 14**.

Les informations de succès, échec, dommages, statuts et options sont masquées mais visibles dans une info-bulle au survol du lien, uniquement pour le MJ.

### Dans le chat
Lorsqu'un joueur clique sur le lien dans le journal, un message de demande de jet apparaît dans le chat avec :
- Le titre du test
- La difficulté (si définie)
- Un bouton pour effectuer le jet
- Les conséquences succès/échec (visibles uniquement par le MJ)

Après le jet :
- Le résultat du jet de compétence apparaît
- Si des dommages sont configurés, un message de dommages avec boutons d'application apparaît
- Si des statuts sont configurés, ils sont automatiquement appliqués au personnage

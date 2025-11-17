/*
ACTIVE_EFFECT_MODES : CUSTOM = 0, MULTIPLY = 1, ADD = 2, DOWNGRADE = 3, UPGRADE = 4, OVERRIDE = 5

États préjudiciables
  Aveuglé : -5 en Init., attaque et DEF, -10 en attaque à distance. Les attaques magiques nécessitant de voir la cible sont impossibles.
  Affaibli : Dé malus à tous les tests.
  Essoufflé : Le déplacement est limité à 5 m par action de mouvement.
  Étourdi : Aucune action possible et -5 en DEF.
  Immobilisé : Pas de déplacement et dé malus aux tests d’attaque.
  Invalide : Le déplacement est limité à 5 m par action de mouvement.
  Paralysé : Aucune action possible, en cas d’attaque touché automatiquement et subit un critique.
  Ralenti : Une seule action par round (action d’attaque ou de mouvement).
  Renversé : -5 en attaque et DEF, nécessite une action d’attaque pour se relever.
  Surpris : Pas d’action et ‑5 en DEF au premier round de combat.

  Aveuglé : blind
  Affaibli : weakened
  Essoufflé : outOfBreath
  Étourdi : stun
  Immobilisé : immobilized
  Invalide : invalid
  Paralysé : paralysis
  Ralenti : slowed
  Renversé : overturned
  Surpris : surprised

Autres états
  dead : Mort
  confused : Confus
  silence : Réduit au silence
  bleeding : En train de saigner
  poison : Empoisonné
  invisible : Invisible
  unconscious : Inconscient
  partialDef : En défense partielle (A)
  fullDef : En défense totale (B)
  customEffect : Subit des effets additionnels

*/

/**
 * TODO : Ajouter le dé malus sur melee distance et magique pour affaibli/weakened
 */

export const CUSTOM_STATUS_EFFECT = [
  {
    id: "dead",
    name: "CO.customStatus.dead",
    img: "icons/svg/skull.svg",
    changes: [
      {
        key: "system.attributes.hp.value",
        mode: 5,
        value: 0,
      },
    ],
    description: "CO.customStatus.deadDescription",
  },
  {
    id: "confused",
    name: "CO.customStatus.confused",
    img: "icons/svg/daze.svg",
    description: "CO.customStatus.confusedDescription",
  },
  {
    id: "enslaved",
    name: "CO.customStatus.enslaved",
    img: "icons/svg/stoned.svg",
    description: "CO.customStatus.enslavedDescription",
  },
  {
    id: "immobilized",
    name: "CO.customStatus.immobilized",
    img: "systems/co2/ui/effects/immobilized.webp",
    changes: [
      {
        key: "system.attributes.movement.base",
        mode: 5,
        value: 0,
      },
      {
        key: "system.attributes.movement.bonuses.sheet",
        mode: 5,
        value: 0,
      },
      {
        key: "system.attributes.movement.bonuses.effects",
        mode: 5,
        value: 0,
      },
    ],
    description: "CO.CustomStatus.immobilizedDescription",
  },
  {
    id: "stun",
    name: "CO.customStatus.stun",
    img: "icons/svg/daze.svg",
    changes: [
      {
        key: "system.combat.def.bonuses.effects",
        mode: 2,
        value: -5,
      },
    ],
    description: "CO.customStatus.stunDescription",
  },
  {
    id: "paralysis",
    name: "CO.customStatus.paralysis",
    img: "icons/svg/paralysis.svg",
    changes: [
      {
        key: "system.attributes.movement.base",
        mode: 5,
        value: 0,
      },
      {
        key: "system.attributes.movement.bonuses.sheet",
        mode: 5,
        value: 0,
      },
      {
        key: "system.attributes.movement.bonuses.effects",
        mode: 5,
        value: 0,
      },
    ],
    description: "CO.customStatus.paralysisDescription",
  },
  {
    id: "blind",
    name: "CO.customStatus.blind",
    img: "icons/svg/blind.svg",
    changes: [
      {
        key: "system.combat.melee.bonuses.effects",
        mode: 2,
        value: -5,
      },
      {
        key: "system.combat.ranged.bonuses.effects",
        mode: 2,
        value: -10,
      },
      {
        key: "system.combat.init.bonuses.effects",
        mode: 2,
        value: -5,
      },
      {
        key: "system.combat.def.bonuses.effects",
        mode: 2,
        value: -5,
      },
    ],
    description: "CO.customStatus.blindDescription",
  },
  {
    id: "silence",
    name: "CO.customStatus.silence",
    img: "icons/svg/silenced.svg",
  },
  {
    id: "outOfBreath",
    name: "CO.customStatus.outOfBreath",
    img: "systems/co2/ui/effects/breath.webp",
    changes: [
      {
        key: "system.attributes.movement.base",
        mode: 5,
        value: 5,
      },
      {
        key: "system.attributes.movement.bonuses.sheet",
        mode: 5,
        value: 0,
      },
      {
        key: "system.attributes.movement.bonuses.effects",
        mode: 5,
        value: 0,
      },
    ],
    description: "CO.customStatus.outOfBreathDescription",
  },
  {
    id: "bleeding",
    name: "CO.customStatus.bleeding",
    img: "icons/svg/blood.svg",
  },
  {
    id: "invalid",
    name: "CO.customStatus.invalid",
    img: "systems/co2/ui/effects/disably.webp",
    changes: [
      {
        key: "system.attributes.movement.bonuses.effects",
        mode: 2,
        value: -5,
      },
    ],
    description: "CO.customStatus.invalidDescription",
  },
  {
    id: "poison",
    name: "CO.customStatus.poison",
    img: "icons/svg/poison.svg",
  },
  {
    id: "slowed",
    name: "CO.customStatus.slowed",
    img: "systems/co2/ui/effects/slow.webp",
    description: "CO.customStatus.slowedDescription",
  },
  {
    id: "overturned",
    name: "CO.customStatus.overturned",
    img: "systems/co2/ui/effects/upsidedown.webp",
    changes: [
      {
        key: "system.combat.melee.bonuses.effects",
        mode: 2,
        value: -5,
      },
      {
        key: "system.combat.ranged.bonuses.effects",
        mode: 2,
        value: -5,
      },
      {
        key: "system.combat.magic.bonuses.effects",
        mode: 2,
        value: -5,
      },
      {
        key: "system.combat.def.bonuses.effects",
        mode: 2,
        value: -5,
      },
    ],
    description: "CO.customStatus.overturnedDescription",
  },
  {
    id: "surprised",
    name: "CO.customStatus.surprised",
    img: "systems/co2/ui/effects/surprised.webp",
    changes: [
      {
        key: "system.combat.def.bonuses.effects",
        mode: 2,
        value: -5,
      },
    ],
    description: "CO.customStatus.surprisedDescription",
  },
  {
    id: "weakened",
    name: "CO.customStatus.weakened",
    img: "icons/svg/downgrade.svg",
    description: "CO.customStatus.weakenedDescription",
  },
  {
    id: "invisible",
    name: "CO.customStatus.invisible",
    img: "icons/svg/invisible.svg",
  },
  {
    id: "unconscious",
    name: "CO.customStatus.unconscious",
    img: "icons/svg/unconscious.svg",
  },
  {
    id: "partialDef",
    name: "CO.customStatus.partialDef",
    img: "systems/co2/ui/effects/partialdef.webp",
    changes: [
      {
        key: "system.combat.def.bonuses.effects",
        mode: 2,
        value: 3,
      },
    ],
    description: "CO.customStatus.partialDefDescription",
  },
  {
    id: "fullDef",
    name: "CO.customStatus.fullDef",
    img: "systems/co2/ui/effects/totaldef.webp",
    changes: [
      {
        key: "system.combat.def.bonuses.effects",
        mode: 2,
        value: 5,
      },
    ],
    description: "CO.customStatus.fullDefDescription",
  },
  {
    id: "customEffect",
    name: "CO.customStatus.customEffect",
    img: "icons/svg/aura.svg",
    description: "CO.customStatus.customEffectDescription",
  },
]

export const CUSTOM_EFFECT = {
  damageOrHeal: {
    id: "damageOrHeal",
    name: "CO.customEffect.damageOrHeal",
    description: "CO.customEffect.damageOrHealDescription",
  },
  status: {
    id: "status",
    name: "CO.customEffect.status",
    description: "CO.customEffect.statusDescription",
  },
  buff: {
    id: "buff",
    name: "CO.customEffect.buff",
    description: "CO.customEffect.buffDescription",
  },
  debuff: {
    id: "debuff",
    name: "CO.customEffect.debuff",
    description: "CO.customEffect.debuffDescription",
  },
}

export const CUSTOM_EFFECT_ELEMENT = {
  acid: {
    id: "acid",
    label: "CO.customEffect.acid",
    description: "CO.customEffect.acidDescription",
  },
  lightning: {
    id: "lightning",
    label: "CO.customEffect.lightning",
    description: "CO.customEffect.lightningDescription",
  },
  fire: {
    id: "fire",
    label: "CO.customEffect.fire",
    description: "CO.customEffect.fireDescription",
  },
  ice: {
    id: "ice",
    label: "CO.customEffect.ice",
    description: "CO.customEffect.iceDescription",
  },
  disease: {
    id: "disease",
    label: "CO.customEffect.disease",
    description: "CO.customEffect.diseaseDescription",
  },
  poison: {
    id: "poison",
    label: "CO.customEffect.poison",
    description: "CO.customEffect.poisonDescription",
  },
  putrid: {
    id: "putrid",
    label: "CO.customEffect.putrid",
    description: "CO.customEffect.putridDescription",
  },
  sacred: {
    id: "sacred",
    label: "CO.customEffect.sacred",
    description: "CO.customEffect.sacredDescription",
  },
}

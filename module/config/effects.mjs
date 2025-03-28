/*
    Pour mémoire : ACTIVE_EFFECT_MODES : CUSTOM = 0, MULTIPLY = 1, ADD = 2, DOWNGRADE = 3, UPGRADE = 4, OVERRIDE = 5
    C:\Program Files\Foundry Virtual Tabletop\resources\app\common\constants.mjs

 
    Liste des specialStatusEffects
    {
        "DEFEATED": "dead",
        "INVISIBLE": "invisible",
        "BLIND": "blind",
        "BURROW": "burrow",
        "HOVER": "hover",
        "FLY": "fly"
    }
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
    id: "immobilized",
    name: "CO.customStatus.immobilized",
    img: "systems/co/ui/effects/immobilized.webp",
    changes: [
      {
        key: "system.attribute.movment.base",
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
    img: "systems/co/ui/effects/breath.webp",
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
    img: "systems/co/ui/effects/disably.webp",
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
    img: "systems/co/ui/effects/slow.webp",
    description: "CO.customStatus.slowedDescription",
  },
  {
    id: "overturned",
    name: "CO.customStatus.overturned",
    img: "systems/co/ui/effects/upsidedown.webp",
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
    img: "systems/co/ui/effects/surprised.webp",
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
    changes: [
      {
        key: "system.abilities.agi.superior",
        mode: 5,
        value: false,
      },
      {
        key: "system.abilities.con.superior",
        mode: 5,
        value: false,
      },
      {
        key: "system.abilities.for.superior",
        mode: 5,
        value: false,
      },
      {
        key: "system.abilities.per.superior",
        mode: 5,
        value: false,
      },
      {
        key: "system.abilities.cha.superior",
        mode: 5,
        value: false,
      },
      {
        key: "system.abilities.int.superior",
        mode: 5,
        value: false,
      },
      {
        key: "system.abilities.vol.superior",
        mode: 5,
        value: false,
      },
    ],
    description: "CO.customStatus.weakenedDescription",
  },
  {
    id: "invisible",
    name: "CO.customStatus.Invisible",
    img: "icons/svg/invisible.svg",
  },
  {
    id: "unconscious",
    name: "Inconscient",
    img: "icons/svg/unconscious.svg",
  },
  {
    id: "partialDef",
    name: "CO.customStatus.partialDef",
    img: "systems/co/ui/effects/partialdef.webp",
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
    img: "systems/co/ui/effects/totalDef.webp",
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
    id: "dance",
    name: "CO.customStatus.dance",
    img: "systems/co/ui/effects/dance.webp",
    changes: [
      {
        key: "system.combat.def.bonuses.effects",
        mode: 2,
        value: -5,
      },
    ],
    description: "CO.customStatus.danceDescription",
  },
  {
    id: "herosong",
    name: "CO.customStatus.heroSong",
    img: "systems/co/ui/effects/herosong.webp",
    description: "CO.customStatus.heroSongDescription",
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
  fire: {
    id: "fire",
    name: "CO.customEffect.fire",
    description: "CO.customEffect.fireDescription",
  },
  ice: {
    id: "ice",
    name: "CO.customEffect.ice",
    description: "CO.customEffect.iceDescription",
  },
  lightning: {
    id: "lightning",
    name: "CO.customEffect.lightning",
    description: "CO.customEffect.lightningDescription",
  },
  poison: {
    id: "poison",
    name: "CO.customEffect.poison",
    description: "CO.customEffect.poisonDescription",
  },
  sacred: {
    id: "sacred",
    name: "CO.customEffect.sacred",
    description: "CO.customEffect.sacredDescription",
  },
  putrid: {
    id: "putrid",
    name: "CO.customEffect.putrid",
    description: "CO.customEffect.putridDescription",
  },
  disease: {
    id: "disease",
    name: "CO.customEffect.disease",
    description: "CO.customEffect.diseaseDescription",
  },
}

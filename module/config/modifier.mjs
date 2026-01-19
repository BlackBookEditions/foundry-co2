export const MODIFIERS_TYPE = Object.freeze({
  equipment: {
    id: "equipment",
    label: "CO.modifier.type.equipment",
  },
  feature: {
    id: "feature",
    label: "CO.modifier.type.feature",
  },
  profile: {
    id: "profile",
    label: "CO.modifier.type.profile",
  },
  capacity: {
    id: "capacity",
    label: "CO.modifier.type.capacity",
  },
  attack: {
    id: "attack",
    label: "CO.modifier.type.attack",
  },
})

export const MODIFIERS_SUBTYPE = Object.freeze({
  ability: {
    id: "ability",
    label: "CO.modifier.subtype.ability",
  },
  combat: {
    id: "combat",
    label: "CO.modifier.subtype.combat",
  },
  attribute: {
    id: "attribute",
    label: "CO.modifier.subtype.attribute",
  },
  resource: {
    id: "resource",
    label: "CO.modifier.subtype.resource",
  },
  skill: {
    id: "skill",
    label: "CO.modifier.subtype.skill",
  },
  state: {
    id: "state",
    label: "CO.modifier.subtype.state",
  },
  bonusDice: {
    id: "bonusDice",
    label: "CO.modifier.subtype.bonusDice",
  },
  malusDice: {
    id: "malusDice",
    label: "CO.modifier.subtype.malusDice",
  },
})

export const MODIFIERS_TARGET = Object.freeze({
  all: {
    id: "all",
    label: "CO.abilities.long.all",
    subtype: "ability",
  },
  agi: {
    id: "agi",
    label: "CO.abilities.long.agi",
    subtype: "ability",
  },
  con: {
    id: "con",
    label: "CO.abilities.long.con",
    subtype: "ability",
  },
  for: {
    id: "for",
    label: "CO.abilities.long.for",
    subtype: "ability",
  },
  per: {
    id: "per",
    label: "CO.abilities.long.per",
    subtype: "ability",
  },
  cha: {
    id: "cha",
    label: "CO.abilities.long.cha",
    subtype: "ability",
  },
  int: {
    id: "int",
    label: "CO.abilities.long.int",
    subtype: "ability",
  },
  vol: {
    id: "vol",
    label: "CO.abilities.long.vol",
    subtype: "ability",
  },
  melee: {
    id: "melee",
    label: "CO.combat.long.melee",
    subtype: "attack",
  },
  ranged: {
    id: "ranged",
    label: "CO.combat.long.ranged",
    subtype: "attack",
  },
  magic: {
    id: "magic",
    label: "CO.combat.long.magic",
    subtype: "attack",
  },
  init: {
    id: "init",
    label: "CO.combat.long.init",
    subtype: "combat",
  },
  def: {
    id: "def",
    label: "CO.combat.long.def",
    subtype: "combat",
  },
  crit: {
    id: "crit",
    label: "CO.combat.long.crit",
    subtype: "combat",
  },
  damMelee: {
    id: "damMelee",
    label: "CO.label.long.damMelee",
    subtype: "combat",
  },
  damRanged: {
    id: "damRanged",
    label: "CO.label.long.damRanged",
    subtype: "combat",
  },
  damMagic: {
    id: "damMagic",
    label: "CO.label.long.damMagic",
    subtype: "combat",
  },
  dr: {
    id: "dr",
    label: "CO.combat.long.dr",
    subtype: "combat",
  },
  hp: {
    id: "hp",
    label: "CO.label.long.hp",
    subtype: "attribute",
  },
  mov: {
    id: "mov",
    label: "CO.label.long.movement",
    subtype: "attribute",
  },
  recoveryFast: {
    id: "recoveryFast",
    label: "CO.label.long.recoveryFast",
    subtype: "attribute",
  },
  recoveryFull: {
    id: "recoveryFull",
    label: "CO.label.long.recoveryFull",
    subtype: "attribute",
  },
  rp: {
    id: "rp",
    label: "CO.label.long.rp",
    subtype: "resource",
  },
  fp: {
    id: "fp",
    label: "CO.label.long.fp",
    subtype: "resource",
  },
  mp: {
    id: "mp",
    label: "CO.label.long.mp",
    subtype: "resource",
  },
  darkvision: {
    id: "darkvision",
    label: "CO.label.long.darkvision",
    subtype: "state",
  },
  fearImmunity: {
    id: "fearImmunity",
    label: "CO.label.long.fearImmunity",
    subtype: "state",
  },
  sleepimmunity: {
    id: "sleepimmunity",
    label: "CO.label.long.sleepimmunity",
    subtype: "state",
  },
  poisonImmunity: {
    id: "poisonImmunity",
    label: "CO.label.long.poisonImmunity",
    subtype: "state",
  },
  diseaseImmunity: {
    id: "diseaseImmunity",
    label: "CO.label.long.diseaseImmunity",
    subtype: "state",
  },
  enslavementImmunity: {
    id: "enslavementImmunity",
    label: "CO.label.long.enslavementImmunity",
    subtype: "state",
  },
  movemenAlterationImmunity: {
    id: "movemenAlterationImmunity",
    label: "CO.label.long.movemenAlterationImmunity",
    subtype: "state",
  },
})

export const MODIFIERS_APPLY = Object.freeze({
  self: {
    id: "self",
    label: "CO.modifier.apply.self",
  },
  others: {
    id: "others",
    label: "CO.modifier.apply.others",
  },
  both: {
    id: "both",
    label: "CO.modifier.apply.both",
  },
})

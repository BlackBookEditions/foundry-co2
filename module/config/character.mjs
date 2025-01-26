export const ABILITIES = {
  agi: {
    id: "agi",
    label: "CO.abilities.long.agi",
  },
  con: {
    id: "con",
    label: "CO.abilities.long.con",
  },
  for: {
    id: "for",
    label: "CO.abilities.long.for",
  },
  per: {
    id: "per",
    label: "CO.abilities.long.per",
  },
  cha: {
    id: "cha",
    label: "CO.abilities.long.cha",
  },
  int: {
    id: "int",
    label: "CO.abilities.long.int",
  },
  vol: {
    id: "vol",
    label: "CO.abilities.long.vol",
  },
}

export const RESOURCES = {
  fortune: {
    id: "fortune",
    label: "CO.resources.long.fortune",
    ability: "cha",
  },
  recovery: {
    id: "recovery",
    label: "CO.resources.long.recovery",
    ability: "con",
  },
  mana: {
    id: "mana",
    label: "CO.resources.long.mana",
    ability: "vol",
  },
}

export const COMBAT = {
  init: {
    id: "init",
    label: "CO.combat.long.init",
    ability: "per",
  },
  def: {
    id: "def",
    label: "CO.combat.long.def",
    ability: "agi",
  },
  melee: {
    id: "melee",
    label: "CO.combat.long.melee",
    ability: "for",
  },
  ranged: {
    id: "ranged",
    label: "CO.combat.long.ranged",
    ability: "agi",
  },
  magic: {
    id: "magic",
    label: "CO.combat.long.magic",
    ability: "vol",
  },
}

export const ATTACK_TYPE = {
  melee: {
    id: "melee",
    label: "CO.combat.long.melee",
    ability: "for",
  },
  ranged: {
    id: "ranged",
    label: "CO.combat.long.ranged",
    ability: "agi",
  },
  magic: {
    id: "magic",
    label: "CO.combat.long.magic",
    ability: "vol",
  },
}

export const BASE_FORTUNE = 2
export const BASE_RECOVERY = 2
export const BASE_INITIATIVE = 10
export const BASE_DEFENSE = 1

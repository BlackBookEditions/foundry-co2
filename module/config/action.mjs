export const ACTION_TYPES = Object.freeze({
  spell: {
    id: "spell",
    label: "CO.action.types.spell",
  },
  melee: {
    id: "melee",
    label: "CO.action.types.melee",
  },
  ranged: {
    id: "ranged",
    label: "CO.action.types.ranged",
  },
  magical: {
    id: "magical",
    label: "CO.action.types.magical",
  },
  heal: {
    id: "heal",
    label: "CO.action.types.heal",
  },
  buff: {
    id: "buff",
    label: "CO.action.types.buff",
  },
  debuff: {
    id: "debuff",
    label: "CO.action.types.debuff",
  },
  consumable: {
    id: "consumable",
    label: "CO.action.types.consumable",
  },
})

export const CONDITION_OBJECTS = Object.freeze({
  item: {
    id: "item",
    label: "CO.condition.objects.item",
  },
  target: {
    id: "target",
    label: "CO.condition.objects.target",
  },
  _self: {
    id: "_self",
    label: "CO.condition.objects._self",
  },
  testResult: {
    id: "testResult",
    label: "CO.condition.objects.testresult",
  },
  testType: {
    id: "testType",
    label: "CO.condition.objects.testtype",
  },
  nc: {
    id: "nc",
    label: "CO.condition.objects.nc",
  },
  hp: {
    id: "hp",
    label: "CO.condition.objects.hp",
  },
  equippedArmor: {
    id: "equippedArmor",
    label: "CO.condition.objects.equippedArmor",
  },
  equipedWeapon: {
    id: "equipedWeapon",
    label: "CO.condition.objects.equipedWeapon",
  },
})

export const CONDITION_PREDICATES = Object.freeze({
  isEquipped: {
    id: "isEquipped",
    label: "CO.condition.predicates.isEquipped",
  },
  isLearned: {
    id: "isLearned",
    label: "CO.condition.predicates.isLearned",
  },
  isOwned: {
    id: "isOwned",
    label: "CO.condition.predicates.isOwned",
  },
  isLinkedActionActivated: {
    id: "isLinkedActionActivated",
    label: "CO.condition.predicates.isLinkedActionActivated",
  },
  isTagged: {
    id: "isTagged",
    label: "CO.condition.predicates.isTagged",
  },
})

export const CONDITION_TARGETS = Object.freeze({
  item: {
    id: "item",
    label: "CO.condition.targets.item",
  },
  target: {
    id: "target",
    label: "CO.condition.targets.target",
  },
  _self: {
    id: "_self",
    label: "CO.condition.targets._self",
  },
  isSuccess: {
    id: "isSuccess",
    label: "CO.condition.targets.isSuccess",
  },
  isFailure: {
    id: "isFailure",
    label: "CO.condition.targets.isFailure",
  },
  isCritical: {
    id: "isAbilityType",
    label: "CO.condition.targets.isCritical",
  },
  formula: {
    id: "formula",
    label: "CO.condition.targets.formula",
  },
  melee: {
    id: "isAbilityType",
    label: "CO.condition.targets.melee",
  },
  ranged: {
    id: "isAbilityType",
    label: "CO.condition.targets.ranged",
  },
  magic: {
    id: "isAbilityType",
    label: "CO.condition.targets.magic",
  },
  noArmor: {
    id: "isAbilityType",
    label: "CO.condition.targets.noArmor",
  },
})

export const RESOLVER_TYPE = Object.freeze({
  auto: {
    id: "auto",
    label: "CO.resolver.types.auto",
  },
  attack: {
    id: "attack",
    label: "CO.resolver.types.attack",
  },
  heal: {
    id: "heal",
    label: "CO.resolver.types.heal",
  },
  buffDebuff: {
    id: "buffDebuff",
    label: "CO.resolver.types.buffDebuff",
  },
  consumable: {
    id: "consumable",
    label: "CO.action.types.consumable",
  },
})

export const RESOLVER_TARGET = Object.freeze({
  none: {
    id: "none",
    label: "CO.resolver.target.none",
  },
  self: {
    id: "self",
    label: "CO.resolver.target.self",
  },
  single: {
    id: "single",
    label: "CO.resolver.target.single",
  },
  multiple: {
    id: "multiple",
    label: "CO.resolver.target.multiple",
  },
})

export const RESOLVER_SCOPE = Object.freeze({
  allies: {
    id: "allies",
    label: "CO.resolver.scope.allies",
  },
  enemies: {
    id: "enemies",
    label: "CO.resolver.scope.enemies",
  },
  all: {
    id: "all",
    label: "CO.resolver.scope.all",
  },
})

export const RESOLVER_RESULT = Object.freeze({
  always: {
    id: "always",
    label: "CO.resolver.additionalEffect.always",
  },
  success: {
    id: "success",
    label: "CO.resolver.additionalEffect.onSuccess",
  },
  successTreshold: {
    id: "successTreshold",
    label: "CO.resolver.additionalEffect.onSuccessTreshold",
  },
  critical: {
    id: "critical",
    label: "CO.resolver.additionalEffect.onCritical",
  },
  failure: {
    id: "failure",
    label: "CO.resolver.additionalEffect.onFailure",
  },
})

export const RESOLVER_FORMULA_TYPE = Object.freeze({
  damage: {
    id: "damage",
    label: "CO.resolver.formula.damage",
  },
  heal: {
    id: "heal",
    label: "CO.resolver.formula.heal",
  },
})

export const RESOLVER_ADDITIONAL_EFFECT_STATUS = {
  dead: {
    id: "dead",
    label: "CO.customStatus.dead",
  },
  immobilized: {
    id: "immobilized",
    label: "CO.customStatus.immobilized",
  },
  stun: {
    id: "stun",
    label: "CO.customStatus.stun",
  },
  paralysis: {
    id: "paralysis",
    label: "CO.customStatus.paralysis",
  },
  blind: {
    id: "blind",
    label: "CO.customStatus.blind",
  },
  silence: {
    id: "silence",
    label: "CO.customStatus.silence",
    img: "icons/svg/silenced.svg",
  },
  outOfBreath: {
    id: "outOfBreath",
    label: "CO.customStatus.outOfBreath",
  },
  bleeding: {
    id: "bleeding",
    label: "CO.customStatus.bleeding",
  },
  invalid: {
    id: "invalid",
    label: "CO.customStatus.invalid",
  },
  poison: {
    id: "poison",
    label: "CO.customStatus.poison",
  },
  slowed: {
    id: "slowed",
    label: "CO.customStatus.slowed",
  },
  overturned: {
    id: "overturned",
    label: "CO.customStatus.overturned",
  },
  surprised: {
    id: "surprised",
    label: "CO.customStatus.surprised",
  },
  weakened: {
    id: "weakened",
    label: "CO.customStatus.weakened",
  },
  invisible: {
    id: "invisible",
    label: "CO.customStatus.invisible",
  },
  unconscious: {
    id: "unconscious",
    label: "CO.customStatus.unconscious",
  },
  confused: {
    id: "confused",
    label: "CO.customStatus.confused",
  },
}

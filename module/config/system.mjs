import * as ACTOR from "./actor.mjs"
import * as CHARACTER from "./character.mjs"
import * as ENCOUNTER from "./encounter.mjs"
import * as ITEM from "./item.mjs"
import * as ACTION from "./action.mjs"
import * as CAPACITY from "./capacity.mjs"
import * as EQUIPMENT from "./equipment.mjs"
import * as FEATURE from "./feature.mjs"
import * as MODIFIERS from "./modifier.mjs"
import * as PATH from "./path.mjs"
import * as PROFILE from "./profile.mjs"
import * as EFFECTS from "./effects.mjs"
import * as COMBAT from "./combat.mjs"
import * as CHAT from "./chat.mjs"
import * as TEMPLATE from "./template.mjs"

export const ASCII = `
   ******    *******  
  **////**  **/////**  
 **    //  **     //**      
/**       /**      /** 
/**       /**      /**  
//**    **//**     **       
 //******  //*******        
  //////    ///////   `

export const SYSTEM_ID = "co"
export const SYSTEM_DESCRIPTION = "Chroniques Oubliées"

export const MOVEMENT_UNIT = { m: "CO.label.long.meters", ft: "CO.label.long.feet" }
export const SIZES = {
  tiny: "CO.size.tiny",
  verySmall: "CO.size.verySmall",
  small: "CO.size.small",
  medium: "CO.size.medium",
  large: "CO.size.large",
  huge: "CO.size.huge",
  colossal: "CO.size.colossal",
}
export const TOKEN_SIZE = {
  tiny: {
    size: 0.5,
    scale: 0.5,
  },
  verySmall: {
    size: 0.5,
    scale: 1,
  },
  small: {
    size: 1,
    scale: 0.75,
  },
  medium: {
    size: 1,
    scale: 1,
  },
  large: {
    size: 2,
    scale: 1,
  },
  huge: {
    size: 3,
    scale: 1,
  },
  colossal: {
    size: 4,
    scale: 1,
  },
}

export const DICES = { d4: "d4", d6: "d6", d8: "d8", d10: "d10", d12: "d12", d20: "d20" }
export const EVOLVING_DICES = ["d4", "d6", "d8", "d10", "d12", "2d6"]
export const RECOVERY_DICES = { d6: "d6", d8: "d8", d10: "d10" }
export const PV = { 3: "3", 4: "4", 5: "5" }

/**
 * Points d'extension des règles de statuts propres aux univers.
 * Les modules de règles peuplent ces tables pendant leur hook init.
 */
export const STATUS_RULES = {
  replacements: {},
  incomingAttack: {},
}

/**
 * Include all constant definitions within the SYSTEM global export
 * @type {Object}
 */
/**
 * Modules d'animation qui transmettent déjà les actions co2 à Automated Animations. Si l'un d'eux est actif, le système
 * n'active pas sa propre intégration, pour qu'aucune animation ne parte deux fois. Un module peut s'y ajouter lui-même
 * avant le hook ready : `SYSTEM.ANIMATION_MODULES.push("mon-module")`.
 */
export const ANIMATION_MODULES = ["cof2-animations"]

export const SYSTEM = {
  ID: SYSTEM_ID,
  SYSTEM_DESCRIPTION,
  ASCII,
  ABILITIES: CHARACTER.ABILITIES,
  ACTION_TYPES: ACTION.ACTION_TYPES,
  ACTOR_ICONS: ACTOR.ACTOR_ICONS,
  ANIMATION_MODULES,
  ATTACK_TYPE: CHARACTER.ATTACK_TYPE,
  BASE_INITIATIVE: CHARACTER.BASE_INITIATIVE,
  BASE_DEFENSE: CHARACTER.BASE_DEFENSE,
  BASE_FORTUNE: CHARACTER.BASE_FORTUNE,
  BASE_RECOVERY: CHARACTER.BASE_RECOVERY,
  BASE_CRITICAL: CHARACTER.BASE_CRITICAL,
  CAPACITY_ACTION_TYPE: CAPACITY.CAPACITY_ACTION_TYPE,
  CAPACITY_FREQUENCY: CAPACITY.CAPACITY_FREQUENCY,
  CAPACITY_MINIMUM_LEVEL: CAPACITY.CAPACITY_MINIMUM_LEVEL,
  CHAT_MESSAGE_TYPES: CHAT.CHAT_MESSAGE_TYPES,
  COMBAT: CHARACTER.COMBAT,
  COMBAT_UNITE: COMBAT.COMBAT_UNITE,
  CONDITION_OBJECTS: ACTION.CONDITION_OBJECTS,
  CONDITION_PREDICATES: ACTION.CONDITION_PREDICATES,
  CONDITION_TARGETS: ACTION.CONDITION_TARGETS,
  CURRENCY: EQUIPMENT.EQUIPMENT_CURRENCIES,
  CUSTOM_EFFECT: EFFECTS.CUSTOM_EFFECT,
  CUSTOM_EFFECT_ELEMENT: EFFECTS.CUSTOM_EFFECT_ELEMENT,
  DICES,
  EVOLVING_DICES,
  ENCOUNTER_ARCHETYPES: ENCOUNTER.ARCHETYPES,
  ENCOUNTER_CATEGORIES: ENCOUNTER.CATEGORIES,
  ENCOUNTER_BOSS_RANKS: ENCOUNTER.BOSS_RANKS,
  EQUIPMENT_DAMAGETYPE: EQUIPMENT.EQUIPMENT_DAMAGETYPE,
  EQUIPMENT_RARITY: EQUIPMENT.EQUIPMENT_RARITY,
  EQUIPMENT_SUBTYPES: EQUIPMENT.EQUIPMENT_SUBTYPES,
  EQUIPMENT_TAGS: EQUIPMENT.EQUIPMENT_TAGS,
  FAMILIES: PROFILE.FAMILIES,
  FEATURE_SUBTYPE: FEATURE.FEATURE_SUBTYPE,
  ITEM_ICONS: ITEM.ITEM_ICONS,
  ITEM_TYPE: ITEM.ITEM_TYPE,
  MODIFIERS_TYPE: MODIFIERS.MODIFIERS_TYPE,
  MODIFIERS_SUBTYPE: MODIFIERS.MODIFIERS_SUBTYPE,
  MODIFIERS_TARGET: MODIFIERS.MODIFIERS_TARGET,
  MODIFIERS_APPLY: MODIFIERS.MODIFIERS_APPLY,
  PATH_TYPES: PATH.PATH_TYPES,
  PV,
  RECOVERY_DICES,
  MODIFIERS,
  MOVEMENT_UNIT,
  RESOLVER_TYPE: ACTION.RESOLVER_TYPE,
  RESOLVER_TARGET: ACTION.RESOLVER_TARGET,
  RESOLVER_SCOPE: ACTION.RESOLVER_SCOPE,
  RESOLVER_RESULT: ACTION.RESOLVER_RESULT,
  RESOLVER_FORMULA_TYPE: ACTION.RESOLVER_FORMULA_TYPE,
  RESOLVER_ADDITIONAL_EFFECT_STATUS: ACTION.RESOLVER_ADDITIONAL_EFFECT_STATUS,
  RESOURCES: CHARACTER.RESOURCES,
  SIZES,
  STATUS_EFFECT: EFFECTS.CUSTOM_STATUS_EFFECT,
  statusRules: STATUS_RULES,
  TEMPLATE: TEMPLATE.TEMPLATE,
  TOKEN_SIZE,
}

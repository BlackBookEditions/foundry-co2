import { SYSTEM } from "../config/system.mjs"
import { GRIPS } from "./weapon-grip.mjs"

/* Vérifie les règles
  - isEquipped : type Equipement et équipé
  - isLearned : type Capacité et appris
  - isOwned : type Equipement ou Capacité et possédé par l'acteur
  - isLinkedActionActivated : action liée activée, utilise l'indice de l'action
  - isWieldedOneHand / isWieldedTwoHands : objet tenu à une main / à deux mains (prise en main déduite, cf. weapon-grip.mjs).
    À combiner avec isEquipped : la prise en main d'un objet non équipé est celle qu'il aurait s'il était équipé.
  - TO DO - isTagged : item tagué avec un tag spécifique
*/

export default class RulesEngine {
  static rules = [
    {
      name: "isEquipped",
      parameters: ["item"],
      expression: (object, item) => {
        const isEquipped = item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.equipped
        // Check if consumable has quantity > 0
        if (isEquipped && item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.consumable.id) {
          return item.system.quantity.current > 0
        }
        return isEquipped
      },
    },
    {
      name: "isLearned",
      parameters: ["item"],
      expression: (object, item) => item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.learned,
    },
    {
      name: "isOwned",
      parameters: ["item", "actor"],
      expression: (object, item, actor) => {
        const ownedItem = actor.items.find((i) => i.id === item.id)
        if (ownedItem !== undefined) {
          // Check if consumable has quantity > 0
          if (ownedItem.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.consumable.id) {
            return ownedItem.system.quantity.current > 0
          }
          return true
        }
        return false
      },
    },
    {
      name: "isLinkedActionActivated",
      parameters: ["object", "item"],
      expression: (object, item) => {
        if (item.system.actions[object]) return item.system.actions[object].properties.enabled
        else return false
      },
    },
    {
      name: "isWieldedOneHand",
      parameters: ["item"],
      expression: (object, item) => item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.grip === GRIPS.oneHand,
    },
    {
      name: "isWieldedTwoHands",
      parameters: ["item"],
      expression: (object, item) => item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.grip === GRIPS.twoHands,
    },
    /* {
      name: "isTagged",
      parameters: ["item", "tag"],
      expression: (object, item, tag) => item.tags && item.tags.includes(tag),
    },
    */
  ]

  static evaluate(condition, ...args) {
    const rule = this.rules.find((r) => r.name === condition.predicate) // Trouve la règle correspondante
    if (rule) {
      return rule.expression(condition.object, ...args) // Évalue l'expression avec les arguments
    }
    return false // Si la règle n'existe pas
  }
}

import ItemData from "./item.mjs"
import { Action } from "./schemas/action.mjs"
import { SYSTEM } from "../config/system.mjs"
export default class CapacityData extends ItemData {
  /**
   * Définie les éléments composant une capacité
   * {string} subtype : capacity
   * {string} actionType : none, l, a, m, f (Limité, Attaque, Mouvement)
   * {boolean} learned : Indique si on a appris ou pas la capacité
   * {object} charges : Compte le nombre d'utilisations restantes
   *
   */
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      subtype: new fields.StringField({ required: true, nullable: false, initial: "" }),
      actionType: new fields.StringField({ required: true, choices: SYSTEM.CAPACITY_ACTION_TYPE, initial: "none" }),
      learned: new fields.BooleanField({}),
      charges: new fields.SchemaField({
        current: new fields.NumberField({ required: false, nullable: true, integer: true, initial: 1 }),
        max: new fields.NumberField({ required: false, nullable: true, integer: true, initial: 1 }),
      }),
      properties: new fields.SchemaField({
        spell: new fields.BooleanField({}),
      }),
      path: new fields.DocumentUUIDField({ type: "Item" }),
      cost: new fields.NumberField({ required: true, nullable: false, integer: true, initial: -1 }),
      manaCost: new fields.NumberField({ required: true, nullable: false, integer: true, initial: -1 }),
      actions: new fields.ArrayField(new fields.EmbeddedDataField(Action)),
      frequency: new fields.StringField({ required: true, choices: SYSTEM.CAPACITY_FREQUENCY, initial: "none" }),
    })
  }

  get isSpell() {
    return this.properties.spell
  }

  get actionTypeShort() {
    if (this.hasActionType) return game.i18n.localize(`CO.capacity.action.short.${SYSTEM.CAPACITY_ACTION_TYPE[this.actionType].id}`)
    return ""
  }

  get isActionTypeAttack() {
    if (this.hasActionType) return this.actionType === "a"
    return false
  }

  get hasActionType() {
    return this.actionType !== "none"
  }

  get isLearned() {
    return this.learned
  }

  get hasCost() {
    return this.cost !== -1
  }

  get hasManaCost() {
    return this.manaCost !== -1
  }

  get hasFrequency() {
    return this.frequency !== "none"
  }

  /**
   * Calculates the cost based on the given rank.
   *
   * @param {number} rank The rank to determine the cost. Starts at 1.
   * @returns {number} The calculated cost. If the cost is different than -1, it returns this cost.
   *                   Otherwise, if the rank is 1 or 2, it returns 1. Otherwise, it returns 2.
   */
  getCost(rank) {
    if (this.hasCost) return this.cost
    if (rank === null) return 1 // Off path capacity
    if (rank === 1 || rank === 2) return 1
    return 2
  }
}

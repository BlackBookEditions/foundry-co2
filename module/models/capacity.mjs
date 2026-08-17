import ItemData from "./item.mjs"
import { Action } from "./schemas/action.mjs"
import { SYSTEM } from "../config/system.mjs"
export default class CapacityData extends ItemData {
  /**
   * Defines the schema for the capacity model.
   * This schema outlines the structure and validation rules for the model's fields.
   *
   * @returns {Object} The merged schema object containing the defined fields.
   *
   * Fields:
   * - `inGame` {HTMLField}: Describe how the capacity is represented in the game.
   * - `subtype` {StringField}: A required, non-nullable string field with an initial value of an empty string.
   * - `actionType` {StringField}: none, l, a, m, f (Limité, Attaque, Mouvement, Gratuite)
   * - `learned` {BooleanField}: A boolean field indicating whether the capacity is learned.
   * - `rank` {NumberField}:Rang de la capacité au sein d'une voie
   * - `frequency` {StringField}: A required string field with predefined choices from `SYSTEM.CAPACITY_FREQUENCY` and an initial value of "none".
   * - `charges` {SchemaField}: Compte le nombre d'utilisations restantes A schema field containing:
   *   - `current` {NumberField}: An optional, nullable integer field with an initial value of 1.
   *   - `max` {NumberField}: An optional, nullable integer field with an initial value of 1.
   * - `properties` {SchemaField}: A schema field containing:
   *   - `spell` {BooleanField}: A boolean field indicating if the property is a spell.
   * - `path` {DocumentUUIDField}: A field representing a document UUID of type "Item".
   * - `cost` {NumberField}: A required, non-nullable integer field with an initial value of -1.
   * - `manaCost` {NumberField}: A required, non-nullable integer field with an initial value of -1.
   * - `actions` {ArrayField}: An array field containing embedded data fields of type `Action`.
   * - `allowLinkedCapacity` {BooleanField}: A boolean field indicating if linked capacity is allowed.
   * - `linkedCapacity` {DocumentUUIDField}: A field representing a document UUID of type "Item" for linked capacity.
   * - `parentCapacity` {DocumentUUIDField}: A field representing a document UUID of type "Item" for the parent capacity which was used to learn this capacity.
   */
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      inGame: new fields.HTMLField({ textSearch: true }),
      subtype: new fields.StringField({ required: true, nullable: false, initial: "" }),
      actionType: new fields.StringField({ required: true, choices: SYSTEM.CAPACITY_ACTION_TYPE, initial: "none" }),
      learned: new fields.BooleanField({}),
      rank: new fields.NumberField({ required: false, nullable: true, integer: true, initial: 0, min: 0 }),
      frequency: new fields.StringField({ required: true, choices: SYSTEM.CAPACITY_FREQUENCY, initial: "none" }),
      charges: new fields.SchemaField({
        current: new fields.NumberField({ required: false, nullable: true, integer: true, min: 0 }),
        max: new fields.NumberField({ required: false, nullable: true, integer: true, min: 0 }),
      }),
      properties: new fields.SchemaField({
        spell: new fields.BooleanField({}),
      }),
      path: new fields.DocumentUUIDField({ type: "Item" }),
      cost: new fields.NumberField({ required: true, nullable: false, integer: true, initial: -1, min: -1 }),
      manaCost: new fields.NumberField({ required: true, nullable: false, integer: true, initial: -1, min: -1 }),
      actions: new fields.ArrayField(new fields.EmbeddedDataField(Action)),
      allowLinkedCapacity: new fields.BooleanField({ initial: false }),
      linkedCapacity: new fields.DocumentUUIDField({ type: "Item" }),
      parentCapacity: new fields.DocumentUUIDField({ type: "Item" }),
    })
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["CO.Capacity"]

  get isSpell() {
    return this.properties.spell
  }

  get actionTypeShortLabel() {
    return game.i18n.localize(`CO.capacity.action.short.${SYSTEM.CAPACITY_ACTION_TYPE[this.actionType].id}`)
  }

  get isActionTypeAttack() {
    if (this.hasActionType) return this.actionType === SYSTEM.CAPACITY_ACTION_TYPE.a.id
    return false
  }

  get hasActionType() {
    return this.actionType !== SYSTEM.CAPACITY_ACTION_TYPE.none.id
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

  get hasParent() {
    return this.parentCapacity !== null
  }

  /**
   * Une sous-capacité dont la capacité parente n'existe plus sur l'acteur : elle n'est rattachée à
   * rien de rendu sur la feuille, mais ses modificateurs continuent de s'appliquer.
   * @returns {boolean}
   */
  get hasOrphanParent() {
    if (!this.hasParent) return false
    const actor = this.parent?.actor
    if (!actor) return false
    return !actor.getEmbeddedItemByUuid(this.parentCapacity)
  }

  get hasFrequency() {
    return this.frequency !== SYSTEM.CAPACITY_FREQUENCY.none.id
  }

  get hasCharges() {
    return this.charges.current > 0
  }

  /**
   * Calculates the capacity points cost based on the rank.
   *
   * @returns {number} The calculated cost. If the cost is different than -1, it returns this cost.
   *                   Otherwise, if the rank is 1 or 2, it returns 1. Otherwise, it returns 2.
   */
  getXpCost() {
    if (this.hasCost) return this.cost
    if (this.path === null) return 1 // Off path capacity
    if (this.rank === 1 || this.rank === 2) return 1
    return 2
  }

  /**
   * Calculates and returns the mana cost for the current instance.
   *
   * @returns {number} The mana cost, which is determined by the following:
   *   - If `hasManaCost` is true, returns `manaCost`.
   *   - If `path` is null, returns 0.
   *   - Otherwise, returns `rank`.
   */
  getManaCost() {
    if (this.hasManaCost) return this.manaCost
    if (this.path === null) return 0 // Off path capacity
    return this.rank
  }

  /**
   * Calcule le coût en mana basé sur l'armure et la voie de l'acteur.
   * Si l'armure n'est pas définie, le coût est de 0.
   * Pour une capacité hors voie, le coût est de 0.
   *
   * @param {Object} actor L'objet acteur contenant l'armure et les objets.
   * @returns {number} Le coût en mana dérivé de la défense de l'armure dépassant la défense maximale autorisée par la voie.
   */
  getManaCostFromArmor(actor) {
    const armor = actor.mainArmor
    // Pas d'armure
    if (!armor) return 0
    // Capacité hors voie
    if (!this.path) return 0
    // Recherche la voie pour obtenir la défense maximale pour utiliser la capacité
    const { id } = foundry.utils.parseUuid(this.path)
    const path = actor.items.get(id)
    if (!path) return 0
    const maxDefenseArmor = path.system.maxDefenseArmor
    return Math.max(armor.system.defense - maxDefenseArmor, 0)
  }
}

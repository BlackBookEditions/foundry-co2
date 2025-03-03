import ItemData from "./item.mjs"
import { Action } from "./schemas/action.mjs"
import { SYSTEM } from "../config/system.mjs"

/**
 * @class EquipmentData
 * @extends {ItemData}
 * @type {string} subtype : Arme/Armures etc sous typed 'equipement
 * @type {string} martialCategory : catégorie de l'equiepement, ex : Baton, épée courte etc.
 * @type {string} damagetype : Type de dégat : perforant, tranchant, contondant
 * @type {object} quantity : Quantité stocké (nombre de flèches, ....)
 * @type {object} charges : nombre de charge dnas le cas d'un objet magique
 * @type {object} weight: Poid de l'équipement
 * @type {object} price: prix de l'équipement
 * @type {string} rarity: Difficultée à trouver l'objet en magasin
 * @type {boolean} equipped: indique si l'objet est équipé ou non
 * @type {object} properties: indique si l'objet peux ete équippé, cumulé, rechargé.
 * @type {object} usage: indique si on peux l'utiliser à 1 main, 2 mains ou les deux (1 main et demi)
 * @type {object} action : objet qui va gérer les effets de l'equiepement (ex : une attaque)
 */
export default class EquipmentData extends ItemData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      subtype: new fields.StringField({ required: true }),
      martialCategory: new fields.StringField({ required: true }),
      damagetype: new fields.StringField({ required: true }),
      quantity: new fields.SchemaField({
        current: new fields.NumberField({ required: true, nullable: false, initial: 1, integer: true }),
        max: new fields.NumberField({ required: false, nullable: true, integer: true }),
        destroyIfEmpty: new fields.BooleanField(),
      }),
      charges: new fields.SchemaField({
        current: new fields.NumberField({ integer: true }),
        max: new fields.NumberField({ integer: true }),
        destroyIfEmpty: new fields.BooleanField(),
      }),
      weight: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
        unit: new fields.StringField({ required: true, initial: "kg" }),
      }),
      price: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
        unit: new fields.StringField({ required: true }),
      }),
      rarity: new fields.StringField({ required: true }),
      equipped: new fields.BooleanField(),
      properties: new fields.SchemaField({
        equipable: new fields.BooleanField(),
        reloadable: new fields.BooleanField(),
        stackable: new fields.BooleanField(),
      }),
      usage: new fields.SchemaField({
        oneHand: new fields.BooleanField(),
        twoHand: new fields.BooleanField(),
      }),
      actions: new fields.ArrayField(new fields.EmbeddedDataField(Action)),
    })
  }

  get isWeapon() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.weapon.id
  }

  get isArmor() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.armor.id
  }

  get isShield() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.shield.id
  }

  get isMisc() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.misc.id
  }

  get isConsumable() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.consumable.id
  }

  get defense() {
    if (!this.isArmor) return 0
    // TODO Chercher le bonus de Combat/Défense dans les modifiers des actions
    return this.parent.getTotalModifiersByTypeSubtypeAndTarget(SYSTEM.MODIFIERS_TYPE.equipment.id, SYSTEM.MODIFIERS_SUBTYPE.combat.id, SYSTEM.MODIFIERS_TARGET.def.id)
  }
}

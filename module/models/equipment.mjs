import ItemData from "./item.mjs"
import { SYSTEM } from "../config/system.mjs"
import { BaseValue } from "./schemas/base-value.mjs"
import { Action } from "./schemas/action.mjs"
import { computeGrip, handsNeeded, isVersatile, matchesGrip, versatileState } from "../helpers/weapon-grip.mjs"

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
      // Pas de `choices` sur le champ : les tags propres à COF2 sont déclarés par un module de contenu (cf. cof2-base),
      // et un tag non déclaré dans le monde courant (module désactivé, compilation CLI des packs, timing d'init) ne doit
      // jamais faire échouer la validation — ce qui casserait l'acteur entier. Le picker curé est fourni par la feuille
      // (options=SYSTEM.EQUIPMENT_TAGS). Un tag inconnu est conservé, inerte : le système ne réagit à un tag que si la
      // règle correspondante est activée.
      tags: new fields.SetField(new fields.StringField({ required: false, blank: true })),
      martialCategory: new fields.StringField({ required: true }),
      damagetype: new fields.StringField({ required: true }),
      defense: new fields.NumberField({ integer: true, positive: true }),
      magicalDefense: new fields.NumberField({ integer: true }),
      quantity: new fields.SchemaField({
        current: new fields.NumberField({ required: true, nullable: false, initial: 1, integer: true, min: 0 }),
        max: new fields.NumberField({ required: false, nullable: true, integer: true, min: 0 }),
        destroyIfEmpty: new fields.BooleanField(),
      }),
      charges: new fields.SchemaField({
        current: new fields.NumberField({ integer: true, min: 0 }),
        max: new fields.NumberField({ integer: true, min: 0 }),
        destroyIfEmpty: new fields.BooleanField(),
      }),
      weight: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
        unit: new fields.StringField({ required: true, initial: "kg" }),
      }),
      price: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
        unit: new fields.StringField({ required: true, initial: "pa" }),
      }),
      rarity: new fields.StringField({ required: true, initial: "common", choices: SYSTEM.EQUIPMENT_RARITY }),
      equipped: new fields.BooleanField(),
      // UUID du contenant dans lequel l'objet est rangé, ou null s'il est libre
      container: new fields.DocumentUUIDField({ type: "Item", required: false, nullable: true, initial: null }),
      properties: new fields.SchemaField({
        equipable: new fields.BooleanField(),
        reloadable: new fields.BooleanField(),
        stackable: new fields.BooleanField(),
      }),
      usage: new fields.SchemaField({
        oneHand: new fields.BooleanField(),
        twoHand: new fields.BooleanField(),
        // Arme polyvalente : la tenir à une main même quand l'autre main est libre
        preferOneHand: new fields.BooleanField(),
      }),
      range: new fields.EmbeddedDataField(BaseValue, { label: "CO.ui.range", nullable: true }),
      actions: new fields.ArrayField(new fields.EmbeddedDataField(Action)),
    })
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["CO.Equipment"]

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

  get useHands() {
    if (this.usage.oneHand || this.usage.twoHand) return true
    return false
  }

  /**
   * L'objet occupe-t-il une main une fois équipé ? Seuls les armes, boucliers et objets divers comptent,
   * comme pour le contrôle des mains libres.
   * @returns {boolean}
   */
  get holdsInHands() {
    return (this.isWeapon || this.isShield || this.isMisc) && this.useHands
  }

  /**
   * Arme polyvalente : utilisable à une ou deux mains (les deux cases d'usage sont cochées).
   * @returns {boolean}
   */
  get isVersatile() {
    return isVersatile(this.usage)
  }

  /**
   * Nombre minimal de mains occupées une fois équipé : une arme polyvalente n'en exige qu'une.
   * @returns {number} 0, 1 ou 2.
   */
  get handsNeeded() {
    return handsNeeded(this.usage)
  }

  /**
   * Un autre objet tenu en main est-il équipé par le porteur ?
   * @returns {boolean}
   */
  get isOtherHandBusy() {
    const item = this.parent
    const actor = item?.actor
    if (!actor) return false
    return actor.items.some((other) => other.id !== item.id && other.type === SYSTEM.ITEM_TYPE.equipment.id && other.system.equipped && other.system.holdsInHands)
  }

  /**
   * Prise en main actuelle, déduite de ce que porte le personnage et jamais enregistrée.
   * Pour un objet non équipé, c'est la prise en main qu'il aurait s'il était équipé maintenant.
   * @returns {string|null} "oneHand", "twoHands", ou null si l'objet ne se tient pas en main.
   */
  get grip() {
    return computeGrip(this.usage, this.isVersatile && this.isOtherHandBusy)
  }

  /**
   * État d'une arme polyvalente, qui explique sa prise en main.
   * @returns {string|null} "twoHands", "oneHandPreferred", "oneHandBusy", ou null si l'objet n'est pas polyvalent.
   */
  get versatileState() {
    if (!this.isVersatile) return null
    return versatileState(this.usage, this.isOtherHandBusy)
  }

  /**
   * Action de référence d'une arme pour @arme.dmg et @arme.skill : la première action, ou pour une arme polyvalente
   * la première action dont les conditions de prise en main correspondent à la prise en main actuelle.
   * @returns {Action|undefined}
   */
  get weaponReferenceAction() {
    if (!this.isWeapon || this.actions.length === 0) return undefined
    if (this.isVersatile) {
      const grip = this.grip
      const action = this.actions.find((a) => a.resolvers.length > 0 && matchesGrip(a.conditions, grip))
      if (action) return action
    }
    return this.actions[0]
  }

  get isConsumable() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.consumable.id
  }

  get hasCharges() {
    return this.charges.current > 0
  }

  get hasQuantity() {
    return this.quantity.current > 0
  }

  /**
   * Calcule la valeur de défense totale de l'équipement.
   *
   * @returns {number} La valeur de défense totale, qui est la somme de la défense physique et magique.
   *                   Retourne 0 si l'équipement n'est ni une armure ni un bouclier.
   */
  get totalDefense() {
    if (!this.isArmor && !this.isShield) return 0
    return (this.defense || 0) + (this.magicalDefense ? this.magicalDefense : 0)
  }

  /**
   * Calcule le malus de surcharge pour l'équipement.
   *
   * @returns {number} Le malus de surcharge, qui est la défense physique moins la défense magique.
   *                   Retourne 0 si l'équipement n'est ni une armure ni un bouclier.
   */
  get overloadMalus() {
    if (!this.isArmor && !this.isShield) return 0
    let malus = this.defense || 0
    if (this.magicalDefense) malus -= this.magicalDefense
    return Math.max(0, malus)
  }

  /**
   * Calcule le malus magique pour l'équipement: nombre de PM supplémentaires nécessaires pour lancer un sort.
   *
   * @returns {number} Le malus magique, qui est la défense physique.
   *                   Retourne 0 si l'équipement n'est ni une armure ni un bouclier.
   */
  get magicalMalus() {
    if (!this.isArmor && !this.isShield) return 0
    return this.defense || 0
  }

  /**
   * Remonte les dommages de référence si c'est une arme, c'est-à-dire les dommages du premier resolver de l'action de référence (cf. weaponReferenceAction).
   *
   * @returns {string|undefined} La formule des dommages si l'équipement est une arme et possède des actions avec des résolveurs de dommages.
   *                             Retourne undefined sinon.
   */
  get damage() {
    const action = this.weaponReferenceAction
    if (action?.resolvers.length > 0) return action.resolvers[0].dmg.formula
    return undefined
  }

  /**
   * Remonte la formule d'attaque de référence si c'est une arme, c'est-à-dire la formule du premier resolver de l'action de référence (cf. weaponReferenceAction).
   *
   * @returns {string|undefined} La formule d'attaque si l'équipement est une arme et possède des actions avec des résolveurs de dommages.
   *                             Retourne undefined sinon.
   */
  get skill() {
    const action = this.weaponReferenceAction
    if (action?.resolvers.length > 0) return action.resolvers[0].skill.formula
    return undefined
  }
}

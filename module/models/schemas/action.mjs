import { Condition } from "./condition.mjs"
import { Modifier } from "./modifier.mjs"
import { Resolver } from "./resolver.mjs"

/**
 * Définition d'une action
 * @param {*} source L'item de type Equipment ou Capacity à l'origine de l'action
 * @param {*} indice numéro de l'action
 * @param {*} type
 * @param {*} img
 * @param {*} label
 * @param {*} chatFlavor
 * @param {boolean} visible  Définit si l'action est visible sur la fiche de personnage
 *  Une action sans conditions est visible
 *  Une action dont toutes les conditions sont vraies est visible
 * @param {boolean} activable Si true : un bouton permet de l'activer ou de la désactiver
 * @param {boolean} enabled False tant que la Capacité à l'origine n'est pas activée. Les modifiers ne sont pris en compte que si enabled de l'action vaut true
 * @param {boolean} temporary true si le sort a une durée
 * Sort permanent : activable et temporary à false, enabled à true
 * Sort à durée : temporary à true et activable à true
 * Sort instantané : temporary à false, et activable à true
 * Attaque simple : temporary à false, et activable à true
 * @param {[]} conditions
 * @param {[]} modifiers
 * @param {[]} resolvers
 */
export class Action extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      source: new fields.DocumentUUIDField(),
      indice: new fields.NumberField({ required: true, min: 0 }),
      type: new fields.StringField(),
      img: new fields.FilePathField({ categories: ["IMAGE"] }),
      label: new fields.StringField(),
      chatFlavor: new fields.StringField(),
      properties: new fields.SchemaField({
        visible: new fields.BooleanField(),
        activable: new fields.BooleanField(),
        enabled: new fields.BooleanField(),
        temporary: new fields.BooleanField(),
      }),
      conditions: new fields.ArrayField(new fields.EmbeddedDataField(Condition)),
      modifiers: new fields.ArrayField(new fields.EmbeddedDataField(Modifier)),
      resolvers: new fields.ArrayField(new fields.EmbeddedDataField(Resolver)),
    }
  }

  /**
   * Gets the enabled modifiers.
   * If the property enabled is true, it returns the modifiers.
   * Otherwise, it returns an empty array.
   *
   * @returns {Array} The enabled modifiers or an empty array.
   */
  get enabledModifiers() {
    if (this.properties.enabled) {
      return this.modifiers
    } else return []
  }

  get icon() {
    switch (this.type) {
      case "spell":
        return '<i class="fas fa-fw fa-hand-sparkles"></i>'
      case "melee":
        return '<i class="fas fa-fw fa-sword"></i>'
      case "ranged":
        return '<i class="fas fa-fw fa-bow-arrow"></i>'
      case "magical":
        return '<i class="fa-solid fa-bolt"></i>'
      case "protection":
        return '<i class="fa-regular fa-fw fa-shield"></i>'
      case "heal":
        return '<i class="fas fa-fw fa-hand-holding-medical"></i>'
    }
    return ""
  }

  /**
   * Gets the name of the item from the parent object's parent.
   * this.parent is item's system
   * @returns {string} The name of the item.
   */
  get itemName() {
    return this.parent.parent.name
  }

  get actionImg() {
    if (this.img !== "icons/svg/d20-highlight.svg") return this.img
    else return this.parent.parent.img
  }

  /**
   * Crée un nouvel objet Action basé sur un objet Action existant.
   * @param {Action} existingAction L'objet Action existant à partir duquel créer le nouvel objet.
   * @returns {Action} Un nouvel objet Action.
   */
  static createFromExisting(existingAction) {
    let actionData = existingAction.toObject()
    const conditions = foundry.utils.deepClone(existingAction.conditions)
    const modifiers = foundry.utils.deepClone(existingAction.modifiers)
    const resolvers = foundry.utils.deepClone(existingAction.resolvers)
    let newAction = new Action(actionData)
    newAction.conditions = conditions
    newAction.modifiers = modifiers
    newAction.resolvers = resolvers
    return newAction
  }

  /**
   * Creates an action from a data object.
   *
   * @param {Object} data The data to be applied to the instance.
   */
  static apply(data) {
    Object.assign(this, data)
  }

  /**
   * Creates an empty action.
   */
  static empty() {
    return Action.apply({})
  }

  get hasConditions() {
    return !foundry.utils.isEmpty(this.conditions)
  }

  get hasModifiers() {
    return !foundry.utils.isEmpty(this.modifiers)
  }

  get hasResolvers() {
    return !foundry.utils.isEmpty(this.resolvers)
  }

  /**
   * Update the source of the action and of all the modifiers
   * @param {*} source
   */
  updateSource(source) {
    this.source = source

    // Update the source of all modifiers
    Object.values(this.modifiers).forEach((element) => {
      element.source = source
    })
  }

  /**
   * Return true if visible = true there is no condition or all conditions are true
   * Elsewhere returns true if all conditions are true
   * @param {*} item
   */
  async isVisible(item) {
    if (this.hasConditions) {
      const results = await Promise.all(this.conditions.map((condition) => condition.evaluate(item)))
      return results.every((result) => result)
    } else {
      return this.properties.visible
    }
  }

  get chatData() {
    if (this.properties.visible && this.properties.activable) {
      if (this.properties.temporary) {
        if (this.properties.enabled) return [{ label: `Désactiver ${this.label}`, action: "unactivate", indice: this.indice }]
        else return [{ label: `Activer ${this.label}`, action: "activate", indice: this.indice }]
      } else {
        if (this.type === "melee" || this.type === "ranged") {
          return [
            { label: `${this.label} - Attaque`, action: "activate", type: "attack", indice: this.indice },
            { label: `${this.label} - Dommages`, action: "activate", type: "damage", indice: this.indice },
          ]
        } else {
          return [{ label: this.label, action: "activate", indice: this.indice }]
        }
      }
    }
    return []
  }

  /**
   * Serialize salient information about this Document when dragging it.
   * @returns {object}  An object of drag data : type "co.action", source and indice
   */
  toDragData() {
    const dragData = { type: "co.action" }
    dragData.source = this.source
    dragData.indice = this.indice
    return dragData
  }
}

import { SYSTEM } from "../../config/system.mjs"
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
        noManaCost: new fields.BooleanField(),
      }),
      conditions: new fields.ArrayField(new fields.EmbeddedDataField(Condition)),
      modifiers: new fields.ArrayField(new fields.EmbeddedDataField(Modifier)),
      resolvers: new fields.ArrayField(new fields.EmbeddedDataField(Resolver)),
    }
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ["CO.Action"]

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

  /**
   * Gets the Font Awesome icon class based on the action type.
   * The icon is used on the actions list as the first icon
   * @returns {string} The Font Awesome icon class.
   */
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
      case "heal":
        return '<i class="fas fa-fw fa-hand-holding-medical"></i>'
      case "buff":
        return '<i class="fa-solid fa-thumbs-up"></i>'
      case "debuff":
        return '<i class="fa-solid fa-thumbs-down"></i>'
      case "consumable":
        return '<i class="fa-solid fa-bottle-droplet"></i>'
    }
    return ""
  }

  /**
   * Gets the Font Awesome icon class based on the action type.
   * The icon is used on the actions list to display the action icon
   * @returns {string} The Font Awesome icon class.
   */
  get iconFA() {
    switch (this.type) {
      case "spell":
        return "fas fa-fw fa-hand-sparkles"
      case "melee":
        return "fas fa-fw fa-sword"
      case "ranged":
        return "fas fa-fw fa-bow-arrow"
      case "magical":
        return "fa-solid fa-bolt"
      case "heal":
        return "fas fa-fw fa-hand-holding-medical"
      case "buff":
        return "fa-solid fa-thumbs-up"
      case "debuff":
        return "fa-solid fa-thumbs-down"
      case "consumable":
        return "fa-solid fa-bottle-droplet"
    }
    return ""
  }

  /**
   * Determines the icon color based on the type and properties of the parent object.
   *
   * @returns {string} The color of the icon. Possible values are:
   * - "blue": If the parent type is "capacity", has frequency, and has charges.
   * - "gray": If the parent type is "capacity", has frequency, but does not have charges,
   *   or if no specific conditions are met.
   * - "green": If the parent type is "capacity" without frequency, or if the parent type is "equipment".
   */
  get iconColor() {
    // Capacity
    if (this.parent.parent.type === SYSTEM.ITEM_TYPE.capacity.id) {
      if (this.hasFrequency) {
        if (this.hasCharges) return "blue"
        else return "gray"
      } else {
        return "green"
      }
    }

    // Equipment
    if (this.parent.parent.type === SYSTEM.ITEM_TYPE.equipment.id) {
      if (this.isReloadable) {
        if (this.hasCharges) return "blue"
        return "gray"
      }
      return "green"
    }

    return "gray"
  }

  get autoAttack() {
    return this.hasResolvers && this.resolvers[0].type === SYSTEM.RESOLVER_TYPE.auto.id
  }

  /**
   * Gets the action name.
   * If the object has a label, it returns the label.
   * Otherwise, it returns the item name.
   *
   * @returns {string} The action name.
   */
  get actionName() {
    if (this.hasLabel) return this.label
    return this.itemName
  }

  /**
   * Gets the name of the item from the parent object's parent.
   * this.parent is item's system
   * @returns {string} The name of the item.
   */
  get itemName() {
    return this.parent.parent.name
  }

  /**
   * Checks if the label property is defined and not an empty string.
   *
   * @returns {boolean} True if the label is defined and not empty, otherwise false.
   */
  get hasLabel() {
    return this.label !== undefined && this.label !== ""
  }

  /**
   * Retrieves the image associated with the action.
   * If the current image is not the default "d20-highlight" icon, it returns the current image.
   * Otherwise, it returns the image from the parent object.
   *
   * @returns {string} The URL of the action image.
   */
  get actionImg() {
    if (this.img !== "icons/svg/d20-highlight.svg") return this.img
    else return this.parent.parent.img
  }

  get hasQuantity() {
    return this.parent.subtype === SYSTEM.EQUIPMENT_SUBTYPES.consumable.id && this.parent.quantity.current > 0
  }

  get quantity() {
    if (this.hasQuantity) return this.parent.quantity.current
    return undefined
  }

  get hasCharges() {
    return this.parent?.charges.current > 0
  }

  get charges() {
    if (this.hasCharges) return this.parent.charges.current
    return undefined
  }

  get manaCost() {
    if (this.properties.noManaCost) return 0
    if (this.parent.isSpell) return this.parent.getManaCost()
    return 0
  }

  get hasFrequency() {
    return this.parent?.frequency !== SYSTEM.CAPACITY_FREQUENCY.none.id
  }

  get isReloadable() {
    return this.parent.properties.reloadable
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
   * @param {*} source UUID of the source
   */
  updateSource(source) {
    this.source = source

    // Update the source of all modifiers
    Object.values(this.modifiers).forEach((element) => {
      element.source = source
    })
  }

  /**
   * Si l'action n'a pas de conditions : elle est visible si la propriété visible vaut true
   * Si l'action a des conditions : elle est visible si toutes les conditions sont vraies
   * @param {Object} item L'élément à évaluer.
   * @param {Object} actor L'acteur effectuant l'évaluation.
   */
  async isVisible(item, actor) {
    if (this.hasConditions) {
      const results = await Promise.all(this.conditions.map((condition) => condition.evaluate(item, actor)))
      return results.every((result) => result)
    } else {
      return this.properties.visible
    }
  }

  /**
   * Retrieves chat data based on the item and actor visibility and properties.
   *
   * @param {Object} item The item to check visibility and properties.
   * @param {Object} actor The actor to check visibility and properties.
   * @returns {Array<Object>} An array of chat data objects. Each object contains:
   *   {string} label The label for the chat action.
   *   {string} action The action to be performed.
   *   {string} [type] The type of action (e.g., "attack", "damage") if applicable.
   *   {number} indice The index or identifier for the action.
   */
  getChatData(item, actor) {
    if (this.isVisible(item, actor) && this.properties.activable) {
      if (this.properties.temporary) {
        if (this.properties.enabled) return [{ label: `Désactiver ${this.label}`, action: "unactivate", indice: this.indice }]
        else return [{ label: `Activer ${this.label}`, action: "activate", indice: this.indice }]
      } else {
        if (this.type === "melee" || this.type === "ranged" || this.type === "magical") {
          return [
            { label: `${this.label} Attaque`, action: "activate", type: "attack", indice: this.indice },
            { label: `${this.label} Dommages`, action: "activate", type: "damage", indice: this.indice },
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

  /**
   * Génère les icônes d'action en fonction du type et des propriétés de l'action
   * Cette méthode remplace la logique conditionnelle dans le template Handlebars
   *
   * @returns {Array} Un tableau d'objets représentant les icônes à afficher
   * Chaque objet contient :
   * - icon: l'icône à utiliser (classe FA)
   * - iconClass: classe CSS additionnelle pour l'icône
   * - action: l'action à effectuer (activate/unactivate)
   * - tooltip: clé de localisation pour l'infobulle
   * - type: type d'action (attack/damage) si applicable
   */
  getActionIcons() {
    const icons = []

    if (!this.properties.activable) return icons

    // Pour les actions temporaires (activables/désactivables)
    if (this.properties.temporary) {
      if (this.properties.enabled) {
        // Action temporaire activée -> bouton pour désactiver
        icons.push({
          icon: this.iconFA,
          iconClass: "enabled toggle-action",
          tooltip: "CO.ui.deactivate",
          actionType: "unactivate",
        })
      } else {
        // Action temporaire désactivée -> bouton pour activer
        icons.push({
          icon: this.iconFA,
          iconClass: "inactivated toggle-action",
          tooltip: "CO.ui.activate",
          actionType: "activate",
        })
      }
    }
    // Pour les actions non temporaires
    else {
      // Actions d'attaque et sorts
      if (["melee", "ranged", "magical", "spell"].includes(this.type)) {
        // S'il y a des résolvers
        if (this.hasResolvers) {
          // Bouton d'attaque, sauf si c'est une attaque automatique
          if (!this.autoAttack) {
            icons.push({
              icon: this.iconFA,
              iconClass: `${this.iconColor} toggle-action`,
              tooltip: this.iconColor === "gray" ? "CO.label.long.needCharges" : "CO.label.long.attack",
              actionType: "activate",
              type: "attack",
            })
          }
          // Bouton de dégâts
          icons.push({
            icon: "fa-regular fa-hand-back-fist",
            iconClass: `${this.iconColor} toggle-action`,
            tooltip: "CO.label.long.damage",
            actionType: "activate",
            type: "damage",
          })
        } else {
          icons.push({
            icon: this.iconFA,
            iconClass: `${this.iconColor} toggle-action`,
            tooltip: "CO.ui.use",
            actionType: "activate",
          })
        }
      }
      // Action de soin
      else if (this.type === SYSTEM.ACTION_TYPES.heal.id) {
        icons.push({
          icon: `fa-solid fa-hand-holding-medical`,
          iconClass: `${this.iconColor} toggle-action`,
          tooltip: "CO.ui.use",
          actionType: "activate",
          type: SYSTEM.RESOLVER_TYPE.heal.id,
        })
      }
      // Action de buff/debuff
      else if (this.type === SYSTEM.ACTION_TYPES.buff.id) {
        icons.push({
          icon: `fa-solid fa-thumbs-up`,
          iconClass: `${this.iconColor} toggle-action`,
          tooltip: "CO.ui.use",
          actionType: "activate",
          type: SYSTEM.RESOLVER_TYPE.buffDebuff.id,
        })
      }
      // Action de buff/debuff
      else if (this.type === SYSTEM.ACTION_TYPES.debuff.id) {
        icons.push({
          icon: `fa-solid fa-thumbs-down`,
          iconClass: `${this.iconColor} toggle-action`,
          tooltip: "CO.ui.use",
          actionType: "activate",
          type: SYSTEM.RESOLVER_TYPE.buffDebuff.id,
        })
      }
      // Action de consommable
      else if (this.type === SYSTEM.ACTION_TYPES.consumable.id) {
        icons.push({
          icon: `fa-solid fa-flask-round-potion`,
          iconClass: `${this.iconColor} toggle-action`,
          tooltip: "CO.ui.use",
          actionType: "activate",
          type: SYSTEM.RESOLVER_TYPE.consumable.id,
        })
      }
      // Autres types d'action
      else {
        icons.push({
          icon: this.iconFA,
          iconClass: `${this.iconColor} toggle-action`,
          tooltip: "CO.ui.use",
          actionType: "activate",
        })
      }
    }

    return icons
  }
}

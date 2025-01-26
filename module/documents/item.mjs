import { Action } from "../models/schemas/action.mjs"
import { SYSTEM } from "../config/system.mjs"
/**
 * Extend the base Item entity
 * @extends {Item}
 */
export default class COItem extends Item {
  constructor(...args) {
    let data = args[0]
    if (!data.img && SYSTEM.ITEM_ICONS[data.type]) data.img = SYSTEM.ITEM_ICONS[data.type]
    super(...args)
  }

  // #region accesseurs
  /**
   * Does it have modifiers ?
   * @returns {boolean} undefined if the item is a path, true if the item has modifiers
   * @type {boolean}
   */
  get hasModifiers() {
    if (![SYSTEM.ITEM_TYPE.equipment.id, SYSTEM.ITEM_TYPE.feature.id, SYSTEM.ITEM_TYPE.profile.id, SYSTEM.ITEM_TYPE.capacity.id].includes(this.type)) return undefined
    return this.modifiers.length > 0
  }

  /**
   * Return an array of Modifiers
   */
  get modifiers() {
    // For Equipement or Capacity Item, the modifiers are in the actions
    if ([SYSTEM.ITEM_TYPE.equipment.id, SYSTEM.ITEM_TYPE.capacity.id].includes(this.type)) {
      return this.getModifiersFromActions(true)
    }
    // For Feature or Profile, the modifiers are in the item
    if ([SYSTEM.ITEM_TYPE.feature.id, SYSTEM.ITEM_TYPE.profile.id].includes(this.type)) {
      return this.system.modifiers
    }
    return []
  }

  /**
   * Returns an array of modifiers from the actions, with an optional filter for enabled actions.
   *
   * @param {boolean} [filterEnabled=false] If true, only enabled actions will be considered.
   * @returns {Array} An array of modifiers from the actions.
   */
  getModifiersFromActions(filterEnabled = false) {
    const filteredActions = filterEnabled ? this.actions.filter((action) => action.properties.enabled) : this.actions

    let modifiers = []
    for (const action of filteredActions) {
      modifiers.push(...action.modifiers)
    }
    return modifiers
  }

  /**
   * Return an array of enabled Modifiers
   * If the item has actions, only enabled actions are taken into account
   */
  get enabledModifiers() {
    // For Equipement or Capacity Item, the modifiers are in enabled actions
    if ([SYSTEM.ITEM_TYPE.equipment.id, SYSTEM.ITEM_TYPE.capacity.id].includes(this.type)) return this.getModifiersFromActions(true)
    // For Feature or Profile, the modifiers are in the item
    else return this.modifiers
  }

  get tags() {
    return this.system.tags
  }

  /**
   * An array of all the actions of the item or empty if no actions or if it's an item without actions
   */
  get actions() {
    if (foundry.utils.isEmpty(this.system.actions)) return []
    return this.system.actions
  }

  /**
   * An array of all the visible actions of the item or empty if no actions or if it's an item without actions
   */
  async getVisibleActions() {
    if (foundry.utils.isEmpty(this.system.actions)) return []

    const visibilityResults = await Promise.all(this.actions.map((action) => action.isVisible(this)))

    return this.actions.filter((_, index) => visibilityResults[index])
  }

  /**
   * Basic info for a capacity : uuid, name, img, description
   */
  get infos() {
    if (this.type === SYSTEM.ITEM_TYPE.capacity.id || this.type === SYSTEM.ITEM_TYPE.path.id) {
      return {
        uuid: this.uuid,
        name: this.name,
        img: this.img,
        description: this.system.description,
      }
    }
    return null
  }

  /**
   * Informations of the item to be displayed in the chat via sendToChat button
   * @param {*} chatType
   * item : Item and all actions
   * loot : Item without actions
   * action : Item and a specific action
   * @param {string} indice of the action, null for others
   */
  getChatData(chatType, indice = null) {
    if (this.type === SYSTEM.ITEM_TYPE.capacity.id || this.type === SYSTEM.ITEM_TYPE.equipment.id || this.type === SYSTEM.ITEM_TYPE.attack.id) {
      let actions = []
      // All actions
      if (chatType === "item" && indice === null) {
        for (const action of this.actions) {
          let act = Action.createFromExisting(action)
          actions.push(...act.chatData)
        }
      } else if (chatType === "action") {
        const action = this.actions.find((a) => a.indice === parseInt(indice))
        console.log("getChatData action", action)
        let act = Action.createFromExisting(action)
        actions.push(...act.chatData)
      }
      return {
        id: this.id,
        name: this.name,
        img: this.img,
        description: this.system.description,
        actions: actions,
      }
    }
  }

  get isUnlocked() {
    if (this.getFlag(game.system.id, "SheetUnlocked")) return true
    return false
  }

  // #endregion

  // #region méthodes publiques

  /**
   * The items of type Capacity based on the ids for a path in an actor
   * @param {Actor} actor
   */
  async getEmbeddedCapacities(actor) {
    if ([SYSTEM.ITEM_TYPE.path.id].includes(this.type)) {
      let capacities = []
      for (const capacityId of this.system.capacities) {
        const capacity = actor.items.get(capacityId)
        capacities.push(capacity)
      }
      return capacities
    }
  }

  /**
   * Calculates the total modifiers based on the specified type, subtype, and target.
   *
   * @param {string} type The type of the modifier. One of the MODIFIERS_TYPE values.
   * @param {string} subtype The subtype of the modifier. One of the MODIFIERS_SUBTYPE values.
   * @param {string} target The target of the modifier. One of the MODIFIERS_TARGET values.
   * @returns {number|undefined} The total sum of the modifiers that match the criteria, or undefined if the item type is not valid.
   */
  getTotalModifiersByTypeSubtypeAndTarget(type, subtype, target) {
    if (![SYSTEM.ITEM_TYPE.equipment.id, SYSTEM.ITEM_TYPE.feature.id, SYSTEM.ITEM_TYPE.profile.id, SYSTEM.ITEM_TYPE.capacity.id].includes(this.type)) return undefined
    if (!this.hasModifiers) return 0
    return this.modifiers
      .filter((m) => m.type === type && m.subtype === subtype && m.target === target)
      .map((i) => i.modifier)
      .reduce((acc, curr) => acc + curr, 0)
  }

  /**
   * Retrieves modifiers based on the specified type and subtype.
   *
   * @param {string} type The type of the modifier to filter.
   * @param {string} subtype The subtype of the modifier to filter.
   * @returns {Array|undefined|number} Returns an array of modifiers that match the type and subtype,
   *                                     undefined if the item type is not one of the specified types,
   *                                     or 0 if the item has no modifiers.
   */
  getModifiersByTypeAndSubtype(type, subtype) {
    if (![SYSTEM.ITEM_TYPE.equipment.id, SYSTEM.ITEM_TYPE.feature.id, SYSTEM.ITEM_TYPE.profile.id, SYSTEM.ITEM_TYPE.capacity.id].includes(this.type)) return undefined
    if (!this.hasModifiers) return 0
    return this.modifiers.filter((m) => m.type === type && m.subtype === subtype)
  }

  /**
   * Add a capacity to an item of type Path or Feature
   * @param {*} uuid
   */
  addCapacity(uuid) {
    if (this.type === SYSTEM.ITEM_TYPE.path.id || this.type === SYSTEM.ITEM_TYPE.feature.id) {
      let newCapacities = foundry.utils.duplicate(this.system.capacities)
      newCapacities.push(uuid)
      return this.update({ "system.capacities": newCapacities })
    }
    return false
  }

  /**
   * Add a path to an item of type Path or Feature
   * @param {*} uuid
   */
  addPath(uuid) {
    if (this.type === SYSTEM.ITEM_TYPE.feature.id || this.type === SYSTEM.ITEM_TYPE.profile.id) {
      let newPaths = foundry.utils.duplicate(this.system.paths)
      newPaths.push(uuid)
      return this.update({ "system.paths": newPaths })
    }
    return false
  }

  /**
   * Update the rank for an embedded path item
   */
  async updateRank() {
    if (this.type !== SYSTEM.ITEM_TYPE.path.id || !this.actor) return
    let max = 0

    for (const uuid of this.system.capacities) {
      const capacity = await fromUuid(uuid)
      if (capacity && capacity.system.learned) {
        const rank = this.system.capacities.indexOf(uuid) + 1
        if (rank > max) max = rank
      }
    }
    this.update({ "system.rank": max })
  }

  /**
   * Update the actions for an embedded capacity or equipment item
   */
  toggleActions() {
    if ((this.type !== SYSTEM.ITEM_TYPE.capacity.id && this.type !== SYSTEM.ITEM_TYPE.equipment.id) || !this.actor) return

    const actions = this.toObject().system.actions

    for (const action of actions) {
      // Si c'est une action non activable, l'activer automatiquement
      if (!action.properties.activable) {
        action.properties.enabled = !action.properties.enabled
      } else {
        // Vérifier si les conditions sont remplies
        if (!action.hasConditions) {
          action.properties.visible = !action.properties.visible
        } else {
          action.properties.visible = action.isVisible(this)
        }
      }
    }
    this.update({ "system.actions": actions })
  }
  // #endregion
}

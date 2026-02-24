import { Action } from "../models/schemas/action.mjs"
import { SYSTEM } from "../config/system.mjs"
import RulesEngine from "../helpers/rules-engine.mjs"
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

  /**
   * Pre-update hook to reset additionalEffect.applyOn to "success" when hasAttackSuccessThreshold is unchecked
   * and the current applyOn value is "attackSuccessTreshold"
   * @param {object} changed The differential data that is changed relative to the document's prior values
   * @param {object} options Additional options which modify the update request
   * @param {User} user The User requesting the document update
   * @returns {Promise<boolean|void>} A return value of false indicates the update operation should be cancelled
   * @protected
   */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user)

    // Check if actions are being updated
    if (changed.system?.actions) {
      const currentActions = this.system.actions || []

      for (let actionIdx = 0; actionIdx < changed.system.actions.length; actionIdx++) {
        const changedAction = changed.system.actions[actionIdx]
        if (!changedAction?.resolvers) continue

        for (const [resolverId, changedResolver] of Object.entries(changedAction.resolvers)) {
          // Check if hasAttackSuccessThreshold is being set to false
          if (changedResolver.hasAttackSuccessThreshold === false) {
            // Find the current resolver to check its applyOn value
            const currentAction = currentActions[actionIdx]
            const currentResolver = currentAction?.resolvers?.find((r) => r.id === resolverId)

            if (currentResolver?.additionalEffect?.applyOn === SYSTEM.RESOLVER_RESULT.attackSuccessTreshold.id) {
              // Reset applyOn to "success"
              if (!changedResolver.additionalEffect) {
                changedResolver.additionalEffect = {}
              }
              changedResolver.additionalEffect.applyOn = SYSTEM.RESOLVER_RESULT.success.id
            }
          }
        }
      }
    }
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
      return this.getModifiersFromActions()
    }
    // For Feature or Profile, the modifiers are in the item
    if ([SYSTEM.ITEM_TYPE.feature.id, SYSTEM.ITEM_TYPE.profile.id].includes(this.type)) {
      return this.system.modifiers
    }
    return []
  }

  /**
   * Returns an array of modifiers from enabled actions.
   * If an action has conditions, they are evaluated synchronously via RulesEngine.
   * Otherwise the enabled flag is used.
   *
   * @returns {Array} An array of modifiers from the actions.
   */
  getModifiersFromActions() {
    const filteredActions = this.actions.filter((action) => {
      if (action.hasConditions) {
        const actor = this.actor
        if (!actor) return false
        const conditionsMet = action.conditions.every((condition) => RulesEngine.evaluate(condition, this, actor))
        if (!conditionsMet) return false
        // Si l'action est activable, les conditions ne suffisent pas : il faut aussi que enabled soit true
        if (action.properties.activable) return action.properties.enabled
        return true
      }
      return action.properties.enabled
    })
    let modifiers = []
    for (const action of filteredActions) {
      modifiers.push(...action.modifiers)
    }
    return modifiers
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
   * Retrieves the list of actions that are visible to the specified actor.
   * An array of all the visible actions of the item or empty if no actions or if it's an item without actions
   * @param {Object} actor The actor for whom visibility is being checked.
   * @returns {Promise<Array>} A promise that resolves to an array of visible actions.
   */
  async getVisibleActions(actor) {
    if (foundry.utils.isEmpty(this.system.actions)) return []
    const visibilityResults = await Promise.all(this.actions.map((action) => action.isVisible(this, actor)))
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
   * Retrieves chat data for the specified item and actor based on the chat type and optional index.
   *
   * @param {Object} item The item for which chat data is being retrieved.
   * @param {Object} actor The actor associated with the item.
   * @param {string} chatType The type of chat data to retrieve ("item" or "action").
   * @param {number|null} [indice=null] The optional index of the action to retrieve chat data for.
   * @returns {Object} An object containing the item's id, name, image, description, and actions.
   */
  getChatData(item, actor, chatType, indice = null) {
    if (this.type === SYSTEM.ITEM_TYPE.capacity.id || this.type === SYSTEM.ITEM_TYPE.equipment.id || this.type === SYSTEM.ITEM_TYPE.attack.id) {
      let actions = []
      // All actions
      if (chatType === "item" && indice === null) {
        for (const action of this.actions) {
          actions.push(...action.getChatData(item, actor))
        }
      } else if (chatType === "action") {
        const action = this.actions.find((a) => a.indice === parseInt(indice))
        actions.push(...action.getChatData(item, actor))
      }
      return {
        id: this.id,
        uuid: this.uuid,
        name: this.name,
        img: this.img,
        description: this.system.description,
        actions: actions,
      }
    }
    return null
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
      .map((i) => parseInt(i.value))
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
   * Add a capacity to an item of type Path, Feature or Capacity
   * @param {*} uuid
   */
  async addCapacity(uuid) {
    // For Path and Feature, the capacities are in the system.capacities
    if (this.type === SYSTEM.ITEM_TYPE.path.id || this.type === SYSTEM.ITEM_TYPE.feature.id) {
      let newCapacities = foundry.utils.duplicate(this.system.capacities)
      newCapacities.push(uuid)
      const capacity = await fromUuid(uuid)
      return this.update({ "system.capacities": newCapacities })
    }
    // For Capacity, it's only if the linkedCapacity is allowed, and the capacity is possessed by the actor, and has been learned
    if (this.type === SYSTEM.ITEM_TYPE.capacity.id && this.system.learned && this.system.allowLinkedCapacity && this.system.path.includes("Actor")) {
      const actor = game.actors.get(this.system.path.split(".")[1])
      const capacity = await fromUuid(uuid)
      let capacityData = capacity.toObject()
      const newCapacity = await actor.createEmbeddedDocuments("Item", [capacityData])
      return this.update({ "system.linkedCapacity": newCapacity[0].uuid })
    }
    return false
  }

  /**
   * Add a path to an item of type Profile or Feature
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

  // #endregion
}

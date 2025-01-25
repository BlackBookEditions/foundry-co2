import { SYSTEM } from "../../config/system.mjs"

import { Action } from "../../models/schemas/action.mjs"
import { Condition } from "../../models/schemas/condition.mjs"
import { Resolver } from "../../models/schemas/resolver.mjs"
import { Modifier } from "../../models/schemas/modifier.mjs"

export default class CoBaseItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 600,
      height: 720,
      classes: ["co", "sheet", "item"],
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details" },
        { navSelector: ".action-tabs", contentSelector: ".action-body", initial: "0" },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    })
  }

  /** @override */
  get template() {
    return "systems/co/templates/items/item-sheet.hbs"
  }

  /** @inheritdoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event)
    const item = this.item

    /**
     * A hook event that fires when some useful data is dropped onto an ItemSheet.
     * @function dropActorSheetData
     * @memberof hookEvents
     * @param {Item} item      The Item
     * @param {ItemSheet} sheet The ItemSheet application
     * @param {object} data      The data that has been dropped onto the sheet
     */
    const allowed = Hooks.call("dropItemSheetData", item, this, data)
    if (allowed === false) return

    // Handle different data types
    switch (data.type) {
      case "ActiveEffect":
        return // This._onDropActiveEffect(event, data);
      case "Actor":
        return // This._onDropActor(event, data);
      case "Item":
        return this._onDropItem(event, data)
      case "Folder":
      // This._onDropFolder(event, data);
    }
  }

  /**
   * Handle the drop of an Item onto a character sheet.
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    event.preventDefault()
    if (!this.item.isOwner) return false
    const item = await Item.implementation.fromDropData(data)
    // Const itemData = item.toObject();

    // Handle item sorting within the same Actor
    // if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, itemData);

    switch (item.type) {
      case SYSTEM.ITEM_TYPE.EQUIPMENT:
        return this._onDropEquipmentItem(item)
      case SYSTEM.ITEM_TYPE.FEATURE:
        return this._onDropFeatureItem(item)
      case SYSTEM.ITEM_TYPE.PROFILE:
        return this._onDropProfileItem(item)
      case SYSTEM.ITEM_TYPE.PATH:
        return this._onDropPathItem(item)
      case SYSTEM.ITEM_TYPE.CAPACITY:
        return this._onDropCapacityItem(item)
      default:
        return false
    }
  }

  _onDropEquipmentItem(item) {
    let itemData = item.object
    /* ItemData = itemData instanceof Array ? itemData : [itemData];
            return this.item.createEmbeddedDocuments("Item", itemData); */
    return false
  }

  _onDropFeatureItem(item) {
    let itemData = item.object
    /* ItemData = itemData instanceof Array ? itemData : [itemData];
            return this.item.createEmbeddedDocuments("Item", itemData); */
    return false
  }

  _onDropProfileItem(item) {
    let itemData = item.object
    /* ItemData = itemData instanceof Array ? itemData : [itemData];
            return this.item.createEmbeddedDocuments("Item", itemData); */
    return false
  }

  _onDropPathItem(item) {
    if (item.uuid) return this.item.addPath(item.uuid)
    return false
  }

  _onDropCapacityItem(item) {
    if (item.uuid) return this.item.addCapacity(item.uuid)
    return false
  }

  /** @override */
  async getData(options = {}) {
    const context = super.getData(options)
    context.debugMode = game.settings.get("co", "debugMode")
    context.system = this.item.system
    context.modifiers = this.item.system.modifiers
    context.enrichedDescription = await TextEditor.enrichHTML(this.item.system.description, { async: true })
    context.tags = this.item.tags
    context.unlocked = this.item.isUnlocked
    context.locked = !this.item.isUnlocked

    context.choiceActionTypes = SYSTEM.ACTION_TYPES
    context.choiceConditionObjects = SYSTEM.CONDITION_OBJECTS
    context.choiceConditionPredicates = SYSTEM.CONDITION_PREDICATES
    context.choiceResolverTypes = SYSTEM.RESOLVER_TYPE
    context.choiceModifierSubtypes = SYSTEM.MODIFIERS.MODIFIERS_SUBTYPE
    context.choiceModifierTargets = SYSTEM.MODIFIERS.MODIFIERS_TARGET
    console.log("Base-Item-Sheet context", context)
    return context
  }

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html)
    html.find(".section-toggle").click(this._onSectionToggle.bind(this))
    html.find(".item-delete").click(this._onDeleteItem.bind(this))
    html.find(".item-edit").click(this._onEditItem.bind(this))

    html.find(".action-modifier-add").click(this._onAddActionModifier.bind(this))
    html.find(".action-modifier-delete").click(this._onDeleteActionModifier.bind(this))
    html.find(".modifier-add").click(this._onAddModifier.bind(this))
    html.find(".modifier-delete").click(this._onDeleteModifier.bind(this))
    html.find(".resolver-add").click(this._onAddResolver.bind(this))
    html.find(".resolver-delete").click(this._onDeleteResolver.bind(this))
    html.find(".condition-add").click(this._onAddCondition.bind(this))
    html.find(".condition-delete").click(this._onDeleteCondition.bind(this))
    html.find(".action-add").click(this._onAddAction.bind(this))
    html.find(".action-delete").click(this._onDeleteAction.bind(this))

    html.find(".sheet-change-lock").click(this._onSheetChangelock.bind(this))
  }

  /**
   * Handles the toggle action for a section.
   * Prevents the default event action, finds the next foldable section,
   * and toggles its visibility with a sliding animation.
   *
   * @param {Event} event The event object triggered by the section toggle action.
   * @returns {boolean} - Always returns true.
   */
  _onSectionToggle(event) {
    event.preventDefault()
    const li = $(event.currentTarget).parent().next(".foldable")
    li.slideToggle("fast")
    return true
  }

  /**
   * Handles the deletion of an item from the item and updates the item with the new item list.
   * @param {*} event
   * @returns
   */
  _onDeleteItem(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".item")
    const itemType = li.data("itemType")
    // Const itemId = li.data("itemId");
    const uuid = li.data("uuid")
    let data = foundry.utils.duplicate(this.item)
    // Console.log(itemType, uuid, data);
    switch (itemType) {
      case SYSTEM.ITEM_TYPE.PATH:
        data.system.paths.splice(data.system.paths.indexOf(uuid), 1)
        break
      case SYSTEM.ITEM_TYPE.CAPACITY:
        data.system.capacities.splice(data.system.capacities.indexOf(uuid), 1)
        break
      default:
        break
    }

    return this.item.update(data)
  }

  /**
   * Open the item sheet if it's a path or a capacity
   * @param event
   * @private
   */
  _onEditItem(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".item")
    const itemType = li.data("itemType")

    switch (itemType) {
      case SYSTEM.ITEM_TYPE.PATH:
      case SYSTEM.ITEM_TYPE.CAPACITY: {
        const uuid = li.data("uuid")
        return fromUuid(uuid).then((document) => document.sheet.render(true))
      }
      default:
        break
    }
  }

  /**
   * Handles the addition of a new action to the item and updates the item with the new action list.
   * @param {*} event
   * @returns {Item} The updated item.
   */
  _onAddAction(event) {
    event.preventDefault()
    let newActions = foundry.utils.deepClone(this.item.actions)
    let action = new Action({
      source: this.item.uuid,
      indice: newActions.length,
      type: "melee",
      img: "icons/svg/d20-highlight.svg",
      label: `${game.i18n.localize("CO.ui.newAction")} ${this.item.actions.length + 1}`,
    })
    // Attack action must be Visible and Activable by default
    if (this.item.type === "attack") {
      action.properties.visible = true
      action.properties.activable = true
    }
    newActions.push(action)
    return this.item.update({ "system.actions": newActions })
  }

  /**
   * Handles the deletion of an action from the item and updates the item with the new action list.
   * @param {*} event
   * @returns {Item} The updated item.
   */
  _onDeleteAction(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".action")
    const rowId = li.data("itemId")
    let newActions = foundry.utils.deepClone(this.item.actions)
    newActions.splice(rowId, 1)
    return this.item.update({ "system.actions": newActions })
  }

  /**
   * Handles the addition of a new condition to the item and updates the item with the new action list.
   * @param {*} event
   * @returns {Item} The updated item.
   */
  async _onAddCondition(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".action")
    const actionId = li.data("itemId")

    const actions = this.item.toObject().system.actions
    actions[actionId].conditions.push({ source: this.item.uuid, type: this.item.type })
    return this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the deletion of a condition from an item.
   *
   * @param {Event} event The event that triggered the deletion.
   * @returns {Promise} - A promise that resolves when the item update is complete.
   * @private
   */
  _onDeleteCondition(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".condition")
    const actionId = li.data("actionId")
    const conditionId = li.data("itemId")

    const actions = this.item.toObject().system.actions
    actions[actionId].conditions.splice(conditionId, 1)
    return this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the addition of a new action modifier.
   *
   * @param {Event} event The event that triggered the addition of the action modifier.
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  async _onAddActionModifier(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".action")
    const actionId = li.data("itemId")

    const actions = this.item.toObject().system.actions
    actions[actionId].modifiers.push({ source: this.item.uuid, type: this.item.type })
    return this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the deletion of an action modifier from the item.
   *
   * @param {Event} event The event that triggered the deletion.
   * @returns {Promise} - A promise that resolves once the item has been updated.
   * @private
   */
  _onDeleteActionModifier(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".modifier")
    const actionId = li.data("actionId")
    const modId = li.data("itemId")

    const actions = this.item.toObject().system.actions
    actions[actionId].modifiers.splice(modId, 1)
    return this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the addition of a new resolver to an action item.
   *
   * @param {Event} event The event that triggered the addition of the resolver.
   * @returns {Promise} - A promise that resolves when the item is updated.
   */
  _onAddResolver(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".action")
    const actionId = li.data("itemId")

    const actions = this.item.toObject().system.actions
    actions[actionId].resolvers.push({
      type: "melee",
      skill: {
        formula: [{ part: "@atc" }],
        crit: "20",
        difficulty: "@def",
      },
      damage: {
        formula: [{ part: "" }],
      },
    })

    return this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the deletion of a resolver from an action within the item.
   *
   * @param {Event} event The event that triggered the deletion.
   * @returns {Promise} - A promise that resolves when the item update is complete.
   */
  _onDeleteResolver(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".resolver")
    const actionId = li.data("actionId")
    const modId = li.data("itemId")

    const actions = this.item.toObject().system.actions
    actions[actionId].resolvers.splice(modId, 1)
    return this.item.update({ "system.actions": actions })
  }

  /**
   * Adds a new Modifier to the item and updates the item with the new modifier list.
   * Only for the item of type Feature or Profile
   * @param {Event} event The event object triggered by the user action.
   * @returns {Promise} A promise that resolves when the item is successfully updated.
   */
  _onAddModifier(event) {
    event.preventDefault()
    const currentModifiers = this.item.modifiers
    currentModifiers.push(new Modifier({ source: this.item.uuid, type: this.item.type }))

    return this.item.update({ "system.modifiers": currentModifiers })
  }

  /**
   * Delete a Modifier from the item
   * Only for the item of type Feature or Profile
   * @param {Event} event The event object triggered by the user action.
   * @returns {Promise} A promise that resolves when the item is successfully updated.
   */
  _onDeleteModifier(event) {
    event.preventDefault()

    const li = $(event.currentTarget).closest(".modifier")
    const rowId = li.data("itemId")

    const currentModifiers = this.item.modifiers
    if (currentModifiers.length === 0) return

    currentModifiers.splice(rowId, 1)

    return this.item.update({ "system.modifiers": currentModifiers })
  }

  // TODO : Vérifier si c'est optimal
  /**
   * For item of type Capacity or Equipment, add array for modifiers, conditions and resolvers when they are empty on the sheet
   * @param {*} event
   * @param {*} formData
   */
  _updateObject(event, formData) {
    if (this.item.type === SYSTEM.ITEM_TYPE.CAPACITY || this.item.type === SYSTEM.ITEM_TYPE.EQUIPMENT) {
      formData = foundry.utils.expandObject(formData)

      // Parcours des actions pour ajouter les tableaux vides
      if (!foundry.utils.isEmpty(formData.system.actions)) {
        Object.values(formData.system.actions).forEach((action) => {
          if (foundry.utils.isEmpty(action.modifiers)) action.modifiers = []
          else action.modifiers = Object.values(action.modifiers)
          if (foundry.utils.isEmpty(action.conditions)) action.conditions = []
          else action.conditions = Object.values(action.conditions)
          if (foundry.utils.isEmpty(action.resolvers)) action.resolvers = []
          else action.resolvers = Object.values(action.resolvers)
        })
      }
    }
    super._updateObject(event, formData)
  }

  /**
   * Manage the lock/unlock button on the sheet
   * @param {Event} event
   */
  async _onSheetChangelock(event) {
    event.preventDefault()
    let flagData = await this.item.getFlag(game.system.id, "SheetUnlocked")
    if (flagData) await this.item.unsetFlag(game.system.id, "SheetUnlocked")
    else await this.item.setFlag(game.system.id, "SheetUnlocked", "SheetUnlocked")
    this.item.sheet.render(true)
  }
}

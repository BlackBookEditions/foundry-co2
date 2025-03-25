import { SYSTEM } from "../../config/system.mjs"

import { Action } from "../../models/schemas/action.mjs"
import { Condition } from "../../models/schemas/condition.mjs"
import { Resolver } from "../../models/schemas/resolver.mjs"
import { Modifier } from "../../models/schemas/modifier.mjs"
import Utils from "../../utils.mjs"

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

  /**
   * Different sheet modes.
   * @enum {number}
   */
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /**
   * The current sheet mode.
   * @type {number}
   */
  _sheetMode = this.constructor.SHEET_MODES.PLAY

  /**
   * Le choix fait sur la selection des statuts
   * @type {string}
   */
  selectedStatus = {}

  /**
   * Is the sheet currently in 'Play' mode?
   * @type {boolean}
   */
  get isPlayMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.PLAY
  }

  /**
   * Is the sheet currently in 'Edit' mode?
   * @type {boolean}
   */
  get isEditMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.EDIT
  }

  /** @inheritdoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event)
    const item = this.item

    /**
     * A hook event that fires when some useful data is dropped onto an ItemSheet.
     * @function dropItemSheetData
     * @memberof hookEvents
     * @param {Item} item      The Item
     * @param {ItemSheet} sheet The ItemSheet application
     * @param {object} data      The data that has been dropped onto the sheet
     */
    if (Hooks.call("co.dropItemSheetData", item, this, data) === false) return

    if (data.type !== "Item") return
    return this._onDropItem(event, data)
  }

  /**
   * Handle the drop of an Item onto a item sheet.
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    event.preventDefault()
    if (!this.item.isOwner) return false
    const item = await Item.implementation.fromDropData(data)

    switch (item.type) {
      case SYSTEM.ITEM_TYPE.equipment.id:
        return this._onDropEquipmentItem(item)
      case SYSTEM.ITEM_TYPE.feature.id:
        return this._onDropFeatureItem(item)
      case SYSTEM.ITEM_TYPE.profile.id:
        return this._onDropProfileItem(item)
      case SYSTEM.ITEM_TYPE.path.id:
        return this._onDropPathItem(item)
      case SYSTEM.ITEM_TYPE.capacity.id:
        return this._onDropCapacityItem(item)
      default:
        return false
    }
  }

  _onDropEquipmentItem(item) {
    return false
  }

  _onDropFeatureItem(item) {
    return false
  }

  _onDropProfileItem(item) {
    return false
  }

  /**
   * Handles the drop event for a path item.
   *
   * @param {Object} item The item being dropped.
   * @param {string} item.uuid The unique identifier of the item.
   * @returns {boolean} Returns true if the item was successfully added, otherwise false.
   */
  _onDropPathItem(item) {
    if (item.uuid) return this.item.addPath(item.uuid)
    return false
  }

  /**
   * Handles the drop event for a capacity item.
   *
   * @param {Object} item The item being dropped.
   * @param {string} item.uuid The unique identifier of the item.
   * @returns {boolean} Returns true if the item was successfully added, otherwise false.
   */
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
    context.unlocked = this.isEditMode
    context.locked = this.isPlayMode

    context.systemFields = this.document.system.schema.fields
    context.choiceActionTypes = SYSTEM.ACTION_TYPES
    context.choiceConditionObjects = SYSTEM.CONDITION_OBJECTS
    context.choiceConditionPredicates = SYSTEM.CONDITION_PREDICATES
    context.choiceConditionTargets = SYSTEM.CONDITION_TARGETS
    context.choiceResolverTypes = SYSTEM.RESOLVER_TYPE
    context.choiceResolverApplyOn = SYSTEM.RESOLVER_RESULT
    context.choiceResolverTargets = SYSTEM.RESOLVER_TARGET
    context.choiceResolverScopes = SYSTEM.RESOLVER_SCOPE
    context.choiceModifierSubtypes = SYSTEM.MODIFIERS.MODIFIERS_SUBTYPE
    context.choiceModifierTargets = SYSTEM.MODIFIERS.MODIFIERS_TARGET
    context.choiceDurationUnit = SYSTEM.COMBAT_UNITE
    context.choiceEnergies = []
    // Parcourir chaque élément et ajouter le nom au tableau
    context.choiceEnergies.push("")
    for (const key in SYSTEM.CUSTOM_EFFECT_ELEMENT) {
      context.choiceEnergies.push(SYSTEM.CUSTOM_EFFECT_ELEMENT[key].name)
    }
    context.choiceConditionStates = SYSTEM.STATUS_EFFECT.reduce((acc, effect) => {
      acc[effect.id] = effect.name
      return acc
    }, {})
    context.choiceModifierAbilityTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "ability"))
    context.choiceModifierCombatTargets = Object.fromEntries(
      Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "combat" || value.subtype === "attack"),
    )
    context.choiceModifierAttributeTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "attribute"))
    context.choiceModifierResourceTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "resource"))
    context.choiceModifierSkillTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "ability"))
    context.choiceModifierStateTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "state"))
    context.choiceModifierBonusDiceTargets = Object.fromEntries(
      Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "ability" || value.subtype === "attack"),
    )
    context.choiceModifierMalusDiceTargets = Object.fromEntries(
      Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "ability" || value.subtype === "attack"),
    )

    if (CONFIG.debug.co?.sheets) console.debug(Utils.log(`CoBaseItemSheet - context`), context)
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
    html.find(".resolver-statutadd").click(this._onAddStatut.bind(this))
    html.find(".resolver-select-status").change(this._onSelectStatus.bind(this))
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
   * Gère la suppression d'un élément de la feuille.
   *
   * @param {Event} event L'événement qui a déclenché la suppression.
   */
  _onDeleteItem(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".item")
    const itemType = li.data("itemType")
    const uuid = li.data("uuid")
    let data = foundry.utils.duplicate(this.item)
    switch (itemType) {
      case SYSTEM.ITEM_TYPE.path.id:
        data.system.paths.splice(data.system.paths.indexOf(uuid), 1)
        break
      case SYSTEM.ITEM_TYPE.capacity.id:
        data.system.capacities.splice(data.system.capacities.indexOf(uuid), 1)
        break
      default:
        break
    }

    return this.item.update(data)
  }

  /**
   * Open the item sheet if it's a path or a capacity
   * @param {*} event
   * @private
   */
  _onEditItem(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".item")
    const itemType = li.data("itemType")

    switch (itemType) {
      case SYSTEM.ITEM_TYPE.path.id:
      case SYSTEM.ITEM_TYPE.capacity.id: {
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
    newActions.push(action)
    return this.item.update({ "system.actions": newActions })
  }

  /**
   * Va mémoriser le choix qui a été sélectionné pour les conditionsState
   * @param {*} event
   */
  _onSelectStatus(event) {
    event.preventDefault()
    this.selectedStatus = event.currentTarget.value
  }

  /**
   * Lorsque l'on va cliquer le le bouton pour ajouter un conditionState à mettre dnas les effets supplémentaires d'une attaque
   * @param {*} event
   * @returns
   */
  _onAddStatut(event) {
    event.preventDefault()
    const dataset = event.currentTarget.dataset
    const actions = this.item.toObject().system.actions

    const itemid = dataset.itemId
    const actionId = dataset.actionId
    if (actions[actionId].resolvers[itemid].additionalEffect.statuses) actions[actionId].resolvers[itemid].additionalEffect.statuses += `, ${this.selectedStatus}`
    else actions[actionId].resolvers[itemid].additionalEffect.statuses = this.selectedStatus
    return this.item.update({ "system.actions": actions })
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
    actions[actionId].conditions.push(new Condition())
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
    actions[actionId].modifiers.push(new Modifier({ source: this.item.uuid, type: this.item.type }))
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
    actions[actionId].resolvers.push(
      new Resolver({
        type: "melee",
        skill: {
          formula: "@atc",
          crit: "",
          difficulty: "@cible.def",
        },
        damage: {
          formula: "",
        },
      }),
    )

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
   * Handles the deletion of a modifier from the item.
   *
   * @param {Event} event The event that triggered the deletion.
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

  /**
   * Manage the lock/unlock button on the sheet
   * @param {Event} event
   */
  async _onSheetChangelock(event) {
    event.preventDefault()
    const modes = this.constructor.SHEET_MODES
    this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT
    this.render()
  }
}

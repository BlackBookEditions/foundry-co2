const { sheets, ux } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api
const { DragDrop } = foundry.applications.ux

import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../helpers/utils.mjs"
import { Action } from "../../models/schemas/action.mjs"
import { Condition } from "../../models/schemas/condition.mjs"
import { Modifier } from "../../models/schemas/modifier.mjs"
import { Resolver } from "../../models/schemas/resolver.mjs"
import slideToggle from "../../elements/slide-toggle.mjs"

export default class COBaseItemSheet extends HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  /**
   * Different sheet modes.
   * @enum {number}
   */
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["standard-form", "co", "item"],
    position: {
      width: 600,
      height: "auto",
    },
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true,
    },
    actions: {
      toggleSection: COBaseItemSheet.#onSectionToggle,
      changeSheetLock: COBaseItemSheet.#onSheetChangelock,
      selectStatus: COBaseItemSheet.#onSelectStatus,
      editItem: COBaseItemSheet.#onEditItem,
      deleteItem: COBaseItemSheet.#onDeleteItem,
      addActionModifier: COBaseItemSheet.#onAddActionModifier,
      deleteActionModifier: COBaseItemSheet.#onDeleteActionModifier,
      addModifier: COBaseItemSheet.#onAddModifier,
      deleteModifier: COBaseItemSheet.#onDeleteModifier,
      addResolver: COBaseItemSheet.#onAddResolver,
      deleteResolver: COBaseItemSheet.#onDeleteResolver,
      addCondition: COBaseItemSheet.#onAddCondition,
      deleteCondition: COBaseItemSheet.#onDeleteCondition,
      addAction: COBaseItemSheet.#onAddAction,
      deleteAction: COBaseItemSheet.#onDeleteAction,
      selectActionIcon: COBaseItemSheet.#onSelectActionIcon,
    },
  }

  /**
   * The current sheet mode.
   * @type {number}
   */
  _sheetMode = this.constructor.SHEET_MODES.PLAY

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

  // Nativement isVisible teste le droit LIMITED
  // Nativement isEditable teste le droit OWNER

  get isObserver() {
    return this.document.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
  }

  get isLimitedView() {
    return this.isVisible && !this.isObserver && !this.isEditable
  }

  /**
   * Le choix fait sur la selection des statuts
   * @type {string}
   */
  selectedStatus = {}

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    new DragDrop.implementation({
      dragSelector: ".draggable",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element)

    // Set toggle state and add status class to frame
    this._renderModeToggle(this.element)

    // Affichage selon les permissions
    if (!this.isLimitedView) return

    const descTab = this.element?.querySelector('.tab[data-tab="description"]')
    if (descTab) descTab.classList.add("active")

    const descPart = this.element?.querySelector('[data-application-part="description"]')
    if (descPart) descPart.style.removeProperty("display")
  }

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options)
    if (!this.isLimitedView) return parts

    const allowedParts = ["header", "sidebar", "description"]
    return Object.fromEntries(allowedParts.filter((partName) => parts[partName]).map((partName) => [partName, parts[partName]]))
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options)

    if (this.isLimitedView) {
      delete options.tabs
    }
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    const debugMode = game.settings.get("co2", "debugMode")
    context.debugMode = debugMode
    context.notDebugMode = !debugMode
    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.systemSource = this.document.system._source
    context.item = this.document
    context.system = this.document.system
    context.source = this.document.toObject()

    context.itemType = this.document.type
    context.modifiers = this.document.system.modifiers
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description, { async: true })
    context.tags = this.document.tags

    context.unlocked = this.isEditMode
    context.locked = this.isPlayMode
    context.isOwned = this.document.isOwned
    context.isNotOwned = !this.document.isOwned
    context.isGmDebugUnlock = game.user.isGM && debugMode && this.isEditMode
    context.isNotGmInDebugUnlock = !game.user.isGM || !debugMode || this.isPlayMode

    // Select options
    context.choiceActionTypes = SYSTEM.ACTION_TYPES
    context.choiceActionFrequency = SYSTEM.CAPACITY_ACTION_TYPE
    context.choiceConditionObjects = SYSTEM.CONDITION_OBJECTS
    context.choiceConditionPredicates = SYSTEM.CONDITION_PREDICATES
    context.choiceConditionTargets = SYSTEM.CONDITION_TARGETS
    context.choiceResolverTypes = SYSTEM.RESOLVER_TYPE
    context.choiceResolverApplyOn = SYSTEM.RESOLVER_RESULT
    context.choiceResolverApplyOnAlways = Object.fromEntries(Object.entries(SYSTEM.RESOLVER_RESULT).filter(([key, value]) => key === "always"))
    context.choiceResolverTargets = SYSTEM.RESOLVER_TARGET
    context.choiceResolverScopes = SYSTEM.RESOLVER_SCOPE
    context.choiceResolverEffectDurationUnit = SYSTEM.COMBAT_UNITE
    context.choiceResolverEffectElementTypes = SYSTEM.CUSTOM_EFFECT_ELEMENT
    context.choiceResolverEffectFormulaTypes = SYSTEM.RESOLVER_FORMULA_TYPE
    context.choiceModifierSubtypes = SYSTEM.MODIFIERS.MODIFIERS_SUBTYPE
    context.choiceModifierTargets = SYSTEM.MODIFIERS.MODIFIERS_TARGET
    context.choiceModifierApplies = SYSTEM.MODIFIERS.MODIFIERS_APPLY

    context.choiceModifierAbilityTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "ability"))
    context.choiceModifierCombatTargets = Object.fromEntries(
      Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "combat" || value.subtype === "attack"),
    )
    context.choiceModifierAttributeTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "attribute"))
    context.choiceModifierResourceTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "resource"))
    context.choiceModifierSkillTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "ability"))
    context.choiceModifierStateTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "state"))
    context.choiceModifierBonusDiceTargets = Object.fromEntries(
      Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.id !== "all" && (value.subtype === "ability" || value.subtype === "attack")),
    )
    context.choiceModifierMalusDiceTargets = Object.fromEntries(
      Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.id !== "all" && (value.subtype === "ability" || value.subtype === "attack")),
    )

    if (CONFIG.debug.co2?.sheets) console.debug(Utils.log(`CoBaseItemSheet - context`), context)
    return context
  }

  // #region Actions

  /**
   * Handles the toggle action for a section.
   * Prevents the default event action, finds the next foldable section,
   * and toggles its visibility with a sliding animation.
   *
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {boolean} - Always returns true.
   */
  static #onSectionToggle(event, target) {
    event.preventDefault()
    const li = target.closest(".form-header")
    let foldable = li.nextElementSibling
    while (foldable && !foldable.classList.contains("foldable")) {
      foldable = foldable.nextElementSibling
    }
    if (foldable) {
      slideToggle(foldable)
    }
    return true
  }

  /**
   * Gère la suppression d'un élément de la feuille.
   *
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  static async #onDeleteItem(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const li = target.closest(".item")
    const itemType = li.dataset.itemType
    const uuid = li.dataset.uuid
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

    return await this.item.update(data)
  }

  // eslint-disable-next-line jsdoc/require-returns-check
  /**
   * Open the item sheet if it's a path or a capacity
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  static #onEditItem(event, target) {
    event.preventDefault()
    const li = target.closest(".item")
    const itemType = li.dataset.itemType

    switch (itemType) {
      case SYSTEM.ITEM_TYPE.path.id:
      case SYSTEM.ITEM_TYPE.capacity.id: {
        const uuid = li.dataset.uuid
        return fromUuid(uuid).then((document) => document.sheet.render(true))
      }
      default:
        break
    }
  }

  /**
   * Va mémoriser le choix qui a été sélectionné pour les conditionsState
   * @param {Event} event The event that triggered the selection
   * @param {COBaseItemSheet} sheet The sheet instance
   */
  static #onSelectStatus(event, sheet) {
    event.preventDefault()
    sheet.selectedStatus = event.currentTarget.value
  }

  /**
   * Handles the addition of a new action to the item and updates the item with the new action list.
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  static async #onAddAction(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    let newActions = foundry.utils.deepClone(this.document.actions)
    if (newActions.length !== 0 && this.document.type === SYSTEM.ITEM_TYPE.attack.id) {
      ui.notifications.warn(game.i18n.localize("CO.notif.attackActionLimit"))
      return false
    }
    let action = new Action({
      source: this.document.uuid,
      indice: newActions.length,
      type: "melee",
      img: "icons/svg/d20-highlight.svg",
      label: `${game.i18n.localize("CO.ui.newAction")}`,
    })
    newActions.push(action)
    return await this.document.update({ "system.actions": newActions })
  }

  /**
   * Handles the deletion of an action from the item and updates the item with the new action list.
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  static async #onDeleteAction(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const actionRootElement = target.closest(".action")
    const actionIndex = actionRootElement.dataset.itemId
    let newActions = foundry.utils.deepClone(this.item.actions)
    newActions.splice(actionIndex, 1)
    return await this.item.update({ "system.actions": newActions })
  }

  /**
   * Handles the addition of a new condition to the item and updates the item with the new action list.
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  static async #onAddCondition(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const li = target.closest(".action")
    const actionId = li.dataset.itemId

    const actions = this.item.toObject().system.actions
    actions[actionId].conditions.push(new Condition())
    return await this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the deletion of a condition from an item.
   *
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  static async #onDeleteCondition(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const li = target.closest(".condition")
    const actionId = li.dataset.actionId
    const conditionId = li.dataset.itemId

    const actions = this.item.toObject().system.actions
    actions[actionId].conditions.splice(conditionId, 1)
    return await this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the addition of a new action modifier.
   *
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  static async #onAddActionModifier(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const li = target.closest(".action")
    const actionId = li.dataset.itemId

    const actions = this.item.toObject().system.actions
    actions[actionId].modifiers.push(new Modifier({ source: this.item.uuid, type: this.item.type }))
    return await this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the deletion of an action modifier from the item.
   *
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves once the item has been updated.
   */
  static async #onDeleteActionModifier(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const li = target.closest(".modifier")
    const actionId = li.dataset.actionId
    const modId = li.dataset.itemId

    const actions = this.item.toObject().system.actions
    actions[actionId].modifiers.splice(modId, 1)
    return await this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the addition of a new resolver to an action item.
   *
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves when the item is updated.
   */
  static async #onAddResolver(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const li = target.closest(".action")
    const actionId = li.dataset.itemId

    const actions = this.item.toObject().system.actions
    actions[actionId].resolvers.push(
      new Resolver({
        type: SYSTEM.RESOLVER_TYPE.attack.id,
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

    return await this.item.update({ "system.actions": actions })
  }

  /**
   * Handles the deletion of a resolver from an action within the item.
   *
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves when the item update is complete.
   */
  static async #onDeleteResolver(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const li = target.closest(".resolver")
    const actionId = li.dataset.actionId
    const modId = li.dataset.itemId

    const actions = this.item.toObject().system.actions
    actions[actionId].resolvers.splice(modId, 1)
    return await this.item.update({ "system.actions": actions })
  }

  /**
   * Adds a new Modifier to the item and updates the item with the new modifier list.
   * Only for the item of type Feature or Profile
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves when the item is updated.
   */
  static async #onAddModifier(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const currentModifiers = this.item.modifiers
    currentModifiers.push(new Modifier({ source: this.item.uuid, type: this.item.type }))

    return this.item.update({ "system.modifiers": currentModifiers })
  }

  // eslint-disable-next-line jsdoc/require-returns-check
  /**
   * Handles the deletion of a modifier from the item.
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise} - A promise that resolves when the item is updated.
   */
  static #onDeleteModifier(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()

    const li = target.closest(".modifier")
    const rowId = li.dataset.itemId

    const currentModifiers = this.item.modifiers
    if (currentModifiers.length === 0) return

    currentModifiers.splice(rowId, 1)

    return this.item.update({ "system.modifiers": currentModifiers })
  }

  /**
   * Manage the lock/unlock button on the sheet
   * @param {Event} event The event that triggered the action
   * @param {COBaseItemSheet} sheet The sheet instance
   */
  static async #onSheetChangelock(event, sheet) {
    event.preventDefault()
    const modes = sheet.constructor.SHEET_MODES
    sheet._sheetMode = sheet.isEditMode ? modes.PLAY : modes.EDIT
    sheet.render()
  }

  static #onSelectActionIcon(event, target) {
    const input = target.nextElementSibling
    const path = input.value
    const options = {
      type: "image",
      current: path,
      field: input,
    }
    return new foundry.applications.apps.FilePicker(options).browse()
  }

  // #endregion

  // #region Drag-and-Drop Workflow

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    return this.isEditable
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    return this.isEditable && this.document.isOwner
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget
    if ("link" in event.target.dataset) return

    let dragData = null

    if (!dragData) return

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = ux.TextEditor.implementation.getDragEventData(event)
    const item = this.item
    const allowed = Hooks.call("dropItemSheetData", item, this, data)
    if (allowed === false) return

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

  // #endregion

  // #region Lock/unlock button

  /**
   * Manage the lock/unlock button on the sheet
   * @param {Event} event
   */
  async _onSheetChangeLock(event) {
    event.preventDefault()
    const modes = this.constructor.SHEET_MODES
    this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT
    await this.submit()
    this.render()
  }

  /**
   * Handle re-rendering the mode toggle on ownership changes.
   * @param {HTMLElement} element
   * @protected
   */
  _renderModeToggle(element) {
    const header = element.querySelector(".window-header")
    const toggle = header.querySelector(".mode-slider")
    if (this.isEditable && !toggle) {
      const toggle = document.createElement("co-toggle-switch")
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT
      toggle.classList.add("mode-slider")
      toggle.dataset.tooltip = "CO.SheetModeEdit"
      toggle.setAttribute("aria-label", game.i18n.localize("CO.SheetModeEdit"))
      toggle.addEventListener("change", this._onSheetChangeLock.bind(this))
      toggle.addEventListener("dblclick", (event) => event.stopPropagation())
      toggle.addEventListener("pointerdown", (event) => event.stopPropagation())
      header.prepend(toggle)
    } else if (this.isEditable) {
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT
    } else if (!this.isEditable && toggle) {
      toggle.remove()
    }
  }

  // #endregion
}

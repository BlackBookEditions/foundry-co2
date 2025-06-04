import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../utils.mjs"

import CoChat from "../../chat.mjs"
export default class CoBaseActorSheet extends ActorSheet {
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

  /** @override */
  async getData(options) {
    const context = super.getData(options)

    context.debugMode = game.settings.get("co", "debugMode")
    context.system = this.actor.system
    context.abilities = this.actor.system.abilities
    context.combat = this.actor.system.combat
    context.attributes = this.actor.system.attributes
    context.resources = this.actor.system.resources
    context.details = this.actor.system.details
    context.paths = this.actor.paths
    context.pathGroups = this.actor.pathGroups
    context.capacities = this.actor.capacities
    context.learnedCapacities = this.actor.learnedCapacities
    context.capacitiesOffPaths = this.actor.capacitiesOffPaths
    context.features = this.actor.features
    context.actions = this.actor.actions
    context.inventory = this.actor.inventory
    context.unlocked = this.isEditMode
    context.locked = this.isPlayMode

    context.visibleActions = await this.actor.getVisibleActions()
    context.visibleActivableActions = await this.actor.getVisibleActivableActions()
    context.visibleNonActivableActions = await this.actor.getVisibleNonActivableActions()
    context.visibleActivableTemporaireActions = await this.actor.getVisibleActivableTemporaireActions()
    context.visibleNonActivableNonTemporaireActions = await this.actor.getVisibleNonActivableNonTemporaireActions()
    context.currentEffects = await this.actor.customEffects

    // Select options
    context.choiceMoveUnit = SYSTEM.MOVEMENT_UNIT

    // Application V2 style
    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields

    if (CONFIG.debug.co?.sheets) console.debug(Utils.log(`CoBaseActorSheet - context`), context)
    return context
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)

    // Set toggle state and add status class to frame
    this._renderModeToggle(this.element[0])

    html.find(".section-toggle").click(this._onSectionToggle.bind(this))
    html.find(".sheet-change-lock").click(this._onSheetChangelock.bind(this))
    html.find(".item-chat.chat").click(this._onSendToChat.bind(this))
    html.find(".item-create").click(this._onCreateItem.bind(this))
    html.find(".item-edit").click(this._onEditItem.bind(this))
    html.find(".size-select").change(this._onSizeChange.bind(this))
    html.find(".capacity-learn").click(this._onLearnCapacity.bind(this))
    html.find(".capacity-unlearn").click(this._onUnlearnCapacity.bind(this))
    html.find(".customEffect-delete").click(this._onDeleteCustomEffect.bind(this))
  }

  /** @inheritDoc */
  _onDragStart(event) {
    super._onDragStart(event)
  }

  /**
   * Manage the toggle of the sections
   * @param {Event} event
   */
  _onSectionToggle(event) {
    event.preventDefault()
    const li = $(event.currentTarget).parents().next(".foldable")
    li.slideToggle("fast")
    return true
  }

  /**
   * Manage the lock/unlock button on the sheet
   * @param {Event} event
   */
  async _onSheetChangelock(event) {
    event.preventDefault()
    const modes = this.constructor.SHEET_MODES
    this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT
    await this.submit()
    this.render()
  }

  /**
   * Send the item details to the chat
   * Chat Type are :
   * - item : to display an item and all its actions
   * - action : to display the item and the action
   * - loot : to only display informations on the item
   * @param {Event} event
   */
  async _onSendToChat(event) {
    event.preventDefault()
    // Dataset has tooltip, chatType and if it's an action there are also indice and source
    const dataset = event.currentTarget.dataset
    const chatType = dataset.chatType

    let item
    let id
    let indice = null
    if (chatType === "item" || chatType === "loot") {
      id = $(event.currentTarget).parents(".item").data("itemId")
      item = this.actor.items.get(id)
    } else if (chatType === "action") {
      item = await fromUuid(dataset.source)
      indice = dataset.indice
    }

    let itemChatData = item.getChatData(item, this.actor, chatType, indice)

    await new CoChat(this.actor)
      .withTemplate("systems/co/templates/chat/item-card.hbs")
      .withData({
        actorId: this.actor.id,
        id: itemChatData.id,
        uuid: itemChatData.uuid,
        name: itemChatData.name,
        img: itemChatData.img,
        description: itemChatData.description,
        actions: itemChatData.actions,
      })
      .withWhisper(ChatMessage.getWhisperRecipients("GM").map((u) => u.id))
      .create()
  }

  /**
   * Create a new embedded item
   * @param {Event} event
   */
  _onCreateItem(event) {
    event.preventDefault()
    const target = event.currentTarget
    const type = target.dataset.type

    const itemData = {
      type: type,
      system: foundry.utils.expandObject({ ...target.dataset }),
    }
    delete itemData.system.type

    switch (type) {
      case SYSTEM.ITEM_TYPE.equipment.id:
        itemData.name = game.i18n.format("CO.ui.newItem", { item: "Equipement" })
        let subtype
        switch (itemData.system.subtype) {
          case "armors":
            subtype = SYSTEM.EQUIPMENT_SUBTYPES.armor.id
            break
          case "shields":
            subtype = SYSTEM.EQUIPMENT_SUBTYPES.shield.id
            break
          case "weapons":
            subtype = SYSTEM.EQUIPMENT_SUBTYPES.weapon.id
            break
          case "consumable":
            subtype = SYSTEM.EQUIPMENT_SUBTYPES.consumable.id
            break
          case "misc":
            subtype = SYSTEM.EQUIPMENT_SUBTYPES.misc.id
            break
        }
        itemData.system.subtype = subtype
        break
      case SYSTEM.ITEM_TYPE.capacity.id:
        itemData.name = game.i18n.format("CO.ui.newItem", { item: "Capacité" })
        itemData.system.learned = true
        break
      case SYSTEM.ITEM_TYPE.attack.id:
        itemData.name = game.i18n.format("CO.ui.newItem", { item: "Attaque" })
        itemData.system.subtype = "MELEE"
        itemData.system.learned = true
        break
    }

    return this.actor.createEmbeddedDocuments("Item", [itemData])
  }

  _onRoll(event) {
    const dataset = event.currentTarget.dataset
    const type = dataset.rollType
    const target = dataset.rollTarget

    switch (type) {
      case "skillcheck":
        this.actor.rollSkill(target)
      case "combatcheck":
        break
    }
    // Return this.actor.dmgRoll(event, this.actor);
    // return this.actor.attackRoll(event, this.actor)
    // return this.actor.initRoll(event, this.actor)
  }

  /**
   * Change la taille du prototypeToken en fonction du choix de la taille
   *
   * @param {Event} event The event object from the size change input.
   * @returns {Promise<void>} A promise that resolves when the actor's size has been updated.
   */
  async _onSizeChange(event) {
    await this.actor.updateSize(event.target.value)
  }

  /**
   * Open the embededd item sheet
   * @param {*} event
   * @private
   */
  _onEditItem(event) {
    event.preventDefault()
    const li = event.currentTarget.closest(".item")
    const uuid = li.dataset.itemUuid
    const { id } = foundry.utils.parseUuid(uuid)
    let document = this.actor.items.get(id)
    return document.sheet.render(true)
  }

  /**
   * Handles the event when a capacity is learned.
   *
   * @param {Event} event The event object triggered by the user interaction.
   * @returns {Promise<void>} A promise that resolves when the capacity has been marked as learned.
   */
  async _onLearnCapacity(event) {
    event.preventDefault()
    const capacityId = $(event.currentTarget).parents(".item").data("itemId")
    await this.actor.toggleCapacityLearned(capacityId, true)
  }

  /**
   * Handles the event when a capacity is unlearned by the actor.
   *
   * @param {Event} event The event that triggered the unlearn capacity action.
   * @returns {Promise<void>} A promise that resolves when the capacity has been unlearned.
   */
  async _onUnlearnCapacity(event) {
    event.preventDefault()
    const capacityId = $(event.currentTarget).parents(".item").data("itemId")
    await this.actor.toggleCapacityLearned(capacityId, false)
  }

  /**
   * Permet la suppression d'un effet personnalisé à la main au cas où il ne se terminerait pas de lui-même
   * Ou pour simuler un arrêt précoce à cause d'un sort de soin par exemple
   * @param {Event} event
   */
  async _onDeleteCustomEffect(event) {
    event.preventDefault()
    const dataset = event.currentTarget.dataset
    let effectname = dataset.ceName
    const ce = this.actor.system.currentEffects.find((ce) => ce.slug === effectname)
    if (ce) {
      await this.actor.deleteCustomEffect(ce)
    }
  }

  /**
   * Handle re-rendering the mode toggle on ownership changes.
   * @param {HTMLElement} element 
   * @protected
   */
  _renderModeToggle(element) {
    const header = element.querySelector(".window-header");
    const toggle = header.querySelector(".mode-slider");
    if (this.isEditable && !toggle) {
      const toggle = document.createElement("co-toggle-switch");
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT;
      toggle.classList.add("mode-slider");
      ////toggle.dataset.tooltip = "DND5E.SheetModeEdit";
      ////toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
      toggle.addEventListener("change", this._onSheetChangelock.bind(this));
      toggle.addEventListener("dblclick", event => event.stopPropagation());
      toggle.addEventListener("pointerdown", event => event.stopPropagation());
      header.prepend(toggle);
    } else if (this.isEditable) {
      toggle.checked = this._sheetMode === this.constructor.SHEET_MODES.EDIT;
    } else if (!this.isEditable && toggle) {
      toggle.remove();
    }
  }
}

import CoBaseActorSheet from "./base-actor-sheet.mjs"
import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../utils.mjs"
import { CoEditAbilitiesDialog } from "../../dialogs/edit-abilities-dialog.mjs"
import { Action } from "../../models/schemas/action.mjs"

export default class COCharacterSheet extends CoBaseActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      height: 600,
      width: 800,
      template: "systems/co/templates/actors/character-sheet.hbs",
      classes: ["co", "sheet", "actor", "character"],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
    })
  }

  /** @override */
  async getData(options) {
    const context = super.getData(options)
    context.profiles = this.actor.profiles

    context.xpMax = this.actor.system.attributes.xp.max
    context.xpSpent = await this.actor.system.getSpentXP()
    context.xpLeft = await this.actor.system.getAvailableXP()
    context.visibleActions = await this.actor.getVisibleActions()
    context.visibleActivableActions = (await this.actor.getVisibleActivableActions()) ?? []
    context.ActivableChargeableActions = await this.actor.getActivableChargeableActions()
    context.visibleNonActivableActions = await this.actor.getVisibleNonActivableActions()
    context.visibleActivableTemporaireActions = await this.actor.getVisibleActivableTemporaireActions()
    context.visibleNonActivableNonTemporaireActions = await this.actor.getVisibleNonActivableNonTemporaireActions()

    context.overloadMalus = this.actor.malusFromArmor

    // Choices
    context.choiceAbilities = SYSTEM.ABILITIES
    context.choiceSize = SYSTEM.SIZES

    //Activation desactivation des defenses
    context.partialDef = this.actor.hasEffect("partialDef") ? true : false
    context.partialfa = "fa-solid fa-shield-halved"
    context.fullDef = this.actor.hasEffect("fullDef") ? true : false
    context.fullfa = "fa-solid fa-shield"
    if (CONFIG.debug.co?.sheets) console.debug(Utils.log(`COCharacterSheet - context`), context)
    return context
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)
    html.find(".abilities-edit").click(this._onEditAbilities.bind(this))
    html.find(".item-delete").click(this._onDeleteItem.bind(this))
    html.find(".path-delete").click(this._onDeletePath.bind(this))
    html.find(".rollable").click(this._onRoll.bind(this))
    html.find(".toggle-action").click(this._onUseAction.bind(this))
    html.find(".toggle-effect").click(this._onUseEffect.bind(this))
    html.find(".attack").click(this._onUseAction.bind(this))
    html.find(".damage").click(this._onUseAction.bind(this))
    html.find(".inventory-equip").click(this._onEquippedToggle.bind(this))
    html.find(".use-recovery").click(this._onUseRecovery.bind(this))
    html.find(".active-rest").click(this._onUseRecovery.bind(this))
  }

  /**
   * Action d'utiliser : active ou désactive une action
   * @param {*} event
   */
  async _onUseAction(event) {
    event.preventDefault()
    const shiftKey = !!event.shiftKey
    const dataset = event.currentTarget.dataset
    const action = dataset.action
    const type = dataset.type
    const source = dataset.source
    const indice = dataset.indice

    let activation
    if (action === "activate") {
      activation = await this.actor.activateAction({ state: true, source, indice, type, shiftKey })
    } else if (action === "unactivate") {
      activation = await this.actor.activateAction({ state: false, source, indice, type })
    }
  }

  /**
   * Handles the use effect event.
   *
   * @param {Event} event The event object triggered by the user interaction.
   * @returns {Promise<void>} A promise that resolves when the effect activation is complete.
   */
  async _onUseEffect(event) {
    event.preventDefault()
    const dataset = event.currentTarget.dataset
    const effectid = dataset.effect
    const action = dataset.action
    let activation
    if (action === "activate") {
      activation = await this.actor.activateCOStatusEffect({ state: true, effectid })
    } else if (action === "unactivate") {
      activation = await this.actor.activateCOStatusEffect({ state: false, effectid })
    }
  }

  /** @inheritDoc */
  _onDragStart(event) {
    const target = event.currentTarget
    let dragData

    // Si c'est une action : dataset contient itemUuid et indice
    if (target.classList.contains("action")) {
      const { id } = foundry.utils.parseUuid(target.dataset.itemUuid)
      const indice = target.dataset.indice
      const item = this.actor.items.get(id)
      // Get source (item uuid) and indice
      dragData = item.actions[indice].toDragData()
      dragData.name = item.name
      dragData.img = item.img
      dragData.actionName = item.actions[indice].actionName
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
    }
    // Sinon dataset contient itemUuid, itemId, itemType
    else super._onDragStart(event)
  }

  /**
   * Gère l'utilisation des points de récupération ou du repos complet pour l'acteur.
   *
   * @param {Event} event L'événement qui a déclenché ce gestionnaire.
   * @returns {Promise} Une promesse qui se résout lorsque l'action de récupération est terminée.
   */
  _onUseRecovery(event) {
    event.preventDefault()
    const dataset = event.currentTarget.dataset
    let isFullRest = false
    if (dataset.option && dataset.option === "fullRest") isFullRest = true
    return this.actor.system.useRecovery(isFullRest)
  }

  /**
   * Equip or unequip the equipment
   * @param {*} event
   * @private
   */
  async _onEquippedToggle(event) {
    event.preventDefault()
    const itemId = $(event.currentTarget).parents(".item").data("itemId")
    const bypassChecks = event.shiftKey
    await this.actor.toggleEquipmentEquipped(itemId, bypassChecks)
  }

  /**
   * Delete the selected item
   * @param {*} event
   * @private
   */
  async _onDeleteItem(event) {
    event.preventDefault()
    const li = $(event.currentTarget).parents(".item")
    const itemId = li.data("itemId")
    const itemUuid = li.data("itemUuid")
    const itemType = li.data("itemType")
    switch (itemType) {
      case "path":
        this._onDeletePath(event)
        break
      case "capacity":
        this._onDeleteCapacity(itemUuid)
        break
      case "feature":
        this._onDeleteFeature(itemUuid)
        break
      case "profile":
        this._onDeleteProfile(event)
        break
      default:
        this.actor.deleteEmbeddedDocuments("Item", [itemId])
    }
  }

  /**
   * Deletes a feature from the actor.
   *
   * @param {string} itemUuid The UUID of the item to be deleted.
   * @returns {Promise<void>} A promise that resolves when the feature is deleted.
   */
  async _onDeleteFeature(itemUuid) {
    await this.actor.deleteFeature(itemUuid)
  }

  /**
   * Delete the selected profile
   * @param {*} event
   * @private
   */
  async _onDeleteProfile(event) {
    event.preventDefault()
    const li = $(event.currentTarget).parents(".item")
    const profileId = li.data("itemId")

    this.actor.deleteProfile(profileId)
  }

  /**
   * Delete the selected path
   * @param {*} event
   * @private
   */
  async _onDeletePath(event) {
    event.preventDefault()

    const li = $(event.currentTarget).closest(".item")
    const pathUuid = li.data("itemUuid")

    this.actor.deletePath(pathUuid)
  }

  /**
   * Handles the deletion of a capacity item from the actor.
   *
   * @param {string} itemUuid The unique identifier of the item to be deleted.
   * @returns {Promise<void>} A promise that resolves when the capacity item has been deleted.
   */
  async _onDeleteCapacity(itemUuid) {
    await this.actor.deleteCapacity(itemUuid)
  }

  /** @inheritdoc */
  async _onDrop(event) {
    // On récupère le type et l'uuid de l'item
    const data = TextEditor.getDragEventData(event)
    const actor = this.actor

    /**
     * A hook event that fires when some useful data is dropped onto an CharacterSheet.
     * @function dropCharacterSheetData
     * @memberof hookEvents
     * @param {Actor} actor      The Actor
     * @param {ActorSheet} sheet The ActorSheet application
     * @param {object} data      The data that has been dropped onto the sheet
     */
    if (Hooks.call("co.dropCharacterSheetData", actor, this, data) === false) return

    if (data.type !== "Item") return
    return this._onDropItem(event, data)
  }

  /**
   * Handle the drop event for an item.
   *
   * @param {Event} event The drop event.
   * @param {Object} data The data associated with the dropped item.
   * @returns {Promise<boolean>} - Returns false if the actor is not the owner or if the item type is not handled.
   */
  async _onDropItem(event, data) {
    event.preventDefault()
    if (!this.actor.isOwner) return false
    // On récupère l'item de type COItem
    const item = await Item.implementation.fromDropData(data)

    switch (item.type) {
      case SYSTEM.ITEM_TYPE.equipment.id:
        return this.actor.addEquipment(item)
      case SYSTEM.ITEM_TYPE.feature.id:
        return await this.actor.addFeature(item)
      case SYSTEM.ITEM_TYPE.profile.id:
        if (this.actor.profiles.length > 0) {
          ui.notifications.warn(game.i18n.localize("CO.notif.profilAlreadyExist"))
          break
        }
        return this.actor.addProfile(item)
      case SYSTEM.ITEM_TYPE.path.id:
        return this.actor.addPath(item)
      case SYSTEM.ITEM_TYPE.capacity.id:
        return this.actor.addCapacity(item, null)
      default:
        return false
    }
  }

  /**
   * Edit Abilities event hander
   * @param {Event} event
   */
  async _onEditAbilities(event) {
    event.preventDefault()
    return new CoEditAbilitiesDialog(this.actor).render(true)
  }
}

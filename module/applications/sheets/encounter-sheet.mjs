import CoBaseActorSheet from "./base-actor-sheet.mjs"
import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../utils.mjs"

export default class COEncounterSheet extends CoBaseActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      height: 600,
      width: 800,
      template: "systems/co/templates/encounter/encounter-sheet.hbs",
      classes: ["co", "sheet", "actor", "encounter"],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
    })
  }

  /** @override */
  getData(options) {
    const context = super.getData(options)
    context.attacks = this.actor.system.attacks
    context.attacksActions = this.actor.attacksActions
    context.choiceArchetypes = SYSTEM.ENCOUNTER_ARCHETYPES
    context.choiceCategories = SYSTEM.ENCOUNTER_CATEGORIES
    context.choiceBossRanks = SYSTEM.ENCOUNTER_BOSS_RANKS
    context.choiceSizes = SYSTEM.SIZES
    if (CONFIG.debug.co?.sheets) console.debug(Utils.log(`COEncounterSheet - context`), context)
    return context
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)
    html.find(".item-edit").click(this._onEditItem.bind(this))
    html.find(".item-delete").click(this._onDeleteItem.bind(this))
    html.find(".path-delete").click(this._onDeletePath.bind(this))
    html.find(".rollable").click(this._onRoll.bind(this))
    html.find(".toggle-action").click(this._onUseAction.bind(this))
    html.find(".capacity-learn").click(this._onLearnedToggle.bind(this))
    html.find(".size-select").change(this._onSizeChange.bind(this))
    html.find(".inventory-equip").click(this._onEquippedToggle.bind(this))
  }

  _onUseAction(event) {
    const dataset = event.currentTarget.dataset
    const action = dataset.action
    const type = dataset.type
    const source = dataset.source
    const indice = dataset.indice

    if (action === "activate") {
      this.actor.activateAction(true, source, indice, type)
    } else if (action === "unactivate") {
      this.actor.activateAction(false, source, indice, type)
    }
  }

  /**
   * Action de selection : change la taille du prototypeToken en fonction du choix de la taille
   * @param {*} event
   */
  async _onSizeChange(event) {
    //Va demander à l'acteur de mettre à jour la taille de ses tokens
    const li = event.target.value
    const size = li
    await this.actor.updateSize(size)
  }

  /**
   * Learned or unlearned the capacity in the path view
   * @param {*} event
   * @private
   */
  _onLearnedToggle(event) {
    event.preventDefault()
    const capacityId = $(event.currentTarget).parents(".item").data("itemId")
    this.actor.toggleCapacityLearned(capacityId)
  }

  /**
   * Select or unselect the capacity in the path view
   * @param {*} event
   * @private
   */
  _onEquippedToggle(event) {
    event.preventDefault()
    const itemId = $(event.currentTarget).parents(".item").data("itemId")
    this.actor.toggleEquipmentEquipped(itemId)
  }

  /**
   * Open the item sheet
   * For capacity, open the embededd item
   * @param {*} event
   * @private
   */
  _onEditItem(event) {
    event.preventDefault()
    const li = $(event.currentTarget).closest(".item")
    const id = li.data("itemId")
    if (!foundry.utils.isEmpty(id) && id !== "") {
      let document = this.actor.items.get(id)
      return document.sheet.render(true)
    }
  }

  /**
   * Handle the deletion of an item from the actor's inventory.
   *
   * @param {Event} event The event that triggered the deletion.
   * @returns {Promise<void>} - A promise that resolves when the deletion is complete.
   *
   * @private
   */
  async _onDeleteItem(event) {
    event.preventDefault()
    const li = $(event.currentTarget).parents(".item")
    const itemId = li.data("itemId")
    const itemType = li.data("itemType")
    if (itemType === "path") this._onDeletePath(event)
    else if (itemType === "capacity") this._onDeleteCapacity(event)
    else if (itemType === "feature") this._onDeleteFeature(event)
    else this.actor.deleteEmbeddedDocuments("Item", [itemId])
  }

  /**
   * Handles the deletion of a feature from the actor.
   *
   * @param {Event} event The event that triggered the deletion.
   * @returns {Promise<void>} - A promise that resolves when the feature is deleted.
   */
  async _onDeleteFeature(event) {
    event.preventDefault()
    const li = $(event.currentTarget).parents(".item")
    const featureId = li.data("itemId")
    this.actor.deleteFeature(featureId)
  }

  /**
   * Handles the deletion of a path item.
   *
   * @param {Event} event The event that triggered the deletion.
   * @returns {Promise<void>} A promise that resolves when the path is deleted.
   */
  async _onDeletePath(event) {
    event.preventDefault()
    const li = $(event.currentTarget).parents(".item")
    const pathId = li.data("itemId")

    this.actor.deletePath(pathId)
  }

  /**
   * Delete the selected capacity
   * @param {Event} event
   * @private
   */
  async _onDeleteCapacity(event) {
    event.preventDefault()
    const li = $(event.currentTarget).parents(".item")
    const capacityId = li.data("itemId")

    await this.actor.deleteCapacity(capacityId)
  }

  /** @inheritdoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event)
    const actor = this.actor

    /**
     * A hook event that fires when some useful data is dropped onto an EncounterSheet.
     * @function dropEncounterSheetData
     * @memberof hookEvents
     * @param {Actor} actor      The Actor
     * @param {ActorSheet} sheet The ActorSheet application
     * @param {object} data      The data that has been dropped onto the sheet
     */
    if (Hooks.call("co.dropEncounterSheetData", actor, this, data) === false) return

    // Handle different data types
    switch (data.type) {
      case "Actor":
        return
      case "Item":
        return this._onDropItem(event, data)
      case "Folder":
    }
  }

  /**
   * Handle the drop event for an item.
   *
   * @param {Event} event The drop event.
   * @param {Object} data The data associated with the dropped item.
   * @returns {Promise<boolean>} Returns false if the actor is not the owner, otherwise returns the result of the corresponding item addition method.
   */
  async _onDropItem(event, data) {
    event.preventDefault()
    if (!this.actor.isOwner) return false
    const item = await Item.implementation.fromDropData(data)

    switch (item.type) {
      case SYSTEM.ITEM_TYPE.equipment.id:
        return this.actor.addEquipment(item)
      case SYSTEM.ITEM_TYPE.feature.id:
        return false
      case SYSTEM.ITEM_TYPE.profile.id:
        return false
      case SYSTEM.ITEM_TYPE.attack.id:
        return this.actor.system.addAttack(item)
      case SYSTEM.ITEM_TYPE.path.id:
        return this.actor.addPath(item)
      case SYSTEM.ITEM_TYPE.capacity.id:
        return this.actor.addCapacity(item, null)
      default:
        return false
    }
  }
}

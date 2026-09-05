import COBaseActorSheet from "./base-actor-sheet.mjs"
import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../helpers/utils.mjs"

export default class COEncounterSheet extends COBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["encounter"],
    position: {
      width: 800,
      height: 600,
    },
    window: {
      contentClasses: ["encounter-content"],
      resizable: true,
    },
    actions: {
      deleteItem: COEncounterSheet.#onDeleteItem,
      roll: COEncounterSheet.#onRoll,
      deleteMaster: COEncounterSheet.#onDeleteMaster,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: "systems/co2/templates/actors/encounter-header.hbs" },
    sidebar: { template: "systems/co2/templates/actors/encounter-sidebar.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: "systems/co2/templates/actors/encounter-main.hbs", templates: ["systems/co2/templates/actors/shared/actions.hbs"] },
    loot: { template: "systems/co2/templates/actors/encounter-loot.hbs" },
    paths: { template: "systems/co2/templates/actors/shared/paths.hbs", templates: ["systems/co2/templates/actors/shared/capacities-nopath.hbs"], scrollable: [""] },
    effects: { template: "systems/co2/templates/actors/shared/effects.hbs" },
    notes: { template: "systems/co2/templates/actors/encounter-notes.hbs" },
    companion: { template: "systems/co2/templates/actors/companion.hbs" },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "main" }, { id: "loot" }, { id: "paths" }, { id: "effects" }, { id: "notes" }, { id: "companion" }],
      initial: "main",
      labelPrefix: "CO.sheet.tabs.encounter",
    },
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    // Supprimer l'onglet "companion" si ce n'est pas un companion
    if (!this.actor.system.companion?.isCompanion) {
      console.log("je dois supprimer l'onglet")
      const companionTab = this.element.querySelector('.tab[data-tab="companion"]')
      const companionTab2 = this.element.querySelector('a[data-tab="companion"]')
      const companionContent = this.element.querySelector('.tab-content[data-tab="companion"]')

      if (companionTab2) companionTab2.remove()

      if (companionTab) {
        companionTab.remove() // Supprime l'onglet du menu
      }
      if (companionContent) {
        companionContent.remove() // Supprime le contenu de l'onglet
      }
    }

    // Affichage selon les permissions
    if (!this.isLimitedView) return

    const notesTab = this.element?.querySelector('.tab[data-tab="notes"]')
    if (notesTab) notesTab.classList.add("active")

    const notesPart = this.element?.querySelector('[data-application-part="notes"]')
    if (notesPart) notesPart.style.removeProperty("display")
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options)

    // En mode édition, on garde tous les onglets (pas seulement le mode limitedView)
    // L'onglet companion doit être visible même en édition
    if (this.isLimitedView) {
      delete options.tabs
    }
  }

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options)

    if (!this.isLimitedView) return parts
    const allowedParts = ["header", "sidebar", "notes"]

    const finalParts = Object.fromEntries(allowedParts.filter((partName) => parts[partName]).map((partName) => [partName, parts[partName]]))
    return finalParts
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()
    context.attacks = this.actor.system.attacks
    context.attacksActions = this.actor.attacksActions

    // Enrich notes
    context.enrichedNotesPublic = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.details.notes.public, { async: true })
    context.enrichedNotesPrivate = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.details.notes.private, { async: true })

    // Gestion des richesses
    context.hasWealth = this.#checkHasWealth(context.system.wealth)

    // Select options
    context.choiceArchetypes = SYSTEM.ENCOUNTER_ARCHETYPES
    context.choiceCategories = SYSTEM.ENCOUNTER_CATEGORIES
    context.choiceBossRanks = SYSTEM.ENCOUNTER_BOSS_RANKS
    context.choiceSizes = SYSTEM.SIZES

    //Companion
    context.hasMaster = false
    context.isCompanion = this.actor.system.companion.isCompanion
    if (this.actor.system.companion.isCompanion) {
      // Ajouter l'onglet "companion" uniquement si isCompanion est true

      context.masterUuid = this.actor.system.companion.master
      // Si l'Uuid est définie on récupère les infos
      if (context.masterUuid) {
        try {
          // Utiliser le cache si disponible
          if (!this._masterCache || this._masterCache.uuid !== context.masterUuid) {
            this._masterCache = await fromUuid(context.masterUuid)
          }
          if (this._masterCache) {
            context.masterImg = this._masterCache.img
            context.masterName = this._masterCache.name
            context.hasMaster = true
          } else {
            console.error("Master non trouvé avec l'Uuid :", context.masterUuid)
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du master :", error)
        }
      }
    }

    if (CONFIG.debug.co2?.sheets) console.debug(Utils.log(`COEncounterSheet - context`), context)
    return context
  }

  /**
   * Vérifie si le personnage possède au moins une devise
   * @param {Object} wealth L'objet wealth du système
   * @returns {boolean} True si au moins une devise > 0
   * @private
   */
  #checkHasWealth(wealth) {
    if (!wealth || typeof wealth !== "object") return false

    return Object.values(wealth).some((currency) => currency?.value && currency.value > 0)
  }

  /**
   * Delete the selected item
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onDeleteItem(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const li = target.closest(".item")
    if (!li) return
    const id = li.dataset.itemId
    const uuid = li.dataset.itemUuid
    const type = li.dataset.itemType
    if (!uuid) return
    switch (type) {
      case "path":
        await this.actor.deletePath(uuid)
        break
      case "capacity":
        await this.actor.deleteCapacity(uuid)
        break
      case "container":
        await this.actor.deleteContainer(uuid)
        break
      default:
        await this.actor.deleteEmbeddedDocuments("Item", [id])
    }
  }

  /**
   * Handles the deletion of a capacity item from the actor.
   *
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>} A promise that resolves when the capacity item has been deleted.
   */
  static async #onRoll(event, target) {
    const dataset = target.dataset
    const type = dataset.rollType
    const rollTarget = dataset.rollTarget

    switch (type) {
      case "skillcheck":
        this.actor.rollSkill(rollTarget)
      case "combatcheck":
        break
    }
  }

  static async #onDeleteMaster(event, target) {
    event.preventDefault()
    await this.actor.system.deleteMaster()
  }

  /** @override */
  _onDragStart(event) {
    if (!game.user.isGM) return
    const target = event.currentTarget
    let dragData

    // Si c'est une attaque : dataset contient itemUuid
    if (target.classList.contains("attack")) {
      const type = "co.attack"
      const { id } = foundry.utils.parseUuid(target.dataset.itemUuid)
      const item = this.document.items.get(id)
      dragData = item.toDragData()
      dragData.type = "co.attack"
      dragData.name = item.name
      dragData.img = item.img
      // Données de la première action pour la macro
      if (item.system.actions?.length > 0) {
        const action = item.system.actions[0]
        dragData.hasDamage = action.hasResolversWithDomage
        dragData.isAutoAttack = action.autoAttack
      }
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
      return
    }

    // Si c'est une action : dataset contient itemUuid et indice
    if (target.classList.contains("action")) {
      const { id } = foundry.utils.parseUuid(target.dataset.itemUuid)
      const indice = target.dataset.indice
      const item = this.document.items.get(id)
      // Get source (item uuid) and indice
      dragData = item.actions[indice].toDragData()
      dragData.name = item.name
      dragData.img = item.img
      dragData.actionName = item.actions[indice].actionName
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
      return
    }

    // Si c'est une caractéristique : dataset contient itemUuid et indice
    if (target.classList.contains("ability-id")) {
      const type = "co.ability"
      const rollType = "skillcheck"
      const rollTarget = target.dataset.rollTarget
      dragData = {
        type,
        rollType,
        rollTarget,
      }
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
      return
    }

    // Si c'est un des champs de richesse
    if (target.classList.contains("wealth")) {
      const wealthType = target.nextElementSibling.dataset.wealthType
      const wealthValue = this.document.system.wealth[wealthType]?.value
      if (wealthValue === 0) return // Ne pas drag si la richesse est à 0
      dragData = {
        type: "wealth",
        wealthType: wealthType,
        value: wealthValue,
        encounterId: this.document.id,
        encounterUuid: this.document.uuid,
      }
    }

    // Owned Items
    if (target.dataset.itemId) {
      const item = this.actor.items.get(target.dataset.itemId)
      dragData = item.toDragData()
    }

    // Set data transfer
    if (!dragData) return
    dragData.sourceTransfer = "encounter"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
  }

  /** @override */
  async _onDrop(event) {
    // On récupère le type et l'uuid de l'item
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (foundry.utils.isEmpty(data)) return // Si pas de données, on ne fait rien
    if (foundry.utils.hasProperty(data, "source")) return
    const actor = this.actor
    const allowed = Hooks.call("dropActorSheetData", actor, this, data)
    if (allowed === false) return

    /**
     * A hook event that fires when some useful data is dropped onto an EncounterSheet.
     * @function dropEncounterSheetData
     * @memberof hookEvents
     * @param {Actor} actor      The Actor
     * @param {ActorSheet} sheet The ActorSheet application
     * @param {object} data      The data that has been dropped onto the sheet
     */
    if (Hooks.call("co.dropEncounterSheetData", actor, this, data) === false) return

    if (data.type !== "Item") {
      // Si on drop un acteur et que l'on est sur une fiche de rencontre de type compagnon, c'est un master !
      if (this.actor.system.companion.isCompanion) {
        console.log("drop d'acteur", data)
        if (data.uuid === null || data.uuid === undefined) {
          console.error("L'uuid de l'acteur dropé n'est aps définie, on ne peux pas récupérer le master")
          return
        }
        const dropedMaster = await fromUuid(data.uuid)
        if (dropedMaster === null || dropedMaster === undefined) {
          console.error("L'acteur dropé n'est pas définie, on ne peux pas récupérer le master")
          return
        }
        await this.actor.update({ "system.companion.master": data.uuid })
        await this.render(true)
        return
      }
    }
    // On récupère l'item de type COItem
    let item = await Item.implementation.fromDropData(data)

    // Gestion du transfert partiel avec SHIFT pour les équipements empilables venant d'un personnage
    const isShiftDrop = event.shiftKey
    const isStackableEquipment = item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.properties?.stackable

    if (data?.sourceTransfer === "character" && data.sourceActorUuid) {
      // Ne pas traiter si c'est le même acteur
      if (data.sourceActorUuid !== this.actor.uuid) {
        const sourceActor = await fromUuid(data.sourceActorUuid)
        if (sourceActor) {
          const { id } = foundry.utils.parseUuid(data.uuid)
          const sourceItem = sourceActor.items.get(id)
          if (sourceItem) {
            // SHIFT + drop : transfert partiel d'une unité pour les objets empilables
            if (isShiftDrop && isStackableEquipment) {
              // Cloner l'item avec 1 unité AVANT de modifier la source
              item = item.clone({ "system.quantity.current": 1 }, { keepId: false })
              const newQuantity = sourceItem.system.quantity.current - 1
              if (newQuantity > 0) {
                // Décrémenter la quantité sur la source
                await sourceItem.update({ "system.quantity.current": newQuantity })
              } else {
                // Supprimer l'item si la quantité atteint 0
                await sourceActor.deleteEmbeddedDocuments("Item", [id])
              }
            } else {
              // Transfert complet : supprimer l'item de la source
              await sourceActor.deleteEmbeddedDocuments("Item", [id])
            }
          }
        }
      }
    }

    return this._onDropItem(event, item)
  }

  /** @override */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null

    // Dépôt sur la ligne d'un contenant : on range l'objet dedans (SHIFT = 1 unité)
    const containerUuid = this._getContainerDropTarget(event)
    if (containerUuid && item.type === SYSTEM.ITEM_TYPE.equipment.id) {
      return await this._dropItemInContainer(containerUuid, item, event.shiftKey)
    }

    // Dépôt hors d'un contenant : si l'objet venait d'un contenant, on l'en sort (SHIFT = 1 unité)
    if (item.type === SYSTEM.ITEM_TYPE.equipment.id && item.parent?.uuid === this.actor.uuid) {
      const source = this.actor.containers.find((c) => c.system.contents.includes(item.uuid))
      if (source) {
        await this._transferItem(item, source, null, event.shiftKey)
        return item
      }
    }

    if (this.actor.uuid === item.parent?.uuid) {
      const result = await this._onSortItem(event, item)
      return result?.length ? item : null
    }

    switch (item.type) {
      case SYSTEM.ITEM_TYPE.path.id:
        return await this.actor.addPath(item)
      case SYSTEM.ITEM_TYPE.capacity.id:
        return await this.document.addCapacity(item, null)
      case SYSTEM.ITEM_TYPE.container.id:
        // Crée le contenant + copie ses objets sur la rencontre et re-cible les liens
        return await this.actor.addContainer(item)
      case SYSTEM.ITEM_TYPE.equipment.id:
        // Gestion des équipements empilables : fusionner si l'item existe déjà
        if (item.system.properties?.stackable) {
          const existingItem = this.actor.items.find((i) => i.system.slug === item.system.slug)
          if (existingItem) {
            let quantity = existingItem.system.quantity.current + item.system.quantity.current
            if (existingItem.system.quantity.max) {
              quantity = Math.min(quantity, existingItem.system.quantity.max)
            }
            await existingItem.update({ "system.quantity.current": quantity })
            return existingItem
          }
        }
        return await Item.implementation.create(item.toObject(), { parent: this.actor })
      default:
        return await Item.implementation.create(item.toObject(), { parent: this.actor })
    }
  }
}

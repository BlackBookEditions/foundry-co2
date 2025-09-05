import COBaseActorSheet from "./base-actor-sheet.mjs"
import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../utils.mjs"
import { CoEditAbilitiesDialog } from "../../dialogs/edit-abilities-dialog.mjs"
import { COMiniCharacterSheet } from "./mini-character-sheet.mjs"
import { COLevelUpDialog } from "../../dialogs/levelup-dialog.mjs"

export default class COCharacterSheet extends COBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["co", "actor", "character"],
    position: {
      width: 840,
      height: 600,
    },
    window: {
      contentClasses: ["character-content"],
      resizable: true,
    },
    actions: {
      editAbilities: COCharacterSheet.#onEditAbilities,
      deleteItem: COCharacterSheet.#onDeleteItem,
      roll: COCharacterSheet.#onRoll,
      attack: COCharacterSheet.#onUseAction,
      damage: COCharacterSheet.#onUseAction,
      inventoryEquip: COCharacterSheet.#onEquippedToggle,
      useRecovery: COCharacterSheet.#onUseRecovery,
      openMiniSheet: COCharacterSheet.#onOpenMiniSheet,
      sortActions: COCharacterSheet.#onSortActions,
      openLevelUp: COCharacterSheet.#onOpenLevelUp,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: "systems/co/templates/actors/character-header.hbs" },
    sidebar: { template: "systems/co/templates/actors/character-sidebar.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: "systems/co/templates/actors/character-main.hbs", templates: ["systems/co/templates/actors/shared/actions.hbs"] },
    inventory: { template: "systems/co/templates/actors/character-inventory.hbs" },
    paths: { template: "systems/co/templates/actors/shared/paths.hbs", templates: ["systems/co/templates/actors/shared/capacities-nopath.hbs"], scrollable: [""] },
    effects: { template: "systems/co/templates/actors/shared/effects.hbs" },
    biography: { template: "systems/co/templates/actors/character-biography.hbs" },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "main" }, { id: "inventory" }, { id: "paths" }, { id: "effects" }, { id: "biography" }],
      initial: "main",
      labelPrefix: "CO.sheet.tabs.character",
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.profiles = this.document.profiles
    context.xpMax = this.document.system.attributes.xp.max
    context.xpSpent = await this.document.system.getSpentXP()
    context.xpLeft = await this.document.system.getAvailableXP()
    context.overloadMalus = this.document.malusFromArmor

    // Gestion des défenses
    context.partialDef = this.document.hasEffect("partialDef")
    context.fullDef = this.document.hasEffect("fullDef")

    // Biographie et Apparence
    context.enrichedBiographyPublic = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.details.biography.public, { async: true })
    context.enrichedBiographyPrivate = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.details.biography.private, { async: true })
    context.enrichedAppearancePublic = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.details.appearance.public, { async: true })
    context.enrichedAppearancePrivate = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.details.appearance.private, { async: true })

    // Récupération du statut expanded depuis le localStorage
    let biographyMiscExpanded = true
    try {
      const key = `co-${this.document.id}-biography-misc`
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        const parsedData = JSON.parse(stored)
        biographyMiscExpanded = parsedData.expanded === true
      }
    } catch (e) {
      biographyMiscExpanded = true
    }
    let biographyBioExpanded = true
    try {
      const key = `co-${this.document.id}-biography-bio`
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        const parsedData = JSON.parse(stored)
        biographyBioExpanded = parsedData.expanded === true
      }
    } catch (e) {
      biographyBioExpanded = true
    }
    let biographyAppearanceExpanded = true
    try {
      const key = `co-${this.document.id}-biography-appearance`
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        const parsedData = JSON.parse(stored)
        biographyAppearanceExpanded = parsedData.expanded === true
      }
    } catch (e) {
      biographyAppearanceExpanded = true
    }
    context.biographyMiscExpanded = biographyMiscExpanded
    context.biographyBioExpanded = biographyBioExpanded
    context.biographyAppearanceExpanded = biographyAppearanceExpanded

    // Select options
    context.choiceAbilities = SYSTEM.ABILITIES
    context.choiceSize = SYSTEM.SIZES

    if (CONFIG.debug.co?.sheets) console.debug(Utils.log(`COCharacterSheet - context`), context)

    // État De Tri (Null = Pas De Tri → Ordre D’origine)
    const sortState = this._sortState ?? null
    context.sortState = sortState ?? { key: "none", dir: "asc" }

    // Source Utilisée Par Le Template (visibleActivableActions)
    const listSource = context.visibleActivableActions ?? []
    const list = Array.from(listSource)

    // Si Aucun Tri Demandé → Conserver L’ordre Initial
    if (!sortState) {
      context.visibleActivableActions = list
    } else {
      // Collator FR Pour Le Tri Alpha
      const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true, ignorePunctuation: true })

      // Poids Pour Temps (Ordre L < A < M < G), None En Dernier
      const TIME_WEIGHT = { l: 1, a: 2, m: 3, f: 4, none: 999 }

      // Ordre “Métier” Pour Les Types (Ajuste Si Besoin)
      const TYPE_ORDER = ["spell", "magical", "melee", "ranged", "heal", "buff", "debuff", "consumable"]
      const TYPE_INDEX = new Map(TYPE_ORDER.map((t, i) => [t, i]))

      // Métadonnées Sans Muter Les Instances (Tri Stable)
      const meta = new WeakMap()
      list.forEach((a, i) => {
        // Temps: Même Priorité Que Le Template → D’abord action, sinon parent, puis fallback sur lettre courte
        let timeKey = ""
        if (a.hasActionType) {
          const ownCode = a.actionType ?? ""
          timeKey = String(ownCode).trim().toLowerCase()
        } else if (a.parent?.hasActionType) {
          const parentCode = a.parent.actionType ?? ""
          timeKey = String(parentCode).trim().toLowerCase()
        }
        if (!timeKey) {
          const shortRaw = a.hasActionType ? a.actionTypeShort : a.parent?.actionTypeShort
          const m = String(shortRaw ?? "").match(/[lamg]/i)
          if (m) {
            const letter = m[0].toLowerCase()
            timeKey = letter === "g" ? "f" : letter // G affiché ↦ code interne f (gratuite)
          } else {
            timeKey = "none"
          }
        }
        const timeWeight = TIME_WEIGHT[timeKey] ?? 998

        // Type
        const typeRaw = a.type ?? ""
        const typeKey = String(typeRaw).toLowerCase()
        const typeIdx = TYPE_INDEX.has(typeKey) ? TYPE_INDEX.get(typeKey) : 999

        // Nom
        const nameRaw = a.itemName ?? a.name ?? ""
        const nameKey = String(nameRaw)

        meta.set(a, { index: i, timeWeight, typeIdx, nameKey })
      })

      // Comparateurs
      const cmp = {
        time: (a, b) => {
          const A = meta.get(a)
          const B = meta.get(b)
          return A.timeWeight - B.timeWeight || collator.compare(A.nameKey, B.nameKey) || A.index - B.index
        },
        type: (a, b) => {
          const A = meta.get(a)
          const B = meta.get(b)
          return A.typeIdx - B.typeIdx || collator.compare(A.nameKey, B.nameKey) || A.index - B.index
        },
        name: (a, b) => {
          const A = meta.get(a)
          const B = meta.get(b)
          return collator.compare(A.nameKey, B.nameKey) || A.index - B.index
        },
      }

      const sortKey = sortState.key
      const sortDir = sortState.dir === "desc" ? -1 : 1

      // Tri Sans Perdre Les Instances
      const sorted = list.slice().sort((a, b) => {
        const fn = cmp[sortKey] || cmp.name
        return sortDir * fn(a, b)
      })

      context.visibleActivableActions = sorted
    }

    return context
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options)
    // Additional character-specific render logic can go here
  }

  /**
   * Action d'utiliser : active ou désactive une action
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onUseAction(event, target) {
    event.preventDefault()
    const shiftKey = !!event.shiftKey
    const dataset = target.dataset
    const action = dataset.actionType
    const type = dataset.type
    const source = dataset.source
    const indice = dataset.indice
    let activation
    if (action === "activate") {
      activation = await this.document.activateAction({ state: true, source, indice, type, shiftKey })
    } else if (action === "unactivate") {
      activation = await this.document.activateAction({ state: false, source, indice, type })
    }
  }

  /**
   * Ouvrir la mini-feuille (header + main/actions) dans une nouvelle fenêtre
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onOpenMiniSheet(event, target) {
    event.preventDefault()
    const win = new COMiniCharacterSheet({ document: this.document })
    return win.render(true)
  }

  /**
   * Trier Les Actions Ou Réinitialiser
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onSortActions(event, target) {
    event?.preventDefault?.()

    const key = target?.dataset?.sortKey || "name"

    // Reset → efface l’état et rerender sans tri
    if (key === "none") {
      delete this._sortState
      this.render()
      return
    }

    // Toggle Asc/Desc
    const prev = this._sortState || { key: "name", dir: "asc" }
    const dir = prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc"
    this._sortState = { key, dir }
    this.render()
  }

  /**
   * Ouvrir La Fenêtre De Passage De Niveau
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onOpenLevelUp(event, target) {
    event.preventDefault()
    return COLevelUpDialog.show(this.document)
  }

  /**
   * Handles the use effect event.
   *
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>} A promise that resolves when the effect activation is complete.
   */
  static async #onUseEffect(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const effectid = dataset.effect
    const action = dataset.actionType
    let activation
    if (action === "activate") {
      activation = await this.document.activateCOStatusEffect({ state: true, effectid })
    } else if (action === "unactivate") {
      activation = await this.document.activateCOStatusEffect({ state: false, effectid })
    }
  }

  /**
   * Gère l'utilisation des points de récupération ou du repos complet pour l'acteur.
   *
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static #onUseRecovery(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    let isFullRest = false
    if (dataset.option && dataset.option === "fullRest") isFullRest = true
    return this.document.system.useRecovery(isFullRest)
  }

  /**
   * Equip or unequip the equipment
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onEquippedToggle(event, target) {
    event.preventDefault()
    const itemId = $(target).parents(".item").data("itemId")
    const bypassChecks = event.shiftKey
    await this.document.toggleEquipmentEquipped(itemId, bypassChecks)
  }

  /**
   * Delete the selected item
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onDeleteItem(event, target) {
    event.preventDefault()
    const li = target.closest(".item")
    const id = li.dataset.itemId
    const uuid = li.dataset.itemUuid
    const type = li.dataset.itemType
    if (!uuid) return
    switch (type) {
      case "path":
        await this.document.deletePath(uuid)
        break
      case "capacity":
        await this.document.deleteCapacity(uuid)
        break
      case "feature":
        await this.document.deleteFeature(uuid)
        break
      case "profile":
        await this.document.deleteProfile(uuid)
        break
      default:
        await this.document.deleteEmbeddedDocuments("Item", [id])
    }
  }

  /**
   * Deletes a feature from the actor.
   *
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @param {string} itemUuid The UUID of the item to be deleted.
   * @returns {Promise<void>} A promise that resolves when the feature is deleted.
   */
  static async #onDeleteFeature(event, target, itemUuid) {
    event.preventDefault()
    await this.document.deleteFeature(itemUuid)
  }

  /**
   * Edit Abilities event handler
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onEditAbilities(event, target) {
    event.preventDefault()
    return new CoEditAbilitiesDialog({ actor: this.document }).render(true)
  }

  /**
   * Handle roll events
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static #onRoll(event, target) {
    const dataset = target.dataset
    const type = dataset.rollType
    const rollTarget = dataset.rollTarget

    switch (type) {
      case "skillcheck":
        this.document.rollSkill(rollTarget)
        break
      case "combatcheck":
        // Handle combat check
        break
      default:
        // Handle other roll types
        break
    }
  }

  /** @override */
  _onDragStart(event) {
    const target = event.currentTarget
    let dragData

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
    }
    // Sinon dataset contient itemUuid, itemId, itemType
    else super._onDragStart(event)
  }

  /** @override */
  async _onDrop(event) {
    // On récupère le type et l'uuid de l'item
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (foundry.utils.isEmpty(data)) return false // Si pas de données, on ne fait rien
    if (foundry.utils.hasProperty(data, "source")) return false
    const actor = this.document

    /**
     * A hook event that fires when some useful data is dropped onto a CharacterSheet.
     * @function dropCharacterSheetData
     * @memberof hookEvents
     * @param {Actor} actor      The Actor
     * @param {ActorSheet} sheet The ActorSheet application
     * @param {object} data      The data that has been dropped onto the sheet
     */
    if (Hooks.call("co.dropCharacterSheetData", actor, this, data) === false) return

    // Drop d'éléments de richesse
    if (data.type === "wealth" && data?.sourceTransfer === "encounter") {
      const encounter = game.actors.get(data.encounterId)
      // Si on ne trouve pas la rencontre, on ne fait rien
      if (!encounter) return false
      // Ajouter l'argent au personnage
      const wealthType = data.wealthType
      const value = data.value
      const currentWealth = Number(this.document.system.wealth[wealthType]?.value) || 0
      const newWealth = currentWealth + value
      await this.document.update({
        [`system.wealth.${wealthType}.value`]: newWealth,
      })
      // Supprimer l'argent de la rencontre
      await encounter.update({ [`system.wealth.${wealthType}.value`]: 0 })
      return true
    }

    // A partir de l'uuid, extraction de primaryId qui est l'id de l'acteur
    let { primaryId } = foundry.utils.parseUuid(data.uuid)
    // Pas de drop d'objet sur soi même
    if (primaryId === actor.id) return

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
    if (!this.document.isOwner) return false
    // On récupère l'item de type COItem
    const item = await Item.implementation.fromDropData(data)

    switch (item.type) {
      case SYSTEM.ITEM_TYPE.equipment.id:
        await this.document.addEquipment(item)
        // L'item vient d'une rencontre, on le supprime de l'inventaire de la rencontre
        if (data?.sourceTransfer === "encounter") {
          const { id, primaryId } = foundry.utils.parseUuid(data.uuid)
          if (id && primaryId) {
            const encounter = game.actors.get(primaryId)
            if (encounter) {
              await encounter.deleteEmbeddedDocuments("Item", [id])
            }
          }
        }
        return true
      case SYSTEM.ITEM_TYPE.feature.id:
        return await this.document.addFeature(item)
      case SYSTEM.ITEM_TYPE.profile.id:
        return await this.document.addProfile(item)
      case SYSTEM.ITEM_TYPE.path.id:
        return await this.document.addPath(item)
      case SYSTEM.ITEM_TYPE.capacity.id:
        // Soit on dépose n'importe où sur la feuille, soit on dépose dans une zone prévue pour y ajouter des 'sous-capacités' (dropZone)
        const isDropZone = await this.isDropZone(event)
        // Zone pour une sous capacité
        if (isDropZone) {
          // C'est une sous capacité on cherche la capacité parente
          let parentItem = event.target.closest(".item-list")
          let parentItemUuid = parentItem.dataset.itemUuid
          return await this.document.addLinkedCapacity(item, parentItemUuid)
        } else {
          return await this.document.addCapacity(item, null)
        }
      default:
        return false
    }
  }

  /** Vérifie si une balise parent à une classe 'dropzone'
   * @param {event} event
   * @returns {bool} true si oui false si non
   */
  async isDropZone(event) {
    if (event.target.tagName === "DIV" && event.target.classList.contains("dropzone")) return true // Si la balise elle même est une dropzone
    let parent = event.target.parentElement

    // Remontez dans l'arborescence DOM pour trouver un parent <div> avec la classe "dropzone"
    while (parent) {
      if (parent.tagName === "DIV" && parent.classList.contains("dropzone")) {
        return true
      }
      parent = parent.parentElement
    }
    return false
  }
}

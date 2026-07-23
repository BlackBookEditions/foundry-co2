const { sheets, ux } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api
const { DragDrop } = foundry.applications.ux

import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../helpers/utils.mjs"
import slideToggle from "../../elements/slide-toggle.mjs"

export default class COBaseActorSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /**
   * Different sheet modes.
   * @enum {number}
   */
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["co", "actor"],
    position: {
      width: 800,
      height: 900,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true,
    },
    actions: {
      editImage: COBaseActorSheet.#onEditImage,
      activateDef: COBaseActorSheet.#onActivateDef,
      deactivateDef: COBaseActorSheet.#onDeactivateDef,
      useRest: COBaseActorSheet.#onUseRest,
      toggleSection: COBaseActorSheet.#onSectionToggle,
      sendToChat: COBaseActorSheet.#onSendToChat,
      createItem: COBaseActorSheet.#onCreateItem,
      editItem: COBaseActorSheet.#onEditItem,
      toggleContainer: COBaseActorSheet.#onContainerToggle,
      removeContent: COBaseActorSheet.#onRemoveContent,
      deleteContent: COBaseActorSheet.#onDeleteContent,
      learnCapacity: COBaseActorSheet.#onLearnCapacity,
      unlearnCapacity: COBaseActorSheet.#onUnlearnCapacity,
      deleteCustomEffect: COBaseActorSheet.#onDeleteCustomEffect,
      toggleAction: COBaseActorSheet._onUseAction,
      toggleEffect: COBaseActorSheet.#onUseEffect,
      toggleDarkVision: COBaseActorSheet.#onToggleDarkVision,
      sortActionsByDefault: COBaseActorSheet.#onSortActionsByDefault,
      sortActionsByName: COBaseActorSheet.#onSortActionsByName,
      sortActionsByRank: COBaseActorSheet.#onSortActionsByRank,
      sortActionsByType: COBaseActorSheet.#onSortActionsByType,
      sortActionsByActionType: COBaseActorSheet.#onSortActionsByActionType,
      shareImage: COBaseActorSheet.#onShareImage,
    },
  }

  /**
   * The current sheet mode.
   * @type {number}
   */
  _sheetMode = this.constructor.SHEET_MODES.PLAY

  // The selected sorting of actions : byName, byType, byActionType
  actionsSorting = "default"

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

    // Add onChange handler
    const selectSize = document.querySelector('select[data-action="sizeChange"]')
    if (selectSize) {
      selectSize.addEventListener("change", async (event) => {
        await this.constructor._onSizeChange.call(this, event, event.target)
      })
    }

    // Add right click handler to the image
    const img = this.element.querySelector(".resetImage")
    if (img) {
      img.addEventListener("contextmenu", async (event) => {
        event.preventDefault()
        await this.constructor._onResetImage.call(this, event, event.target)
      })
    }
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
    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.systemSource = this.document.system._source
    context.actor = this.document
    context.system = this.document.system
    context.source = this.document.toObject()
    context.darkVisionActivation = this.document.system.hasDarkVisionActivated
    context.darkVisionShow = this.document.system.hasDarkVisionModifier
    context.isCharacter = this.document.type === "character"

    context.unlocked = this.isEditMode
    context.locked = this.isPlayMode
    context.viewLimited = this.isVisible && !this.isObserver && !this.isEditable
    context.viewObserver = this.isObserver
    context.isGmDebugUnlock = game.user.isGM && debugMode && this.isEditMode
    context.isNotGmInDebugUnlock = !game.user.isGM || !debugMode || this.isPlayMode

    context.abilities = this.document.system.abilities
    context.combat = this.document.system.combat
    context.attributes = this.document.system.attributes
    context.resources = this.document.system.resources
    context.details = this.document.system.details
    context.paths = this.document.paths
    context.pathGroups = await this.document.getPathGroups()
    context.capacities = this.document.capacities
    context.learnedCapacities = this.document.learnedCapacities

    const capacitiesOffPaths = this.document.capacitiesOffPaths

    for (const capacity of capacitiesOffPaths) {
      if (capacity.system.allowLinkedCapacity) {
        if (capacity.system.linkedCapacity) {
          const linkedCapacity = await fromUuid(capacity.system.linkedCapacity)
          if (linkedCapacity) {
            capacity.linkedCapacityName = linkedCapacity.name
            capacity.linkedCapacityImg = linkedCapacity.img
            capacity.linkedCapacityItem = linkedCapacity
          }
        } else {
          capacity.linkedCapacityName = ""
          capacity.linkedCapacityImg = "systems/co2/ui/effects/question.webp"
          capacity.linkedCapacityItem = null
        }
      }
    }
    context.capacitiesOffPaths = capacitiesOffPaths

    // Enrichir les descriptions pour les tooltips (conversion @UUID → liens HTML)
    const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML
    for (const pg of context.pathGroups) {
      for (const capacity of pg.items) {
        capacity.enrichedTooltip = await enrichHTML(capacity.system.description ?? "")
        if (capacity.linkedCapacityItem) {
          capacity.enrichedLinkedTooltip = await enrichHTML(capacity.linkedCapacityItem.system.description ?? "")
        }
      }
    }
    for (const capacity of capacitiesOffPaths) {
      capacity.enrichedTooltip = await enrichHTML(capacity.system.description ?? "")
      if (capacity.linkedCapacityItem) {
        capacity.enrichedLinkedTooltip = await enrichHTML(capacity.linkedCapacityItem.system.description ?? "")
      }
    }

    context.capacitiesOffPathsExpanded = Utils.getExpandedState(`co-${this.document.id}-paths-capacitiesOffPaths`)
    context.features = this.document.features
    for (const feature of context.features) {
      feature.enrichedTooltip = await enrichHTML(feature.system.description ?? "")
    }
    context.actions = this.document.actions
    context.inventory = this.document.inventory
    for (const group of context.inventory) {
      for (const item of group.items) {
        item.enrichedTooltip = await enrichHTML(item.system.description ?? "")
      }
    }

    // Contenants : contenu résolu, tooltips enrichis et état déplié mémorisé
    context.containers = this.document.containers
    for (const container of context.containers) {
      container.enrichedTooltip = await enrichHTML(container.system.description ?? "")
      container.contents = await container.system.getContents()
      for (const content of container.contents) {
        content.enrichedTooltip = await enrichHTML(content.system.description ?? "")
      }
      container.expanded = Utils.getExpandedState(`co-${this.document.id}-container-${container.id}`, false)
    }
    context.containersExpanded = Utils.getExpandedState(`co-${this.document.id}-containers`)

    context.currenciesExpanded = Utils.getExpandedState(`co-${this.document.id}-currencies`)

    context.visibleActions = await this.document.getVisibleActions()

    // Actions activables affichées dans l'onglet Principal
    context.visibleActivableActions = await this.document.getVisibleActivableActions()
    for (const action of context.visibleActivableActions) {
      action.enrichedTooltip = await enrichHTML(action.parent?.description ?? "")
    }
    context.actionsSorting = this.actionsSorting
    context.isActionsSortedByDefault = this.actionsSorting === "default"
    context.isActionsSortedByRank = this.actionsSorting === "byRank"
    context.isActionsSortedByType = this.actionsSorting === "byType"
    context.isActionsSortedByActionType = this.actionsSorting === "byActionType"

    this.#applySorting(context.visibleActivableActions)

    context.visibleNonActivableActions = await this.document.getVisibleNonActivableActions()
    context.visibleActivableTemporaireActions = await this.document.getVisibleActivableTemporaireActions()
    context.visibleNonActivableNonTemporaireActions = await this.document.getVisibleNonActivableNonTemporaireActions()
    context.currentEffects = await this.document.customEffects

    context.stateModifiers = this.document.system.stateModifiers

    // Postures défensives : boutons de la barre d'outils, apportés par un module de contenu
    context.defenseStances = game.system.CONST.defenseStances.map((stance) => ({ ...stance, active: this.actor.hasEffect(stance.id) }))

    // Actions de repos : boutons de la barre d'outils, apportés par un module de contenu
    context.restActions = game.system.CONST.restActions

    // Règles propres à un univers, activées par un module de contenu
    context.rules = game.system.CONST.rules

    // Status Effects
    // Un acteur peut porter un statut qui n'est plus déclaré dans CONFIG.statusEffects, par exemple si le module qui l'ajoutait a été désactivé
    const statusEffects = this.actor.statuses.filter((effectid) => CONFIG.statusEffects.some((se) => se.id === effectid))
    context.statusEffects = statusEffects.map((effectid) => {
      const effectConfig = CONFIG.statusEffects.find((se) => se.id === effectid)
      return {
        id: effectConfig.id,
        name: effectConfig.name,
        img: effectConfig.img,
        hasDescription: effectConfig.description && effectConfig.description.length > 0,
        description: effectConfig.description,
      }
    })

    // Select options
    context.choiceMoveUnit = SYSTEM.MOVEMENT_UNIT

    if (CONFIG.debug.co2?.sheets) console.debug(Utils.log(`CoBaseActorSheet - context`), context)
    return context
  }

  /**
   * Applique le tri sélectionné sur les actions.
   * @param {Array} actions Tableau des actions à trier
   * @private
   */
  #applySorting(actions) {
    switch (this.actionsSorting) {
      case "byRank":
        actions.sort((a, b) => {
          const rankDiff = a.rank - b.rank
          if (rankDiff !== 0) return rankDiff
          const nameDiff = a.itemName.localeCompare(b.itemName)
          return nameDiff !== 0 ? nameDiff : a.label.localeCompare(b.label)
        })
        break

      case "byType":
        actions.sort((a, b) => {
          const typeDiff = a.type.localeCompare(b.type)
          return typeDiff !== 0 ? typeDiff : a.itemName.localeCompare(b.itemName)
        })
        break

      case "byActionType":
        // Ordre personnalisé : L, A, M, G, puis none (vide)
        const actionTypeOrder = ["l", "a", "m", "f", "none"]
        actions.sort((a, b) => {
          const indexA = actionTypeOrder.indexOf(a.actionTypeFinal)
          const indexB = actionTypeOrder.indexOf(b.actionTypeFinal)
          // Si les types sont différents, trier selon l'ordre défini
          if (indexA !== indexB) return indexA - indexB

          const nameDiff = a.itemName.localeCompare(b.itemName)
          return nameDiff !== 0 ? nameDiff : a.label.localeCompare(b.label)
        })
        break
    }
  }

  // #region Actions

  /**
   * Active desactive la vision dans le noir
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onToggleDarkVision(event, target) {
    event.preventDefault()
    await this.document.system.toggleDarkVision(target.checked)
    this.render()
  }

  /**
   * Action d'utiliser : active ou désactive une action
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async _onUseAction(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
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
   * Action d'utiliser un effet
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onUseEffect(event, target) {
    event.preventDefault()
    const dataset = target.dataset
    const effectid = dataset.effect
    const action = dataset.action
    let activation = false
    if (action === "activate") {
      activation = this.actor.activateCOStatusEffect({ state: true, effectid })
    } else if (action === "unactivate") {
      activation = this.actor.activateCOStatusEffect({ state: false, effectid })
    }
  }

  /**
   * Handles the toggle action for a section.
   * Prevents the default event action, finds the next foldable section,
   * and toggles its visibility with a sliding animation.
   *
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {boolean}
   */
  static #onSectionToggle(event, target) {
    event.preventDefault()
    const toggleType = target.dataset.toggleType
    const pathSlug = target.dataset.slug
    // Inventaire et voies
    let li = target.closest("li.items-container-header")
    let foldable
    if (li) foldable = li.nextElementSibling
    // Biographie
    else foldable = target.closest(".form-header").nextElementSibling
    while (foldable && !foldable.classList.contains("foldable")) {
      foldable = foldable.nextElementSibling
    }
    if (foldable) {
      const key = toggleType === "paths" ? `co-${this.document.id}-${toggleType}-${pathSlug}` : `co-${this.document.id}-${toggleType}`
      Utils.toggleExpandedState(key)
      slideToggle(foldable)
    }
    return true
  }

  /**
   * Send the item details to the chat
   * Chat Type are :
   * - item : to display the item and all its actions
   * - action : to display the item and the action
   * - loot : to only display informations on the item
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onSendToChat(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    // Dataset has tooltip, chatType and if it's an action there are also indice and source
    const dataset = target.dataset
    const chatType = dataset.chatType
    // SHIFT+clic = mode public (visible par tous)
    const isPublic = event.shiftKey

    let itemId
    let indice = null
    if (chatType === "item" || chatType === "loot") {
      itemId = target.closest(".item")?.dataset.itemId
    } else if (chatType === "action") {
      const { id } = foundry.utils.parseUuid(dataset.source)
      itemId = id
      indice = dataset.indice
    }

    if (!itemId) return

    await this.actor.sendItemToChat({ chatType, itemId, indice, isPublic })
  }

  /**
   * Create a new embedded item
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static #onCreateItem(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
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
          case "armor":
            subtype = SYSTEM.EQUIPMENT_SUBTYPES.armor.id
            break
          case "shield":
            subtype = SYSTEM.EQUIPMENT_SUBTYPES.shield.id
            break
          case "weapon":
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
      case SYSTEM.ITEM_TYPE.container.id:
        itemData.name = game.i18n.format("CO.ui.newItem", { item: game.i18n.localize("CO.itemTypes.container") })
        break
    }

    return this.actor.createEmbeddedDocuments("Item", [itemData])
  }

  /**
   * Déplie/replie le contenu d'un contenant affiché dans l'inventaire.
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {boolean}
   */
  static #onContainerToggle(event, target) {
    event.preventDefault()
    const li = target.closest(".container-item")
    if (!li) return false
    const containerUuid = li.dataset.containerUuid
    // La sous-liste du contenu est le frère suivant portant la classe container-contents
    let foldable = li.nextElementSibling
    while (foldable && !foldable.classList.contains("container-contents")) {
      foldable = foldable.nextElementSibling
    }
    if (foldable) {
      const { id } = foundry.utils.parseUuid(containerUuid)
      Utils.toggleExpandedState(`co-${this.document.id}-container-${id}`)
      slideToggle(foldable)
      // Bascule immédiate du chevron : vertical si déplié, horizontal si replié
      const icon = target.querySelector("i.fa-caret-down, i.fa-caret-right")
      if (icon) {
        icon.classList.toggle("fa-caret-down")
        icon.classList.toggle("fa-caret-right")
      }
    }
    return true
  }

  /**
   * Retire un objet d'un contenant (sans le supprimer de l'acteur), depuis la liste inline.
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onRemoveContent(event, target) {
    if (!this.isEditable) return
    event.preventDefault()
    const containerUuid = target.dataset.containerUuid
    const contentUuid = target.dataset.contentUuid
    const container = await fromUuid(containerUuid)
    if (container) return container.removeContent(contentUuid)
  }

  /**
   * Supprime définitivement un objet contenu : le retire du contenant puis le supprime de l'acteur.
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onDeleteContent(event, target) {
    if (!this.isEditable) return
    event.preventDefault()
    const containerUuid = target.dataset.containerUuid
    const contentUuid = target.dataset.contentUuid
    const container = await fromUuid(containerUuid)
    if (container) await container.removeContent(contentUuid)
    const { id } = foundry.utils.parseUuid(contentUuid)
    if (id) await this.actor.deleteEmbeddedDocuments("Item", [id])
  }

  /**
   * Si l'événement de drop cible la ligne (ou la sous-liste) d'un contenant, retourne son UUID.
   * @param {DragEvent} event
   * @returns {string|null}
   */
  _getContainerDropTarget(event) {
    const el = event.target?.closest?.("[data-container-uuid]")
    return el?.dataset.containerUuid ?? null
  }

  /**
   * Dépôt d'un équipement sur un contenant de l'acteur.
   * Objet externe (compendium/autre acteur) : ajouté au contenant (le SHIFT « 1 unité » est déjà
   * appliqué en amont dans `_onDrop`). Objet du même acteur : transfert (contenant/inventaire libre
   * → ce contenant) via `_transferItem`, avec la logique SHIFT.
   * @param {string} containerUuid L'UUID du contenant cible
   * @param {COItem} item L'équipement déposé
   * @param {boolean} [shiftKey=false] SHIFT enfoncé → transfert d'1 unité
   * @returns {Promise<boolean>}
   */
  async _dropItemInContainer(containerUuid, item, shiftKey = false) {
    const target = await fromUuid(containerUuid)
    if (!target) return false
    if (item.type !== SYSTEM.ITEM_TYPE.equipment.id) return false
    // Déjà dans la cible : réorganisation, rien à faire
    if (target.system.contents.includes(item.uuid)) return true

    // Objet externe : ajout tel quel (le clone d'1 unité pour le SHIFT est déjà fait dans _onDrop)
    if (item.parent?.uuid !== this.actor.uuid) {
      return await target.addOrIncrementContent(item)
    }

    const source = this.actor.containers.find((c) => c.uuid !== target.uuid && c.system.contents.includes(item.uuid)) ?? null
    await this._transferItem(item, source, target, shiftKey)
    return true
  }

  /**
   * Transfère un objet entre deux emplacements du même acteur (contenant ou inventaire libre).
   * Comportement calqué sur le transfert inter-acteurs : sans SHIFT l'objet complet est transféré,
   * avec SHIFT une seule unité (pour les empilables).
   * @param {COItem} item L'objet déplacé
   * @param {COItem|null} source Contenant d'origine (null = inventaire libre)
   * @param {COItem|null} target Contenant destination (null = inventaire libre)
   * @param {boolean} shiftKey SHIFT → transfert d'1 unité (empilables)
   * @returns {Promise<COItem|null>} L'objet à destination (pour un éventuel tri), ou null
   */
  async _transferItem(item, source, target, shiftKey) {
    const stackable = item.system.properties?.stackable
    const full = item.system.quantity.current
    const amount = shiftKey && stackable ? 1 : full

    // Exemplaire identique déjà présent à destination (même slug, empilable)
    const dest = await this._findStackDestination(item, target)

    // Transfert complet sans fusion : on déplace simplement l'objet (change d'appartenance)
    if (amount >= full && !dest) {
      if (source) await source.removeContent(item.uuid)
      if (target) await target.addContent(item.uuid)
      return item
    }

    // Ajout de `amount` unités à destination
    let destItem = dest
    if (dest) {
      let quantity = dest.system.quantity.current + amount
      if (dest.system.quantity.max) quantity = Math.min(quantity, dest.system.quantity.max)
      await dest.update({ "system.quantity.current": quantity })
    } else {
      const newUuid = await this.actor.addEquipment(item.clone({ "system.quantity.current": amount }), target?.uuid ?? null)
      if (target && newUuid) await target.addContent(newUuid)
      destItem = newUuid ? await fromUuid(newUuid) : null
    }

    // Réduction de la source (suppression si 0, sans tenir compte de destroyIfEmpty)
    const remaining = full - amount
    if (remaining <= 0) {
      if (source) await source.removeContent(item.uuid)
      await this.actor.deleteEmbeddedDocuments("Item", [item.id])
    } else {
      await item.update({ "system.quantity.current": remaining })
    }
    return destItem
  }

  /**
   * Cherche à destination un exemplaire empilable identique (même slug) pour y cumuler des unités.
   * @param {COItem} item
   * @param {COItem|null} target Contenant destination, ou null pour l'inventaire libre
   * @returns {Promise<COItem|null>}
   */
  async _findStackDestination(item, target) {
    if (!item.system.properties?.stackable) return null
    if (target) {
      const contents = await target.system.getContents()
      return contents.find((c) => c?.system.slug === item.system.slug && c.id !== item.id) ?? null
    }
    return (
      this.actor.items.find(
        (c) => c.type === SYSTEM.ITEM_TYPE.equipment.id && !c.system.container && c.system.properties?.stackable && c.system.slug === item.system.slug && c.id !== item.id,
      ) ?? null
    )
  }

  /**
   * Change la taille du prototypeToken en fonction du choix de la taille
   *
   * @param {PointerEvent} event The originating change event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>} A promise that resolves when the actor's size has been updated.
   */
  static async _onSizeChange(event, target) {
    await this.actor.updateSize(event.target.value)
  }

  /**
   * Resets the actor's image and the prototype token to the default icon based on actor type.
   *
   * @param {Event} event The event triggered by the user action.
   * @param {HTMLElement} target The target element of the event.
   * @returns {Promise<void>} Resolves when the actor's image has been updated.
   */
  static async _onResetImage(event, target) {
    event.preventDefault()
    if (SYSTEM.ACTOR_ICONS[this.actor.type]) {
      const imgPath = SYSTEM.ACTOR_ICONS[this.actor.type]
      if (imgPath) {
        await this.document.update({ img: imgPath, "prototypeToken.texture.src": imgPath })
      }
    }
  }

  /**
   * Open the embedded item sheet
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static #onEditItem(event, target) {
    event.preventDefault()
    const uuid = target.closest(".item").dataset.itemUuid
    if (uuid) {
      const { id } = foundry.utils.parseUuid(uuid)
      if (id) {
        const document = this.actor.items.get(id)
        if (document) return document.sheet.render(true)
      }
    }
  }

  /**
   * Handles the event when a capacity is learned.
   *
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>} A promise that resolves when the capacity has been marked as learned.
   */
  static async #onLearnCapacity(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const capacityId = target.closest(".item").dataset.itemId
    if (capacityId) await this.actor.toggleCapacityLearned(capacityId, true)
  }

  /**
   * Handles the event when a capacity is unlearned by the actor.
   *
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>} A promise that resolves when the capacity has been unlearned.
   */
  static async #onUnlearnCapacity(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    const capacityId = target.closest(".item").dataset.itemId
    if (capacityId) await this.actor.toggleCapacityLearned(capacityId, false)
  }

  /**
   * Permet la suppression d'un effet personnalisé à la main au cas où il ne se terminerait pas de lui-même
   * Ou pour simuler un arrêt précoce à cause d'un sort de soin par exemple
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async #onDeleteCustomEffect(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    event.preventDefault()
    let effectSlug = target.dataset.ceSlug

    const ce = this.actor.system.currentEffects.find((ce) => ce.slug === effectSlug)
    if (ce) {
      await this.actor.deleteCustomEffect(ce)
    }
  }

  /**
   * Handle changing a Document's image.
   *
   * @this COBaseActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @private
   */
  static async #onEditImage(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    const current = foundry.utils.getProperty(this.document, "img")
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {}
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ img: path, "prototypeToken.texture.src": path })
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return fp.browse()
  }

  static async #onActivateDef(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    const effect = target.dataset.effect
    this._handleDef(effect, true)
  }

  static async #onDeactivateDef(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    const effect = target.dataset.effect
    this._handleDef(effect, false)
  }

  /**
   * Déclenche une action de repos déclarée par un module de contenu (game.system.CONST.restActions).
   * Le système ne connaît pas les règles de récupération de chaque univers : il se contente d'exécuter
   * le handler porté par l'entrée du registre.
   */
  static async #onUseRest(event, target) {
    // Vérification du droit Owner
    if (!this.isEditable) return
    const rest = game.system.CONST.restActions.find((action) => action.id === target.dataset.rest)
    if (rest) return rest.handler(this.document)
  }

  async _handleDef(effect, state) {
    // On ne peut pas cumuler deux postures défensives
    if (state && !this.actor.canActivateDefenseStance(effect)) return

    const hasEffect = this.actor.statuses.has(effect)
    if (hasEffect && state === false) return await this.actor.toggleStatusEffect(effect, state)
    if (!hasEffect && state === true) return await this.actor.toggleStatusEffect(effect, state)
  }

  static #onSortActionsByDefault(event) {
    event.preventDefault()
    this.actionsSorting = "default"
    this.render()
  }

  static #onSortActionsByName(event) {
    event.preventDefault()
    this.actionsSorting = "byName"
    this.render()
  }

  static #onSortActionsByRank(event) {
    event.preventDefault()
    this.actionsSorting = "byRank"
    this.render()
  }

  static #onSortActionsByType(event) {
    event.preventDefault()
    this.actionsSorting = "byType"
    this.render()
  }

  static #onSortActionsByActionType(event) {
    event.preventDefault()
    this.actionsSorting = "byActionType"
    this.render()
  }

  /**
   * Affiche l'image de l'acteur dans un popout partagé.
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static #onShareImage(event, target) {
    event.preventDefault()
    game.socket.emit("shareImage", { image: this.actor.img, title: this.actor.name })
    ui.notifications.info("Image affichée à tous les joueurs")
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

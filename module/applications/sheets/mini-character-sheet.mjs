import COBaseActorSheet from "./base-actor-sheet.mjs"

export class COMiniCharacterSheet extends COBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["co", "actor", "character", "character-mini"],
    position: { width: 400, height: 700, left: 80 },
    window: {
      contentClasses: ["character-content", "character-mini"],
      resizable: true,
    },
    actions: {
      roll: COMiniCharacterSheet.#onRoll,
      useRecovery: COMiniCharacterSheet.#onUseRecovery,
    },
  }

  // PARTS réduits : header + main (main inclut déjà actions.hbs via "templates")
  static PARTS = {
    header: { template: "systems/co/templates/actors/character-header.hbs" },
    sidebar: { template: "systems/co/templates/actors/mini-character-sidebar.hbs" },
    main: {
      template: "systems/co/templates/actors/character-main.hbs",
      templates: ["systems/co/templates/actors/shared/actions.hbs"],
    },
  }

  // Onglet unique "main"
  static TABS = {
    primary: {
      tabs: [{ id: "main" }],
      initial: "main",
      labelPrefix: "CO.sheet.tabs.character",
    },
  }

  async _prepareContext() {
    const context = await super._prepareContext()
    // Utile si tu veux conditionner des blocs côté HBS/CSS
    context.isMinimised = true

    // Gestion des défenses
    context.partialDef = this.document.hasEffect("partialDef")
    context.fullDef = this.document.hasEffect("fullDef")

    return context
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

  /** Partie pour que la fenêtre s'ouvre en hauteur ajusté au contenu */
  /** Pas du tout nécessaire mais ça fonctionne */
  /**
   * @override
   * @param {any} context
   * @param {any} options
   */
  async _onRender(context, options) {
    await super._onRender(context, options)

    // Fit Uniquement Au Premier Rendu
    if (this._didAutoFit) return
    this._didAutoFit = true

    // Attendre 1 Frame Pour Avoir Un Layout Stable
    requestAnimationFrame(() => this._fitToContent())
  }

  _fitToContent() {
    const app = this.element
    if (!app) return

    const header = app.querySelector(".window-header")
    const content = app.querySelector(".window-content")
    if (!content) return

    const chrome = header?.offsetHeight ?? 0

    // Libérer Temporairement La Hauteur Pour Mesurer
    app.style.height = "auto"
    content.style.height = "auto"

    const desired = chrome + content.scrollHeight + 10
    const max = Math.max(240, window.innerHeight - 24)
    const finalH = Math.min(desired, max)

    // Appliquer La Hauteur À La Fenêtre
    if (typeof this.setPosition === "function") {
      const pos = foundry.utils.deepClone(this.position) ?? {}
      pos.height = finalH
      this.setPosition(pos)
    } else {
      app.style.height = `${finalH}px`
    }

    // Fixer La Hauteur Du Contenu Pour Le Scroll Interne
    const contentH = Math.max(0, finalH - chrome)
    content.style.height = `${contentH}px`

    // Remonter La Fenêtre Si Elle Dépasse L’Écran
    const rect = app.getBoundingClientRect()
    if (rect.bottom > window.innerHeight) {
      const overflow = rect.bottom - window.innerHeight
      const currentTop = parseInt(app.style.top || this.position?.top || 0)
      const newTop = Math.max(8, currentTop - overflow)
      if (typeof this.setPosition === "function") this.setPosition({ top: newTop })
      else app.style.top = `${newTop}px`
    }
  }
}

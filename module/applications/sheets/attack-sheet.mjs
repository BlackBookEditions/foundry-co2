import CoBaseItemSheet from "./base-item-sheet.mjs"

export default class CoAttackSheet extends CoBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["attack"],
    position: {
      width: 600,
      height: 600,
    },
  }

  static PARTS = {
    header: { template: "systems/co2/templates/items/shared/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    description: { template: "systems/co2/templates/items/shared/description.hbs" },
    details: { template: "systems/co2/templates/items/attack.hbs" },
    actions: {
      template: "systems/co2/templates/items/shared/actions.hbs",
      templates: [
        "systems/co2/templates/items/parts/conditions-part.hbs",
        "systems/co2/templates/items/parts/modifiers-part.hbs",
        "systems/co2/templates/items/parts/modifier.hbs",
        "systems/co2/templates/items/parts/resolvers-part.hbs",
        "systems/co2/templates/items/parts/resolver-part.hbs",
      ],
      scrollable: [".tab", ".action-body"],
    },
  }

  static TABS = {
    primary: {
      tabs: [{ id: "description" }, { id: "details" }, { id: "actions" }],
      initial: "description",
      labelPrefix: "CO.sheet.tabs.attack",
    },
  }

  #actionTabSelected = null

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.resolverSystemFields = this.document.system.schema.fields.actions.element.fields.resolvers.element.fields
    context.choiceAttackType = SYSTEM.ATTACK_TYPE
    return context
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options)
    switch (partId) {
      case "actions":
        context.subtabs = this._prepareActionsTabs()
        break
    }
    return context
  }

  _prepareActionsTabs() {
    if (!this.document.system.actions || this.document.system.actions.length === 0) return {}
    const tabs = {}
    for (const [actionId, action] of Object.entries(this.document.system.actions)) {
      if (!action) continue
      const tabId = `action-${actionId}`
      tabs[tabId] = {
        group: "actions",
        id: tabId,
        active: false,
        icon: "fa-solid fa-bolt",
        label: action.name || game.i18n.localize("CO.sheet.tabs.capacity.action"),
      }
    }
    if (this.#actionTabSelected && tabs[this.#actionTabSelected]) {
      tabs[this.#actionTabSelected].active = true
    } else {
      this.#actionTabSelected = "action-0"
      tabs[this.#actionTabSelected].active = true
    }

    return tabs
  }

  /** @inheritDoc */
  changeTab(tab, group, options) {
    super.changeTab(tab, group, options)
    if (group === "actions") {
      this.#onChangeActionTab(tab)
    }
  }

  /* Sauvegarde l'onglet d'action sélectionné */
  #onChangeActionTab(tab) {
    this.#actionTabSelected = tab
  }

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options)

    // Limité exactement (pas Observateur / Propriétaire)
    const isLimitedOnly = this.document.testUserPermission(game.user, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED, { exact: true })

    if (isLimitedOnly) {
      const filtered = {}
      if (parts.header) filtered.header = parts.header
      if (parts.sidebar) filtered.sidebar = parts.sidebar
      if (parts.description) filtered.description = parts.description
      return filtered
    }

    return parts
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options)

    const isLimitedOnly = this.document.testUserPermission(game.user, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED, { exact: true })

    if (isLimitedOnly) {
      delete options.tabs
    }
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options)

    const isLimitedOnly = this.document.testUserPermission(game.user, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED, { exact: true })
    if (!isLimitedOnly) return

    const descTab = this.element?.querySelector('.tab[data-tab="description"]')
    if (descTab) descTab.classList.add("active")

    const descPart = this.element?.querySelector('[data-application-part="description"]')
    if (descPart) descPart.style.removeProperty("display")
  }
}

import CoBaseItemSheet from "./base-item-sheet.mjs"

export default class CoPathSheet extends CoBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["path"],
    position: {
      width: 600,
      height: 500,
    },
  }

  static PARTS = {
    header: { template: "systems/co2/templates/items/shared/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    description: { template: "systems/co2/templates/items/shared/description.hbs" },
    details: { template: "systems/co2/templates/items/path.hbs" },
  }

  static TABS = {
    primary: {
      tabs: [{ id: "description" }, { id: "details" }],
      initial: "description",
      labelPrefix: "CO.sheet.tabs.path",
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.capacities = await this.item.system.getCapacities()

    // Select options
    context.choicePathSubtypes = SYSTEM.PATH_TYPES

    console.log(`CoPathSheet - context`, context)
    return context
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

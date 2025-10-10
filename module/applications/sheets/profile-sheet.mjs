import CoBaseItemSheet from "./base-item-sheet.mjs"

export default class CoProfileSheet extends CoBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["profile"],
    position: {
      width: 600,
      height: 720,
    },
  }

  static PARTS = {
    header: { template: "systems/co2/templates/items/shared/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    description: { template: "systems/co2/templates/items/shared/description.hbs" },
    details: { template: "systems/co2/templates/items/profile.hbs", scrollable: [""] },
  }

  static TABS = {
    primary: {
      tabs: [{ id: "description" }, { id: "details" }],
      initial: "description",
      labelPrefix: "CO.sheet.tabs.profile",
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.martialTrainingsWeaponsList = game.system.CONST.martialTrainingsWeapons
    context.martialTrainingsArmorsList = game.system.CONST.martialTrainingsArmors
    context.martialTrainingsShieldsList = game.system.CONST.martialTrainingsShields

    context.martialTrainingsWeapons = context.martialTrainingsWeaponsList.filter((i) => this.item.system.martialTrainingsWeapons[i.key] === true)
    context.martialTrainingsArmors = context.martialTrainingsArmorsList.filter((i) => this.item.system.martialTrainingsArmors[i.key] === true)
    context.martialTrainingsShields = context.martialTrainingsShieldsList.filter((i) => this.item.system.martialTrainingsShields[i.key] === true)

    let infosPaths = []
    for (const path of this.item.system.paths) {
      let item = await fromUuid(path)
      // Item could be null if the item has been deleted in the compendium
      if (item) {
        infosPaths.push(item.infos)
      }
    }
    context.paths = infosPaths

    // Select options
    context.choiceProfileFamily = Object.fromEntries(Object.entries(SYSTEM.FAMILIES).map(([key, value]) => [key, value.label]))

    console.log(`CoProfileSheet - context`, context)
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

import CoBaseItemSheet from "./base-item-sheet.mjs"

export default class CoCapacitySheet extends CoBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["capacity"],
    position: {
      width: 600,
      height: 600,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: "systems/co2/templates/items/shared/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    description: { template: "systems/co2/templates/items/shared/description.hbs" },
    details: { template: "systems/co2/templates/items/capacity.hbs" },
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

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "description" }, { id: "details" }, { id: "actions" }],
      initial: "description",
      labelPrefix: "CO.sheet.tabs.capacity",
    },
  }

  #actionTabSelected = null

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()
    // Permet de controler plus finement la checkbox en fonction du respects des règles de base du system
    context.cannotBeLearned = !this.canBeLearned(context)
    context.resolverSystemFields = this.document.system.schema.fields.actions.element.fields.resolvers.element.fields
    return context
  }

  /**
   * Verifie si la capacité peut être apprise afin de dégriser la checkbox si la capacité est lié à un acteur
   * @param context
   * @returns {boolean}
   */
  canBeLearned(context) {
    if (context.item.parent.type !== "character") return context.unlocked
    const path = this.actor.items.get(context.item.system.path.split(".")[3])
    return context.unlocked && (context?.item?.parent?.canLearnCapacity(context.item, path, false) ?? false)
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options)
    switch (partId) {
      case "description":
        context.enrichedInGame = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.inGame, { async: true })
        break
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
}

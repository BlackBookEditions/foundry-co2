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

  #actionTabSelected = null

  /** @override */
  static PARTS = {
    header: { template: "systems/co/templates/items/shared/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    description: { template: "systems/co/templates/items/shared/description.hbs" },
    details: { template: "systems/co/templates/items/capacity.hbs" },
    actions: {
      template: "systems/co/templates/items/shared/actions.hbs",
      templates: [
        "systems/co/templates/items/parts/conditions-part.hbs",
        "systems/co/templates/items/parts/modifiers-part.hbs",
        "systems/co/templates/items/parts/modifier.hbs",
        "systems/co/templates/items/parts/resolvers-part.hbs",
        "systems/co/templates/items/parts/resolver-part.hbs",
      ],
      scrollable: [".tab", ".action-body"],
    },
  }

  static originalActionLabel = null

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "description" }, { id: "details" }, { id: "actions" }],
      initial: "description",
      labelPrefix: "CO.sheet.tabs.capacity",
    },
  }

  async _prepareContext() {
    const context = await super._prepareContext()

    context.resolverSystemFields = this.document.system.schema.fields.actions.element.fields.resolvers.element.fields
    context.actionsCount = Array.isArray(this.item.system.actions) ? this.item.system.actions.length : 0

    const baseKey = "CO.sheet.tabs.capacity.actions"

    // Enregistrer la valeur originale une seule fois
    if (!this.constructor.originalActionLabel) {
      this.constructor.originalActionLabel = game.i18n.translations?.CO?.sheet?.tabs?.capacity?.actions ?? game.i18n.localize(baseKey)
    }

    const baseLabel = this.constructor.originalActionLabel
    const label = context.actionsCount > 0 ? `${baseLabel} (${context.actionsCount})` : baseLabel

    // Écrase proprement la traduction active à chaque affichage
    game.i18n.translations.CO ??= {}
    game.i18n.translations.CO.sheet ??= {}
    game.i18n.translations.CO.sheet.tabs ??= {}
    game.i18n.translations.CO.sheet.tabs.capacity ??= {}
    game.i18n.translations.CO.sheet.tabs.capacity.actions = label

    return context
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

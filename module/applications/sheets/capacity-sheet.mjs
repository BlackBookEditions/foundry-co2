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

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    this._filterInputDiceValue()
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()
    context.resolverSystemFields = this.document.system.schema.fields.actions.element.fields.resolvers.element.fields
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

  /**
   * Applies an input filter to remove unwanted patterns from user input.
   * Currently supports removing dice formula patterns (e.g., "2d6", "1D20") from input fields.
   *
   * @async
   * @param {Event} event The input event triggered by user interaction on the input field.
   * @param {HTMLInputElement} event.currentTarget The input element that triggered the event.
   * @param {HTMLInputElement} event.target Alternative reference to the input element.
   * @param {Object} event.currentTarget.dataset The dataset object containing filter configuration.
   * @param {string} event.currentTarget.dataset.filterType The type of filter to apply (e.g., "no-dice-formula").
   * @returns {Promise<void>}
   * @private
   */
  async _applyInputFilter(event) {
    // The existing filter (no filter apply on damage input but filterType exist (dice-formula)
    const FILTER_RULES = {
      "no-dice-formula": /([+-]?\s*\d*\s*[dD]\s*\d+\s*°?)/g,
    }
    const inputField = event.currentTarget || event.target
    const filterType = inputField.dataset.filterType
    const regex = FILTER_RULES[filterType] // Check if filter type exist in list

    if (regex) {
      let currentValue = inputField.value
      // Apply filter and remove value
      inputField.value = currentValue.replaceAll(regex, "")
    }
  }
}

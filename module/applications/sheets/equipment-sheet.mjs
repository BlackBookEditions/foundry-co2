import CoBaseItemSheet from "./base-item-sheet.mjs"

export default class CoEquipmentSheet extends CoBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["equipment"],
    position: {
      width: 600,
      height: 720,
    },
  }

  static originalActionLabel = null

  /** @override */
  static PARTS = {
    header: { template: "systems/co/templates/items/shared/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    description: { template: "systems/co/templates/items/shared/description.hbs" },
    details: { template: "systems/co/templates/items/equipment.hbs" },
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

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "description" }, { id: "details" }, { id: "actions" }],
      initial: "description",
      labelPrefix: "CO.sheet.tabs.equipment",
    },
  }

  #actionTabSelected = null

  async _prepareContext() {
    const context = await super._prepareContext()

    context.resolverSystemFields = this.document.system.schema.fields.actions.element.fields.resolvers.element.fields
    context.actionsCount = Array.isArray(this.item.system.actions) ? this.item.system.actions.length : 0

    const baseKey = "CO.sheet.tabs.equipment.actions"

    if (!this.constructor.originalActionLabel) {
      this.constructor.originalActionLabel = game.i18n.translations?.CO?.sheet?.tabs?.equipment?.actions ?? game.i18n.localize(baseKey)
    }

    const baseLabel = this.constructor.originalActionLabel
    const label = context.actionsCount > 0 ? `${baseLabel} (${context.actionsCount})` : baseLabel

    game.i18n.translations.CO ??= {}
    game.i18n.translations.CO.sheet ??= {}
    game.i18n.translations.CO.sheet.tabs ??= {}
    game.i18n.translations.CO.sheet.tabs.equipment ??= {}
    game.i18n.translations.CO.sheet.tabs.equipment.actions = label

    return context
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    await super._preparePartContext(partId, context, options)
    const doc = this.document
    switch (partId) {
      case "description":
        break

      case "details":
        // Select options
        // Transformation du tableau d'objets en objet
        context.martialTrainingsWeaponsList = game.system.CONST.martialTrainingsWeapons.reduce((acc, item) => {
          acc[item.key] = item.label
          return acc
        }, {})

        context.martialTrainingsArmorsList = game.system.CONST.martialTrainingsArmors.reduce((acc, item) => {
          acc[item.key] = item.label
          return acc
        }, {})

        context.martialTrainingsShieldsList = game.system.CONST.martialTrainingsShields.reduce((acc, item) => {
          acc[item.key] = item.label
          return acc
        }, {})

        // Select options
        context.choiceEquipmentSubTypes = SYSTEM.EQUIPMENT_SUBTYPES
        context.choiceEquipmentRarity = SYSTEM.EQUIPMENT_RARITY
        context.choiceDamageType = SYSTEM.EQUIPMENT_DAMAGETYPE

        context.isWeapon = doc.system.isWeapon
        context.isArmor = doc.system.isArmor
        context.isShield = doc.system.isShield
        context.isMisc = doc.system.isMisc
        context.isConsumable = doc.system.isConsumable
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

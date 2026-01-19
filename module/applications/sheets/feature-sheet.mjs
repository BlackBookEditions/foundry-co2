import CoBaseItemSheet from "./base-item-sheet.mjs"
import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../helpers/utils.mjs"

export default class CoFeatureSheet extends CoBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["feature"],
    position: {
      width: 600,
      height: 500,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: "systems/co2/templates/items/shared/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    description: { template: "systems/co2/templates/items/shared/description.hbs" },
    details: { template: "systems/co2/templates/items/feature.hbs" },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "description" }, { id: "details" }],
      initial: "description",
      labelPrefix: "CO.sheet.tabs.feature",
    },
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    this._filterInputDiceValue()
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    let infosCapacities = []
    for (const capacity of this.item.system.capacities) {
      let item = await fromUuid(capacity)
      // Item could be null if the item has been deleted in the compendium
      if (item) {
        infosCapacities.push(item.infos)
      }
    }
    context.capacities = infosCapacities

    let infosPaths = []
    for (const path of this.item.system.paths) {
      let item = await fromUuid(path)
      // Item is null if the item has been deleted in the compendium
      if (item) {
        infosPaths.push(item.infos)
      }
    }
    context.paths = infosPaths

    if (CONFIG.debug.co2?.sheets) console.debug(Utils.log(`CoFeatureSheet - context`), context)
    return context
  }

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    await super._preparePartContext(partId, context, options)
    switch (partId) {
      case "details":
        // Select options
        context.choiceFeatureSubtypes = SYSTEM.FEATURE_SUBTYPE
        context.choiceModifierSubtypes = SYSTEM.MODIFIERS.MODIFIERS_SUBTYPE
        context.choiceModifierAbilityTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "ability"))
        context.choiceModifierCombatTargets = Object.fromEntries(
          Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "combat" || value.subtype === "attack"),
        )
        context.choiceModifierAttributeTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "attribute"))
        context.choiceModifierResourceTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "resource"))
        context.choiceModifierSkillTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "ability"))
        context.choiceModifierStateTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "state"))
        context.choiceModifierBonusDiceTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "bonusDice"))
        context.choiceModifierMalusDiceTargets = Object.fromEntries(Object.entries(SYSTEM.MODIFIERS.MODIFIERS_TARGET).filter(([key, value]) => value.subtype === "malusDice"))
        context.choiceModifierApplies = SYSTEM.MODIFIERS.MODIFIERS_APPLY
        break
    }
    return context
  }
}

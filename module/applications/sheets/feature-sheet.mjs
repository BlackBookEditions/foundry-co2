import CoBaseItemSheet from "./base-item-sheet.mjs"
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
        context.choiceModifierTargets = SYSTEM.MODIFIERS.MODIFIERS_TARGET
        break
    }
    return context
  }
}

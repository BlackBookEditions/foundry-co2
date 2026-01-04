import CoBaseItemSheet from "./base-item-sheet.mjs"
import Utils from "../../helpers/utils.mjs"
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

    if (CONFIG.debug.co2?.sheets) console.debug(Utils.log(`CoPathSheet - context`), context)
    return context
  }
}

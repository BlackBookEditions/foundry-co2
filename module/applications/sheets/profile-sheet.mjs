import CoBaseItemSheet from "./base-item-sheet.mjs"
import Utils from "../../helpers/utils.mjs"

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

    if (CONFIG.debug.co2?.sheets) console.debug(Utils.log(`CoProfileSheet - context`), context)
    return context
  }
}

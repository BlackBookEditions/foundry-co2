import CoBaseItemSheet from "./base-item-sheet.mjs"
import { SYSTEM } from "../../config/system.mjs"
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

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    this._filterInputDiceValue()
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

    if (CONFIG.debug.co2?.sheets) console.debug(Utils.log(`CoProfileSheet - context`), context)
    return context
  }
}

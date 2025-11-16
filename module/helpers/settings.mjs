/**
 * Enregistre les paramètres du système
 */
export function registerSystemSettings() {
  /**
   * Mode DEBUG
   */
  game.settings.register("co2", "debugMode", {
    name: "CO.settings.debugMode.name",
    hint: "CO.settings.debugMode.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  })

  game.settings.register("co2", "usevarInit", {
    name: "CO.settings.varInit.name",
    hint: "CO.settings.varInit.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  })

  game.settings.register("co2", "displayDifficulty", {
    name: "CO.settings.displayDifficulty.name",
    hint: "CO.settings.displayDifficulty.hint",
    scope: "world",
    config: true,
    default: "none",
    type: String,
    choices: {
      none: "CO.settings.displayDifficulty.none",
      all: "CO.settings.displayDifficulty.all",
      gm: "CO.settings.displayDifficulty.gm",
    },
  })

  game.settings.register("co2", "useComboRolls", {
    name: "CO.settings.useComboRolls.name",
    hint: "CO.settings.useComboRolls.hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  })

  game.settings.register("co2", "displayChatDamageButtonsToAll", {
    name: "CO.settings.displayChatDamageButtonsToAll.name",
    hint: "CO.settings.displayChatDamageButtonsToAll.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  })

  game.settings.register("co2", "checkFreeHandsBeforeEquip", {
    name: "CO.settings.checkFreeHandsBeforeEquip.name",
    hint: "CO.settings.checkFreeHandsBeforeEquip.hint",
    scope: "world",
    config: true,
    default: "none",
    type: String,
    choices: {
      none: "CO.settings.checkFreeHandsBeforeEquip.none",
      all: "CO.settings.checkFreeHandsBeforeEquip.all",
      gm: "CO.settings.checkFreeHandsBeforeEquip.gm",
    },
  })

  /**
   * World key used for statistics
   */
  game.settings.register("co2", "worldKey", {
    name: "Unique world key",
    scope: "world",
    config: false,
    type: String,
    default: "",
  })
}

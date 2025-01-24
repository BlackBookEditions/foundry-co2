/**
 * Enregistre les paramètres du système
 */
export default function registerSystemSettings() {
  /**
   * Mode DEBUG
   */
  game.settings.register("co", "debugMode", {
    name: "CO.settings.debugMode.name",
    hint: "CO.settings.debugMode.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  })

  game.settings.register("co", "usevarInit", {
    name: "CO.settings.varInit.name",
    hint: "CO.settings.varInit.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  })

  game.settings.register("co", "displayDifficulty", {
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

  game.settings.register("co", "useComboRolls", {
    name: "CO.settings.useComboRolls.name",
    hint: "CO.settings.useComboRolls.hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  })

  game.settings.register("co", "displayChatDamageButtonsToAll", {
    name: "CO.settings.displayChatDamageButtonsToAll.name",
    hint: "CO.settings.displayChatDamageButtonsToAll.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  })

  game.settings.register("co", "checkFreeHandsBeforeEquip", {
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
}

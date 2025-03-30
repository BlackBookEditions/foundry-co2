// Configuration
import { SYSTEM } from "./module/config/system.mjs"
globalThis.SYSTEM = SYSTEM

// Import modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"

// Helpers
import preloadHandlebarsTemplates from "./module/templates.mjs"
import registerHandlebarsHelpers from "./module/helpers.mjs"
import registerSystemSettings from "./module/settings.mjs"
import registerHooks from "./module/hooks.mjs"
import Macros from "./module/macros.mjs"
import Utils from "./module/utils.mjs"
import { handleSocketEvent } from "./module/socket.mjs"

const DEVELOPMENT_MODE = true

Hooks.once("init", async function () {
  console.info(SYSTEM.ASCII)
  console.info(Utils.log("Initializing..."))

  globalThis.cof = game.system
  game.system.CONST = SYSTEM

  // Expose the system API
  game.system.api = {
    applications,
    models,
    documents,
    macros: Macros,
  }

  // Actor
  CONFIG.Actor.documentClass = documents.COActor

  CONFIG.Actor.dataModels = {
    character: models.CharacterData,
    encounter: models.EncounterData,
  }

  Actors.unregisterSheet("core", ActorSheet)
  Actors.registerSheet(SYSTEM.ID, applications.CharacterSheet, { types: ["character"], makeDefault: true, label: "CO.sheet.character" })
  Actors.registerSheet(SYSTEM.ID, applications.EncounterSheet, { types: ["encounter"], makeDefault: true, label: "CO.sheet.encounter" })

  // Item
  CONFIG.Item.documentClass = documents.COItem

  CONFIG.Item.dataModels = {
    capacity: models.CapacityData,
    equipment: models.EquipmentData,
    feature: models.FeatureData,
    profile: models.ProfileData,
    path: models.PathData,
    attack: models.AttackData,
  }

  Items.unregisterSheet("core", ItemSheet)
  Items.registerSheet(SYSTEM.ID, applications.AttackSheet, { types: ["attack"], makeDefault: true, label: "CO.sheet.attack" })
  Items.registerSheet(SYSTEM.ID, applications.CapacitySheet, { types: ["capacity"], makeDefault: true, label: "CO.sheet.capacity" })
  Items.registerSheet(SYSTEM.ID, applications.EquipmentSheet, { types: ["equipment"], makeDefault: true, label: "CO.sheet.equipment" })
  Items.registerSheet(SYSTEM.ID, applications.FeatureSheet, { types: ["feature"], makeDefault: true, label: "CO.sheet.feature" })
  Items.registerSheet(SYSTEM.ID, applications.PathSheet, { types: ["path"], makeDefault: true, label: "CO.sheet.path" })
  Items.registerSheet(SYSTEM.ID, applications.ProfileSheet, { types: ["profile"], makeDefault: true, label: "CO.sheet.profile" })

  // Chat
  CONFIG.ChatMessage.documentClass = documents.COChatMessage

  CONFIG.ChatMessage.dataModels = {
    base: models.BaseMessageData,
    action: models.ActionMessageData,
    item: models.ItemMessageData,
    skill: models.SkillMessageData,
  }

  // Status Effects
  CONFIG.statusEffects = SYSTEM.STATUS_EFFECT

  // Dice system configuration
  CONFIG.Dice.rolls.push(documents.CORoll, documents.COSkillRoll, documents.COAttackRoll)

  // Activate socket handler
  game.socket.on(`system.${SYSTEM.ID}`, handleSocketEvent)

  // Preload Handlebars Templates
  preloadHandlebarsTemplates()

  // Register Handlebars helpers
  registerHandlebarsHelpers()

  // Register System Settings
  registerSystemSettings()

  // Register hooks
  registerHooks()

  // Load Martial Training
  if (!game.system.CONST.martialTrainingsWeapons) {
    game.system.CONST.martialTrainingsWeapons = []
  }
  if (!game.system.CONST.martialTrainingsArmors) {
    game.system.CONST.martialTrainingsArmors = []
  }
  if (!game.system.CONST.martialTrainingsShields) {
    game.system.CONST.martialTrainingsShields = []
  }

  // Combat tracker
  if (game.settings.get("co", "usevarInit")) {
    CONFIG.Combat.initiative = {
      formula: "1d6x + @combat.init.value",
      decimals: 0,
    }
  } else {
    CONFIG.Combat.initiative = {
      formula: "@combat.init.value",
      decimals: 0,
    }
  }
  CONFIG.Combat.documentClass = models.CombatCO
  // Un round dure 6s
  CONFIG.time.roundTime = 6
  console.info(Utils.log("Initialized"))
})

/* -------------------------------------------- */
/*  Localization                                */
/* -------------------------------------------- */

Hooks.once("i18nInit", function () {
  // Traduction du tableau des conditions
  const customeffects = CONFIG.statusEffects.map((element) => {
    return {
      ...element,
      name: game.i18n.localize(element.name),
      description: game.i18n.localize(element.description),
    }
  })

  customeffects.sort((a, b) => a.name.localeCompare(b.name))
  CONFIG.statusEffects = customeffects
})

Hooks.once("ready", async function () {
  if (DEVELOPMENT_MODE) {
    game.settings.set("co", "debugMode", true)
  }

  if (!CONFIG.debug.co) {
    if (DEVELOPMENT_MODE) {
      CONFIG.debug.co = {
        hooks: true,
        resolvers: true,
        rolls: true,
        sheets: true,
        actions: true,
      }
    } else
      CONFIG.debug.co = {
        hooks: false,
        resolvers: false,
        rolls: false,
        sheets: false,
        actions: false,
      }
  }
  console.info(Utils.log(game.i18n.localize("CO.notif.ready")))
})

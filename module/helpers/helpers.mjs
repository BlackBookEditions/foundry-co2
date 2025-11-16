import { SYSTEM } from "../config/system.mjs"
/**
 * Register Handlebars helpers
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("add", function (a, b) {
    return parseInt(a) + parseInt(b)
  })
  Handlebars.registerHelper("isPathprestigious", function (value) {
    return value === SYSTEM.PATH_TYPES.prestige.id
  })
  Handlebars.registerHelper("isPathProfile", function (value) {
    return value === SYSTEM.PATH_TYPES.profile.id
  })
  Handlebars.registerHelper("isset", function (value) {
    return value !== undefined
  })
  Handlebars.registerHelper("isNotNull", function (value) {
    return value !== null
  })
  Handlebars.registerHelper("isNull", function (value) {
    return value === null
  })
  Handlebars.registerHelper("sum", function (arr, init) {
    return arr.reduce((previousValue, currentValue) => previousValue + currentValue, init)
  })
  Handlebars.registerHelper("getKeyFromMartialTraining", function (training) {
    return training.key
  })
  Handlebars.registerHelper("getValueFromMartialTraining", function (training) {
    return training.label
  })
  Handlebars.registerHelper("getMartialTrainingLabel", function (training) {
    return game.i18n.localize(training.label)
  })
  Handlebars.registerHelper("buildItemTemplatePath", function (root, itemType) {
    return `${root}${itemType}-partial.hbs`
  })
  Handlebars.registerHelper("isActionable", function (itemType) {
    const actionableItemTypes = ["capacity", "equipment", "attack"]
    return actionableItemTypes.includes(itemType)
  })
  Handlebars.registerHelper("isNegativeOrNull", function (value) {
    return value >= 0
  })
  Handlebars.registerHelper("isEnabled", function (configKey) {
    const value = game.settings.get("co2", configKey)
    if (value === false || value === "none") return false
    return true
  })
  Handlebars.registerHelper("isTrainedWithWeapon", function (actor, itemId) {
    if (actor.isTrainedWithWeapon(itemId)) return '<i class="fa-solid fa-circle-check" data-tooltip="Maitrise" data-tooltip-direction="UP"></i>'
    return '<i class="fa-regular fa-circle-xmark" data-tooltip="Pas de maitrise" data-tooltip-direction="UP"></i>'
  })
  Handlebars.registerHelper("isTrainedWithArmor", function (actor, itemId) {
    if (actor.isTrainedWithArmor(itemId)) return '<i class="fa-solid fa-circle-check" data-tooltip="Maitrise" data-tooltip-direction="UP"></i>'
    return '<i class="fa-regular fa-circle-xmark" data-tooltip="Pas de maitrise" data-tooltip-direction="UP"></i>'
  })
  Handlebars.registerHelper("isTrainedWithShield", function (actor, itemId) {
    if (actor.isTrainedWithShield(itemId)) return '<i class="fa-solid fa-circle-check" data-tooltip="Maitrise" data-tooltip-direction="UP"></i>'
    return '<i class="fa-regular fa-circle-xmark" data-tooltip="Pas de maitrise" data-tooltip-direction="UP"></i>'
  })
  Handlebars.registerHelper("manaCostFromArmor", function (capacity, actor) {
    return capacity.system.getManaCostFromArmor(actor)
  })

  Handlebars.registerHelper("isActionSubtabActive", function (subtabs, tabId) {
    const id = `action-${tabId}`
    if (!subtabs || !subtabs[id]) return false
    return subtabs[id] && subtabs[id].active
  })
}

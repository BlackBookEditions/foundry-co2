import { SYSTEM } from "../config/system.mjs"
import Macros from "./macros.mjs"

/**
 * Register custom TextEditor enrichers for inline roll buttons.
 * Syntax: @Test[car:ability|diff:difficulty|comp:skills|suc:text|ech:text|sucdm:formula|echdm:formula|sucstatut:status|echstatut:status|options:opt1,opt2]
 * Examples:
 *   "@Test[car:for|diff:10]"
 *   "@Test[car:agi|diff:15|comp:acrobaties]"
 *   "@Test[car:con|diff:10|suc:perd 4 PV|ech:perd 6 PV, étourdi 1 round]"
 *   "@Test[car:con|diff:12|echstatut:stunned,prone]"
 *   "@Test[car:sag|diff:15|options:secret]"
 * Registers a global click handler for enriched links to trigger skill rolls.
 */
export function setupTextEnrichers() {
  CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.concat([
    {
      pattern: /@Test\[([^\]]+)\]/gi,
      enricher: async (match) => {
        const content = match[1]
        const parts = content.split("|")

        // Parse all parameters
        let ability
        let difficulty
        let skills
        let onSuccess
        let onFailure
        let successDamage
        let failureDamage
        let successStatuses
        let failureStatuses
        let rollOptions
        for (const part of parts) {
          const trimmedPart = part.trim()
          if (trimmedPart.startsWith("car:")) {
            ability = trimmedPart.substring(4).toLowerCase().trim()
          } else if (trimmedPart.startsWith("diff:")) {
            const parsed = parseInt(trimmedPart.substring(5))
            if (!isNaN(parsed)) difficulty = parsed
          } else if (trimmedPart.startsWith("comp:")) {
            skills = trimmedPart.substring(5).trim()
          } else if (trimmedPart.startsWith("suc:")) {
            onSuccess = trimmedPart.substring(4).trim()
          } else if (trimmedPart.startsWith("ech:")) {
            onFailure = trimmedPart.substring(4).trim()
          } else if (trimmedPart.startsWith("sucdm:")) {
            successDamage = trimmedPart.substring(6).trim()
          } else if (trimmedPart.startsWith("echdm:")) {
            failureDamage = trimmedPart.substring(6).trim()
          } else if (trimmedPart.startsWith("sucstatut:")) {
            successStatuses = trimmedPart.substring(10).trim()
          } else if (trimmedPart.startsWith("echstatut:")) {
            failureStatuses = trimmedPart.substring(10).trim()
          } else if (trimmedPart.startsWith("options:")) {
            rollOptions = trimmedPart.substring(8).trim()
          }
        }

        // Ability is required
        if (!ability || !SYSTEM.ABILITIES[ability]) return null

        const label = game.i18n.localize(`CO.abilities.short.${ability}`)

        const a = document.createElement("a")
        a.classList.add("roll-check-enricher")
        a.dataset.ability = ability
        if (difficulty !== undefined) a.dataset.difficulty = difficulty
        if (skills) a.dataset.skills = skills
        if (onSuccess) a.dataset.onSuccess = onSuccess
        if (onFailure) a.dataset.onFailure = onFailure
        if (successDamage) a.dataset.successDamage = successDamage
        if (failureDamage) a.dataset.failureDamage = failureDamage
        if (successStatuses) a.dataset.successStatuses = successStatuses
        if (failureStatuses) a.dataset.failureStatuses = failureStatuses
        if (rollOptions) a.dataset.rollOptions = rollOptions

        const icon = document.createElement("i")
        icon.className = "fa-solid fa-dice-d20"
        a.appendChild(icon)

        a.appendChild(document.createTextNode(` ${label}`))
        if (skills) {
          a.appendChild(document.createTextNode(` (${skills})`))
        }
        if (difficulty !== undefined) {
          a.appendChild(document.createTextNode(` difficulté ${difficulty}`))
        }

        // Build tooltip with GM-only information
        if (game.user.isGM) {
          const tooltipParts = []
          if (onSuccess) tooltipParts.push(`Succès : ${onSuccess}`)
          if (successDamage) tooltipParts.push(`DM si succès : ${successDamage}`)
          if (successStatuses) tooltipParts.push(`Statuts si succès : ${successStatuses}`)
          if (onFailure) tooltipParts.push(`Échec : ${onFailure}`)
          if (failureDamage) tooltipParts.push(`DM si échec : ${failureDamage}`)
          if (failureStatuses) tooltipParts.push(`Statuts si échec : ${failureStatuses}`)
          if (rollOptions) tooltipParts.push(`Options : ${rollOptions}`)

          if (tooltipParts.length > 0) {
            a.dataset.tooltip = tooltipParts.join("<br>")
            a.dataset.tooltipDirection = "UP"
          }
        }

        return a
      },
    },
  ])

  // Click on enriched link in journal/description → send a chat message
  document.addEventListener("click", async (event) => {
    const anchor = event.target.closest(".roll-check-enricher")
    if (!anchor) return
    event.preventDefault()

    const ability = anchor.dataset.ability
    const difficulty = anchor.dataset.difficulty ? parseInt(anchor.dataset.difficulty) : undefined
    const skills = anchor.dataset.skills || undefined
    const onSuccess = anchor.dataset.onSuccess || undefined
    const onFailure = anchor.dataset.onFailure || undefined
    const label = game.i18n.localize(`CO.abilities.short.${ability}`)

    // French contraction: "de" → "d'" before vowels
    const vowels = "aeiouyàâéèêëïîôùûüAEIOUYÀÂÉÈÊËÏÎÔÙÛÜ"
    const preposition = vowels.includes(label.charAt(0)) ? "d'" : "de "
    const title = `Test ${preposition}${label}`

    const successDamage = anchor.dataset.successDamage || undefined
    const failureDamage = anchor.dataset.failureDamage || undefined
    const successStatuses = anchor.dataset.successStatuses || undefined
    const failureStatuses = anchor.dataset.failureStatuses || undefined
    const rollOptions = anchor.dataset.rollOptions || undefined

    const templateData = {
      title,
      ability,
      difficulty,
      skills,
      onSuccess,
      onFailure,
      successDamage,
      failureDamage,
      successStatuses,
      failureStatuses,
      rollOptions,
    }

    const content = await foundry.applications.handlebars.renderTemplate("systems/co2/templates/chat/check-card.hbs", templateData)

    await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker(),
      type: "check",
    })
  })
}

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
  Handlebars.registerHelper("isNotNull", function (value) {
    return value !== null
  })
  Handlebars.registerHelper("isNull", function (value) {
    return value === null
  })
  Handlebars.registerHelper("getKeyFromMartialTraining", function (training) {
    return training.key
  })
  Handlebars.registerHelper("getMartialTrainingLabel", function (training) {
    return game.i18n.localize(training.label)
  })
  Handlebars.registerHelper("isTrainedWithWeapon", function (actor, itemId) {
    return actor.isTrainedWithWeapon(itemId)
  })
  Handlebars.registerHelper("isTrainedWithArmor", function (actor, itemId) {
    return actor.isTrainedWithArmor(itemId)
  })
  Handlebars.registerHelper("isTrainedWithShield", function (actor, itemId) {
    return actor.isTrainedWithShield(itemId)
  })
  Handlebars.registerHelper("manaCostFromArmor", function (capacity, actor) {
    return capacity.system.getManaCostFromArmor(actor)
  })
  Handlebars.registerHelper("isActionSubtabActive", function (subtabs, tabId) {
    const id = `action-${tabId}`
    if (!subtabs || !subtabs[id]) return false
    return subtabs[id] && subtabs[id].active
  })
  Handlebars.registerHelper("getAbilityLabel", function (ability) {
    return game.i18n.localize(`CO.abilities.long.${ability}`)
  })
}

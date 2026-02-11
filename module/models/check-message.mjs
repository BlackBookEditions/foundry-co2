import BaseMessageData from "./base-message.mjs"
import Macros from "../helpers/macros.mjs"

/**
 * Data model for check messages created by the @Test enricher.
 * @extends BaseMessageData
 */
export default class CheckMessageData extends BaseMessageData {
  static defineSchema() {
    return super.defineSchema()
  }

  /**
   * Modifie le contenu HTML d'un message
   * @async
   * @param {COChatMessage} message Le document ChatMessage en cours de rendu.
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   * @returns {Promise<void>} Résout lorsque le HTML a été mis à jour.
   */
  async alterMessageHTML(message, html) {
    // Masquer les sections GM-only pour les non-MJ
    const gmOnlySections = html.querySelectorAll(".gm-only")
    if (gmOnlySections.length > 0 && !game.user.isGM) {
      gmOnlySections.forEach((section) => section.remove())
    }
  }

  /**
   * Ajoute les listeners du message
   * @async
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   */
  async addListeners(html) {
    const checkButton = html.querySelector(".roll-check-chat")
    if (!checkButton) return

    checkButton.addEventListener("click", async (event) => {
      event.preventDefault()
      event.stopPropagation()

      const ability = checkButton.dataset.ability
      const difficulty = checkButton.dataset.difficulty ? parseInt(checkButton.dataset.difficulty) : undefined
      const skills = checkButton.dataset.skills || undefined
      const successDamage = checkButton.dataset.successDamage || undefined
      const failureDamage = checkButton.dataset.failureDamage || undefined
      const successStatuses = checkButton.dataset.successStatuses || undefined
      const failureStatuses = checkButton.dataset.failureStatuses || undefined
      const rollOptions = checkButton.dataset.rollOptions || undefined

      // Parse roll options
      const rollOptionsList = rollOptions ? rollOptions.split(",").map((o) => o.trim()) : []
      const isSecret = rollOptionsList.includes("secret")

      const options = {}
      if (difficulty !== undefined) {
        options.difficulty = difficulty
        options.useDifficulty = true
        options.showDifficulty = true
      }
      if (skills) {
        options.skills = skills
      }
      if (isSecret) {
        options.rollMode = "gmroll"
      }

      // If there are damage formulas or statuses, we need to get the roll result
      if (successDamage || failureDamage || successStatuses || failureStatuses) {
        // Get the actor
        let actor
        const speaker = ChatMessage.getSpeaker()
        if (speaker.token) actor = game.actors.tokens[speaker.token]
        actor ??= game.actors.get(speaker.actor)
        if (!actor) {
          ui.notifications.warn(game.i18n.localize("CO.macro.noActorSelected"))
          return
        }

        // Roll with showResult: false to get the result without creating a message
        const rollResult = await actor.rollSkill(ability, { ...options, showResult: false })
        if (!rollResult) return

        // Use the already-analyzed result from rollSkill
        const analysis = rollResult.result

        // Create the skill roll message manually
        await rollResult.roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor }),
        })

        // Determine which damage formula to use based on success/failure
        let damageFormula = null
        if (analysis.isSuccess && successDamage) {
          damageFormula = successDamage
        } else if (analysis.isFailure && failureDamage) {
          damageFormula = failureDamage
        }

        // Roll damage and create damage message with application buttons
        if (damageFormula) {
          const damageRoll = await new Roll(damageFormula).roll()
          const damageTotal = damageRoll.total
          const tooltip = await damageRoll.getTooltip()

          // Render the damage card template
          const label = game.i18n.localize(`CO.abilities.long.${ability}`)
          const flavor = `Test ${label}`

          const templateData = {
            formula: damageRoll.formula,
            flavor,
            tooltip,
            total: damageTotal,
            actorId: actor.id,
            tempDamage: false,
          }

          const content = await foundry.applications.handlebars.renderTemplate("systems/co2/templates/chat/damage-roll-card.hbs", templateData)

          // Create the damage chat message with proper type for ActionMessageData
          await ChatMessage.create({
            content,
            speaker: ChatMessage.getSpeaker({ actor }),
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
            type: "action",
            system: { subtype: "damage" },
            rolls: [damageRoll],
          })
        }

        // Apply statuses based on success/failure
        let statusesToApply = null
        if (analysis.isSuccess && successStatuses) {
          statusesToApply = successStatuses
        } else if (analysis.isFailure && failureStatuses) {
          statusesToApply = failureStatuses
        }

        if (statusesToApply) {
          const statusIds = statusesToApply.split(",").map((s) => s.trim())
          for (const statusId of statusIds) {
            if (statusId) {
              await actor.toggleStatusEffect(statusId, { active: true })
            }
          }
        }
      } else {
        // No damage formulas or statuses, just do the normal roll
        await Macros.rollSkill(ability, options)
      }
    })
  }
}

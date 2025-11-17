import { SYSTEM } from "../config/system.mjs"
import BaseMessageData from "./base-message.mjs"
import { CORoll } from "../documents/roll.mjs"

export default class SkillMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      result: new fields.ObjectField(),
    })
  }

  // Est-ce que l'actor du user courant est ciblé par le message
  get isActorTargeted() {
    // Si c'est un MJ, on considère que tous les acteurs sont ciblés
    if (game.user.isGM) return true
    const actor = game.user.character
    if (!actor) return false
    const { id } = foundry.utils.parseUuid(actor.uuid)
    // Extrare tous les ids des cibles
    const targets = this.targets.map((target) => {
      const { id } = foundry.utils.parseUuid(target)
      return id
    })
    return targets.includes(id)
  }

  /**
   * Ajoute les listeners du message
   * @async
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   */
  async addListeners(html) {
    const luckyButton = html.querySelector(".lp-button-skill")
    const displayButton = game.user.isGM || this.parent.isAuthor

    // Click sur le bouton de chance sur un skill
    if (luckyButton && displayButton) {
      luckyButton.addEventListener("click", async (event) => {
        event.preventDefault()
        event.stopPropagation()
        const messageId = event.currentTarget.closest(".message").dataset.messageId
        const message = game.messages.get(messageId)

        let rolls = message.rolls
        rolls[0].options.bonus = String(parseInt(rolls[0].options.bonus) + 10)
        rolls[0].options.hasLuckyPoints = false
        rolls[0]._total = parseInt(rolls[0].total) + 10

        let newResult = CORoll.analyseRollResult(rolls[0])
        // L'acteur consomme son point de chance
        const actorId = rolls[0].options.actorId
        const actor = game.actors.get(actorId)
        if (actor.system.resources.fortune.value > 0) {
          actor.system.resources.fortune.value -= 1
          await actor.update({ "system.resources.fortune.value": actor.system.resources.fortune.value })
        }

        // Mise à jour du message de chat
        // Le MJ peut mettre à jour le message de chat
        if (game.user.isGM) {
          await message.update({ rolls: rolls, "system.result": newResult })
        }
        // Sinon on émet un message pour mettre à jour le message de chat
        else {
          await game.users.activeGM.query("co2.updateMessageAfterLuck", { existingMessageId: message.id, rolls: rolls, result: newResult })
        }
      })
    }

    // Click sur le bouton de jet opposé
    const oppositeButton = html.querySelector(".opposite-roll")
    const displayOppositeButton = game.user.isGM || this.isActorTargeted

    if (oppositeButton && displayOppositeButton) {
      oppositeButton.addEventListener("click", async (event) => {
        event.preventDefault()
        event.stopPropagation()
        const messageId = event.currentTarget.closest(".message").dataset.messageId
        if (!messageId) return
        const message = game.messages.get(messageId)

        const dataset = event.currentTarget.dataset
        const oppositeValue = dataset.oppositeValue
        const oppositeTarget = dataset.oppositeTarget

        const targetActor = fromUuidSync(oppositeTarget)
        if (!targetActor) return
        const value = Utils.evaluateOppositeFormula(oppositeValue, targetActor)

        const formula = value ? `1d20 + ${value}` : `1d20`
        const roll = await new Roll(formula).roll()
        const difficulty = roll.total

        let rolls = message.rolls
        rolls[0].options.oppositeRoll = false
        rolls[0].options.difficulty = difficulty

        let newResult = CORoll.analyseRollResult(rolls[0])
        if (newResult.isSuccess) {
          const damageRoll = Roll.fromData(message.system.linkedRoll)
          await damageRoll.toMessage(
            { style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "action", system: { subtype: "damage" }, speaker: message.speaker },
            { rollMode: rolls[0].options.rollMode },
          )
        }

        // Gestion des custom effects
        const customEffect = message.system.customEffect
        const additionalEffect = message.system.additionalEffect
        if (customEffect && additionalEffect && Resolver.shouldManageAdditionalEffect(newResult, additionalEffect)) {
          if (game.user.isGM) await targetActor.applyCustomEffect(customEffect)
          else {
            await game.users.activeGM.query("co2.applyCustomEffect", { ce: customEffect, targets: [targetActor.uuid] })
          }
        }

        // Mise à jour du message de chat
        // Le MJ peut mettre à jour le message de chat
        if (game.user.isGM) {
          await message.update({ rolls: rolls, "system.result": newResult })
        }
        // Sinon on émet un message pour mettre à jour le message de chat
        else {
          await game.users.activeGM.query("co2.updateMessageAfterOpposedRoll", { existingMessageId: message.id, rolls: rolls, result: newResult })
        }
      })
    }
  }
}

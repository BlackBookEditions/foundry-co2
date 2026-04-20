import BaseMessageData from "./base-message.mjs"
import { CORoll } from "../documents/roll.mjs"
import { applyCheckConsequences } from "./check-message.mjs"
import OpposedRollHandler from "../helpers/opposed-roll.mjs"

export default class SkillMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      result: new fields.ObjectField(),
      pendingConsequences: new fields.ObjectField({ required: false }),
    })
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
        rolls[0].options.hasPendingConsequences = false
        rolls[0].options.luckyPointUsed = true
        rolls[0]._total = parseInt(rolls[0].total) + 10

        let newResult = CORoll.analyseRollResult(rolls[0])
        // L'acteur consomme son point de chance
        const actorId = rolls[0].options.actorId
        const actor = game.actors.get(actorId)
        if (actor.system.resources.fortune.value > 0) {
          actor.system.resources.fortune.value -= 1
          await actor.update({ "system.resources.fortune.value": actor.system.resources.fortune.value })
        }

        // Application des conséquences différées si présentes
        const pendingConsequences = message.system.pendingConsequences
        if (pendingConsequences && Object.keys(pendingConsequences).length > 0) {
          await applyCheckConsequences(newResult, pendingConsequences, actor)
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

    // Click sur le bouton d'acceptation du résultat (conséquences différées)
    const acceptButton = html.querySelector(".accept-result-button")
    if (acceptButton && displayButton) {
      acceptButton.addEventListener("click", async (event) => {
        event.preventDefault()
        event.stopPropagation()
        const messageId = event.currentTarget.closest(".message").dataset.messageId
        const message = game.messages.get(messageId)

        let rolls = message.rolls
        const actorId = rolls[0].options.actorId
        const actor = game.actors.get(actorId)
        const currentResult = message.system.result

        // Application des conséquences différées
        const pendingConsequences = message.system.pendingConsequences
        if (pendingConsequences && Object.keys(pendingConsequences).length > 0) {
          await applyCheckConsequences(currentResult, pendingConsequences, actor)
        }

        // Masquer les boutons de chance et d'acceptation
        rolls[0].options.hasLuckyPoints = false
        rolls[0].options.hasPendingConsequences = false

        // Mise à jour du message de chat
        if (game.user.isGM) {
          await message.update({ rolls: rolls, "system.result": currentResult })
        } else {
          await game.users.activeGM.query("co2.updateMessageAfterLuck", { existingMessageId: message.id, rolls: rolls, result: currentResult })
        }
      })
    }

    // Click sur le bouton de jet opposé
    const oppositeButton = html.querySelector(".opposite-roll")
    const hasTargets = this.targets?.length > 0
    const displayOppositeButton = game.user.isGM || !hasTargets || this.isActorTargeted

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

        const targetActor = oppositeTarget ? fromUuidSync(oppositeTarget) : game.user.character
        if (!targetActor) return

        let rolls = message.rolls
        const opposed = await OpposedRollHandler.resolveOpposedRoll({ oppositeValue, targetActor, attackerRoll: rolls[0] })
        if (!opposed) return

        // Enrichissement des options du roll pour le rendu J1/J2
        rolls[0].options.oppositeRoll = false
        rolls[0].options.difficulty = opposed.total
        rolls[0].options.opposeResult = opposed.resultStr
        rolls[0].options.opposeTooltip = opposed.tooltipStr
        rolls[0].options.opposeActorName = opposed.actorName
        rolls[0].options.opposeActorId = opposed.actorId
        rolls[0].options.opposeHasLuckyPoints = opposed.hasLuckyPoints
        if (opposed.skillUsed) rolls[0].options.opposeSkillUsed = opposed.skillUsed
        if (opposed.flavor) rolls[0].options.opposeFlavor = opposed.flavor

        let newResult = CORoll.analyseRollResult(rolls[0])
        const outcome = OpposedRollHandler.computeOutcome({
          attackerResult: newResult,
          defenderResult: opposed.resultAnalysis,
          attackerTotal: rolls[0].total,
          defenderTotal: opposed.total,
          attackerProduct: rolls[0].product,
        })
        newResult.isSuccess = outcome.isSuccess
        newResult.isFailure = outcome.isFailure

        if (outcome.isSuccess) {
          await OpposedRollHandler.triggerLinkedDamage({
            linkedRoll: message.system.linkedRoll,
            speaker: message.speaker,
            rollMode: rolls[0].options.rollMode,
          })
        }

        await OpposedRollHandler.applyEffects({
          customEffect: message.system.customEffect,
          additionalEffect: message.system.additionalEffect,
          result: newResult,
          targetActor,
        })

        await OpposedRollHandler.updateMessage({ message, updateData: { rolls, "system.result": newResult } })
      })
    }

    // Click sur le bouton de chance de PJ2 (jet opposé)
    const opposeLuckyButton = html.querySelector(".lp-button-oppose")
    if (opposeLuckyButton) {
      opposeLuckyButton.addEventListener("click", async (event) => {
        event.preventDefault()
        event.stopPropagation()
        const messageId = event.currentTarget.closest(".message").dataset.messageId
        const message = game.messages.get(messageId)

        const rolls = message.rolls
        const opposeActorId = rolls[0].options.opposeActorId
        const opposeActor = game.actors.get(opposeActorId)
        if (!opposeActor) return

        await OpposedRollHandler.spendDefenderLuckyPoint({ defenderActor: opposeActor, message })
      })
    }
  }
}

import BaseMessageData from "./base-message.mjs"
import { CORoll } from "../documents/roll.mjs"
import { applyCheckConsequences } from "./check-message.mjs"
import Utils from "../helpers/utils.mjs"

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
        let opposeResultAnalyse = null

        // Vérifie si oppositeValue est une ability valide pour ouvrir le dialogue complet
        const abilityId = oppositeValue?.startsWith("@oppose.") ? oppositeValue.replace("@oppose.", "") : null
        const isSkillRoll = abilityId && Object.keys(SYSTEM.ABILITIES).includes(abilityId)

        if (isSkillRoll) {
          // Ouvre la fenêtre de rollSkill avec le dialogue complet
          const targetRollSkill = await targetActor.rollSkill(abilityId, { difficulty: rolls[0].total, showResult: false, showOppositeRoll: false })
          if (!targetRollSkill) return
          opposeResultAnalyse = CORoll.analyseRollResult(targetRollSkill.roll)
          rolls[0].options.oppositeRoll = false
          rolls[0].options.difficulty = targetRollSkill.roll.total
          rolls[0].options.opposeResult = targetRollSkill.roll.result
          rolls[0].options.opposeTooltip = await targetRollSkill.roll.getTooltip()
          rolls[0].options.opposeSkillUsed = targetRollSkill.roll.options.skillUsed
          rolls[0].options.opposeFlavor = targetRollSkill.roll.options.flavor
          rolls[0].options.opposeActorName = targetActor.name
          rolls[0].options.opposeActorId = targetActor.id
          rolls[0].options.opposeHasLuckyPoints = targetActor.system.resources?.fortune?.value > 0
        } else {
          // Fallback : jet simple avec evaluateOppositeFormula
          const value = Utils.evaluateOppositeFormula(oppositeValue, targetActor)
          const formula = value ? `1d20 + ${value}` : `1d20`
          const roll = await new Roll(formula).roll()
          opposeResultAnalyse = CORoll.analyseRollResult(roll)
          rolls[0].options.oppositeRoll = false
          rolls[0].options.difficulty = roll.total
          rolls[0].options.opposeResult = roll.result
          rolls[0].options.opposeTooltip = await roll.getTooltip()
          rolls[0].options.opposeActorName = targetActor.name
          rolls[0].options.opposeActorId = targetActor.id
          rolls[0].options.opposeHasLuckyPoints = targetActor.system.resources?.fortune?.value > 0
        }

        let newResult = CORoll.analyseRollResult(rolls[0])

        // Gestion des critiques/fumbles de l'opposition
        if (opposeResultAnalyse.isCritical && !newResult.isCritical) {
          newResult.isSuccess = false
          newResult.isFailure = true
        } else if (opposeResultAnalyse.isFumble && rolls[0].product > 1) {
          newResult.isSuccess = true
          newResult.isFailure = false
        } else if (!opposeResultAnalyse.isCritical && rolls[0].product === 20) {
          newResult.isSuccess = true
          newResult.isFailure = false
        }

        if (newResult.isSuccess && message.system.linkedRoll) {
          const damageRoll = Roll.fromData(message.system.linkedRoll)
          await damageRoll.toMessage(
            { style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "action", system: { subtype: "damage" }, speaker: message.speaker },
            { rollMode: rolls[0].options.rollMode },
          )
        }

        // Gestion des custom effects
        const customEffect = message.system.customEffect
        const additionalEffect = message.system.additionalEffect
        if (customEffect && additionalEffect && additionalEffect.active && Resolver.shouldManageAdditionalEffect(newResult, additionalEffect)) {
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

    // Click sur le bouton de chance de PJ2 (jet opposé)
    const opposeLuckyButton = html.querySelector(".lp-button-oppose")
    if (opposeLuckyButton) {
      opposeLuckyButton.addEventListener("click", async (event) => {
        event.preventDefault()
        event.stopPropagation()
        const messageId = event.currentTarget.closest(".message").dataset.messageId
        const message = game.messages.get(messageId)

        let rolls = message.rolls
        const opposeActorId = rolls[0].options.opposeActorId
        const opposeActor = game.actors.get(opposeActorId)
        if (!opposeActor) return

        // +10 sur la difficulté (= total de PJ2)
        rolls[0].options.difficulty = parseInt(rolls[0].options.difficulty) + 10
        rolls[0].options.opposeHasLuckyPoints = false

        // L'acteur PJ2 consomme son point de chance
        if (opposeActor.system.resources.fortune.value > 0) {
          opposeActor.system.resources.fortune.value -= 1
          await opposeActor.update({ "system.resources.fortune.value": opposeActor.system.resources.fortune.value })
        }

        let newResult = CORoll.analyseRollResult(rolls[0])

        // Mise à jour du message de chat
        if (game.user.isGM) {
          await message.update({ rolls: rolls, "system.result": newResult })
        } else {
          await game.users.activeGM.query("co2.updateMessageAfterOpposedRoll", { existingMessageId: message.id, rolls: rolls, result: newResult })
        }
      })
    }
  }
}

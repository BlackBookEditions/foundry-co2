import { SYSTEM } from "../config/system.mjs"
import BaseMessageData from "./base-message.mjs"

export default class SkillMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      result: new fields.ObjectField(),
    })
  }

  async addListeners(html) {
    // Clic sur le bouton de chance sur un skill
    html.querySelectorAll(".lp-button-skill").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const messageId = event.currentTarget.closest(".message").dataset.messageId
        const message = game.messages.get(messageId)

        let rolls = message.rolls
        rolls[0].options.bonus = String(parseInt(rolls[0].options.bonus) + 10)
        rolls[0].options.hasLuckyPoints = false
        rolls[0]._total = parseInt(rolls[0].total) + 10

        let newResult = CORoll.analyseRollResult(rolls[0])
        // L'acteur consomme son point de chance
        const actor = game.actors.get(rolls[0].options.actorId)
        if (actor.system.resources.fortune.value > 0) {
          actor.system.resources.fortune.value -= 1
          await actor.update({ "system.resources.fortune.value": actor.system.resources.fortune.value })
        }

        // Le MJ peut mettre à jour le message de chat
        if (game.user.isGM) {
          await message.update({ rolls: rolls, "system.result": newResult })
        }
        // Sinon on émet un message pour mettre à jour le message de chat
        else {
          game.socket.emit(`system.${SYSTEM.ID}`, {
            action: "_luckyRoll",
            data: {
              userId: game.user.id,
              messageId: message.id,
              rolls: rolls,
              result: newResult,
            },
          })
        }
      })
    })

    // Clic sur le bouton de jet opposé
    html.querySelectorAll(".opposite-roll").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const dataset = event.currentTarget.dataset
        const oppositeValue = dataset.oppositeValue
        const oppositeTarget = dataset.oppositeTarget

        const messageId = event.currentTarget.closest(".message").dataset.messageId

        const targetActor = await fromUuid(oppositeTarget)
        const value = Utils.evaluateOppositeFormula(oppositeValue, targetActor)

        const formula = value ? `1d20 + ${value}` : `1d20`
        const roll = await new Roll(formula).roll()
        const difficulty = roll.total
        const message = game.messages.get(messageId)

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
            game.socket.emit(`system.${SYSTEM.ID}`, {
              action: "customEffect",
              data: {
                userId: game.user.id,
                ce: customEffect,
                targets: [targetActor.uuid],
              },
            })
          }
        }

        // Le MJ peut mettre à jour le message de chat
        if (game.user.isGM) {
          await message.update({ rolls: rolls, "system.result": newResult })
        }
        // Sinon on émet un message pour mettre à jour le message de chat
        else {
          game.socket.emit(`system.${SYSTEM.ID}`, {
            action: "oppositeRoll",
            data: {
              userId: game.user.id,
              messageId: message.id,
              rolls: rolls,
              result: newResult,
            },
          })
        }
      })
    })
  }
}

import BaseMessageData from "./base-message.mjs"
import CustomEffectData from "./schemas/custom-effect.mjs"
import { CORoll } from "../documents/roll.mjs"
import Hitpoints from "../helpers/hitpoints.mjs"
import { Resolver } from "./schemas/resolver.mjs"

export default class ActionMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      subtype: new fields.StringField({
        required: true,
        choices: Object.values(SYSTEM.CHAT_MESSAGE_TYPES),
        initial: SYSTEM.CHAT_MESSAGE_TYPES.UNKNOWN,
      }),
      result: new fields.ObjectField(),
      linkedRoll: new fields.ObjectField(),
      customEffect: new fields.EmbeddedDataField(CustomEffectData),
      additionalEffect: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        applyOn: new fields.StringField({ required: true, choices: SYSTEM.RESOLVER_RESULT, initial: SYSTEM.RESOLVER_RESULT.success.id }),
        successThreshold: new fields.NumberField({ integer: true, positive: true }),
        statuses: new fields.SetField(new fields.StringField({ required: true, blank: true, choices: SYSTEM.RESOLVER_ADDITIONAL_EFFECT_STATUS })),
        duration: new fields.StringField({ required: true, nullable: false, initial: "0" }),
        unit: new fields.StringField({ required: true, choices: SYSTEM.COMBAT_UNITE, initial: "round" }),
        formula: new fields.StringField({ required: false }),
        formulaType: new fields.StringField({ required: false, choices: SYSTEM.RESOLVER_FORMULA_TYPE }),
        elementType: new fields.StringField({ required: false }),
      }),
      applyOn: new fields.StringField({ required: false }),
    })
  }

  get isAttack() {
    return this.subtype === SYSTEM.CHAT_MESSAGE_TYPES.ATTACK
  }

  get isDamage() {
    return this.subtype === SYSTEM.CHAT_MESSAGE_TYPES.DAMAGE
  }

  get isFailure() {
    return this.isAttack && this.result.isFailure
  }

  /**
   * Modifie le contenu HTML d'un message
   * @async
   * @param {PenombreMessage} message Le document ChatMessage en cours de rendu.
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   * @returns {Promise<void>} Résout lorsque le HTML a été mis à jour.
   */
  async alterMessageHTML(message, html) {
    // Affiche ou non les boutons d'application des dommages
    if (!game.settings.get("co2", "displayChatDamageButtonsToAll") && !game.user.isGM) {
      html.querySelectorAll(".apply-dmg").forEach((btn) => {
        btn.style.display = "none"
      })
      html.querySelectorAll(".dr-checkbox").forEach((btn) => {
        btn.style.display = "none"
      })
    }

    // Affiche ou non la difficulté
    const displayDifficulty = game.settings.get("co2", "displayDifficulty")
    if (displayDifficulty === "none" || (displayDifficulty === "gm" && !game.user.isGM)) {
      html.querySelectorAll(".display-difficulty").forEach((elt) => {
        elt.remove()
      })
    }
  }

  async addListeners(html) {
    // Click sur les boutons d'application des dommages
    if (game.settings.get("co2", "displayChatDamageButtonsToAll")) {
      const damageButtons = html.querySelectorAll(".apply-dmg")
      if (damageButtons) {
        damageButtons.forEach((btn) => {
          btn.addEventListener("click", (ev) => Hitpoints.onClickChatMessageApplyButton(ev, html, context))
        })
      }
    } else {
      if (game.user.isGM) {
        const damageButtons = html.querySelectorAll(".apply-dmg")
        if (damageButtons) {
          damageButtons.forEach((btn) => {
            btn.addEventListener("click", (ev) => Hitpoints.onClickChatMessageApplyButton(ev, html, context))
          })
        }
      }
    }

    // Click sur le bouton de chance si c'est un jet d'attaque raté
    if (this.isFailure) {
      const luckyButton = html.querySelector(".lp-button-attack")

      if (luckyButton) {
        luckyButton.addEventListener("click", async (event) => {
          event.preventDefault()
          event.stopPropagation()
          const messageId = event.currentTarget.closest(".message").dataset.messageId
          if (!messageId) return
          const message = game.messages.get(messageId)

          let rolls = this.parent.rolls
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

          // Si on a un succes et qu'en plus on est en option ou on jette automatiquement les dommages
          if (newResult.isSuccess && game.settings.get("co2", "useComboRolls")) {
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
            const target = message.system.targets.length > 0 ? message.system.targets[0] : null
            if (target) {
              const targetActor = await fromUuid(target)
              if (game.user.isGM) await targetActor.applyCustomEffect(customEffect)
              else {
                await game.users.activeGM.query("co2.applyCustomEffect", { ce: customEffect, targets: [targetActor.uuid] })
              }
            }
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
    }

    // Click sur le bouton de jet opposé
    const oppositeRollButtons = html.querySelectorAll(".opposite-roll")
    if (oppositeRollButtons) {
      oppositeRollButtons.forEach((btn) => {
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
}

import { SYSTEM } from "./config/system.mjs"
import { CORoll } from "./documents/roll.mjs"
import { Hitpoints } from "./hitpoints.mjs"
import { createCOMacro } from "./macros.mjs"
import Utils from "./utils.mjs"

/**
 * Registers various hooks for the game system.
 *
 * Hooks:
 * - `renderChatMessage`: Customizes the chat message rendering, including the display of damage buttons and difficulty.
 * - `hotbarDrop`: Handles the dropping of items or actions onto the hotbar.
 *
 * @module system/hooks
 *
 * @function registerHooks
 *
 * @listens Hooks#renderChatMessage
 * @param {Object} message The chat message object.
 * @param {Object} html The HTML content of the chat message.
 * @param {Object} data Additional data related to the chat message.
 *
 * @listens Hooks#hotbarDrop
 * @param {Object} bar The hotbar object.
 * @param {Object} data The data being dropped onto the hotbar.
 * @param {number} slot The slot number where the data is being dropped.
 */
export default function registerHooks() {
  Hooks.on("renderChatMessage", (message, html, data) => {
    // Affiche ou non les boutons d'application des dommages
    if (game.settings.get("co", "displayChatDamageButtonsToAll")) {
      html.find(".apply-dmg").click((ev) => Hitpoints.onClickChatMessageApplyButton(ev, html, data))
    } else {
      if (game.user.isGM) {
        html.find(".apply-dmg").click((ev) => Hitpoints.onClickChatMessageApplyButton(ev, html, data))
      } else {
        html.find(".apply-dmg").each((i, btn) => {
          btn.style.display = "none"
        })
        html.find(".dr-checkbox").each((i, btn) => {
          btn.style.display = "none"
        })
      }
    }

    // Affiche ou non la difficulté
    const displayDifficulty = game.settings.get("co", "displayDifficulty")
    if (displayDifficulty === "none" || (displayDifficulty === "gm" && !game.user.isGM)) {
      html.find(".display-difficulty").each((i, elt) => {
        elt.remove()
      })
    }

    html.find(".toggle-action").click(async (event) => {
      console.log("Hook toggle-action", event)
      const shiftKey = !!event.shiftKey
      const dataset = event.currentTarget.dataset

      const actorId = dataset.actorId
      const action = dataset.action
      const type = dataset.type
      const source = dataset.source
      const indice = dataset.indice

      const actor = game.actors.get(actorId)

      let activation
      if (action === "activate") {
        activation = await actor.activateAction({ state: true, source, indice, type, shiftKey })
      } else if (action === "unactivate") {
        activation = await actor.activateAction({ state: false, source, indice, type })
      }
    })

    html.find(".opposite-roll").click(async (event) => {
      const dataset = event.currentTarget.dataset
      const oppositeValue = dataset.oppositeValue
      const oppositeTarget = dataset.oppositeTarget
      console.log("Jet opposé", oppositeValue, oppositeTarget)

      const messageId = event.currentTarget.closest(".message").dataset.messageId
      console.log("Message ID", messageId)

      const actor = await fromUuid(oppositeTarget)
      const value = Utils.evaluateOppositeFormula(oppositeValue, actor)

      const formula = `1d20 + ${value}`
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

      // Le MJ peut mettre à jour le message de chat
      if (game.user.isGM) {
        await message.update({ rolls: rolls, "system.result": newResult })
      }
      // Sinon on emet un socket pour mettre à jour le message de chat
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

  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (["Item", "co.action"].includes(data.type)) {
      if (CONFIG.debug.co?.hooks) console.debug(Utils.log(`HotbarDrop`), bar, data, slot)
      createCOMacro(data, slot)
    }
    return false
  })

  Hooks.on("updateActor", (document, changed, options, userId) => {
    if (document.type === "character" && changed?.system?.attributes?.hp?.value === 0 && !document.statuses.has("unconscious")) {
      // Si déjà affaibli le statut est supprimé
      if (document.statuses.has("weakened")) {
        document.toggleStatusEffect("weakened", { active: false })
        document.unsetFlag("co", "statuses.weakenedFromOneHP")
      }
      document.toggleStatusEffect("unconscious", { active: true })
      document.setFlag("co", "statuses.unconsciousFromZeroHP", true)
      document.system.spendDR(1)
    }
  })
  /**
   * Demande d'appliquer ds custom Effects à des cibles. Seul le MJ peux le faire
   */
  Hooks.on("applyEffect", async (targets, customEffect) => {
    if (game.user.isGM) {
      console.log("je passe par le hook", customEffect)
      // En tant que GM il peux appliquer les effets sur les acteurs
      await Promise.all(targets.map((target) => target.actor.applyCustomEffect(customEffect)))
    }
  })

  /**
   * Demande d'appliquer des Soins à des cibles. Seul le MJ peux le faire
   * Attention pour la fonction appelé il faut que les soins soient en negatif
   */
  Hooks.on("applyHealing", (targets, originName, amount) => {
    if (game.user.isGM) {
      let totalHeal = amount
      if (totalHeal > 0) totalHeal = -totalHeal
      // En tant que GM il peux appliquer les effets sur les acteurs
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i]
        target.actor.applyHealAndDamage(totalHeal)
      }
    }
  })
}

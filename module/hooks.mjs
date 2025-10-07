import { SYSTEM } from "./config/system.mjs"
import { CORoll } from "./documents/roll.mjs"
import { Hitpoints } from "./hitpoints.mjs"
import { createCOMacro } from "./macros.mjs"
import { Resolver } from "./models/schemas/resolver.mjs"
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
  Hooks.on("renderChatMessageHTML", (message, html, context) => {
    // Affiche ou non les boutons d'application des dommages
    if (game.settings.get("co2", "displayChatDamageButtonsToAll")) {
      html.querySelectorAll(".apply-dmg").forEach((btn) => {
        btn.addEventListener("click", (ev) => Hitpoints.onClickChatMessageApplyButton(ev, html, context))
      })
    } else {
      if (game.user.isGM) {
        html.querySelectorAll(".apply-dmg").forEach((btn) => {
          btn.addEventListener("click", (ev) => Hitpoints.onClickChatMessageApplyButton(ev, html, context))
        })
      } else {
        html.querySelectorAll(".apply-dmg").forEach((btn) => {
          btn.style.display = "none"
        })
        html.querySelectorAll(".dr-checkbox").forEach((btn) => {
          btn.style.display = "none"
        })
      }
    }

    // Affiche ou non la difficulté
    const displayDifficulty = game.settings.get("co2", "displayDifficulty")
    if (displayDifficulty === "none" || (displayDifficulty === "gm" && !game.user.isGM)) {
      html.querySelectorAll(".display-difficulty").forEach((elt) => {
        elt.remove()
      })
    }

    // Clic sur les boutons d'action
    html.querySelectorAll(".toggle-action").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
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
    })

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

    // Clic sur le bouton de chance sur un skill
    html.querySelectorAll(".lp-button-attack").forEach((btn) => {
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
        // Si on a un succes et qu'en plus on est en option ou on jette automatiquement les dégats
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
  })

  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (["Item", "co.action", "co.ability"].includes(data.type)) {
      if (CONFIG.debug.co?.hooks) console.debug(Utils.log(`HotbarDrop`), bar, data, slot)
      createCOMacro(data, slot)
      return false
    }
  })

  Hooks.on("updateActor", (document, changed, options, userId) => {
    if (document.type === "character" && changed?.system?.attributes?.hp?.value === 0 && !document.statuses.has("unconscious")) {
      // Si déjà affaibli le statut est supprimé
      if (document.statuses.has("weakened")) {
        document.toggleStatusEffect("weakened", { active: false })
        document.unsetFlag("co2", "statuses.weakenedFromOneHP")
      }
      document.toggleStatusEffect("unconscious", { active: true })
      document.setFlag("co2", "statuses.unconsciousFromZeroHP", true)
      document.system.spendDR(1)
    }

    // Une rencontre est morte à 0 PV
    if (document.type === "encounter" && changed?.system?.attributes?.hp?.value === 0 && !document.statuses.has("dead")) {
      document.toggleStatusEffect("dead", { active: true })
    }
  })

  // A la fin d'un combat on supprime les Active Effects
  Hooks.on("deleteCombat", (combat, options, userId) => {
    if (game.user.isGM) {
      combat.combatants.forEach((combatant) => {
        const actor = combatant.actor
        if (actor) {
          actor.deleteEffects()
        }
      })
    }
  })

  Hooks.on("createActor", (document, options, userId) => {
    // Uniquement pour une création depuis un compendium ou un acteur existant
    if (options?.fromCompendium || (!options?.strict && !options?.renderSheet)) {
      if (game.user.isGM) document.system.updateAllActionsUuid()
    }
  })

  Hooks.on("renderCoEquipmentSheet", (document, html, data) => {
    const element = html instanceof HTMLElement ? html : html[0]
    if (!element) return // exit if no element found
    const inputFields = element.querySelectorAll("input[data-filter-type]")
    const filterFunction = document._applyInputFilter
    inputFields.forEach((input) => {
      // unbind previous listener to not duplicate it
      input.removeEventListener("input", filterFunction)
      // Attach new listener
      input.addEventListener("input", filterFunction)
    })
  })
}

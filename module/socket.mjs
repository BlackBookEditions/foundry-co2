import { CustomEffectData } from "./models/schemas/custom-effect.mjs"

/**
 * Prise en charge des evènements transmis par le socket selon le type d'action transmis.
 *
 * @param {Object} [params={}] Les paramètres fournis par l'évènement du socket.
 * @param {string|null} [params.action=null] L'action à réaliser.
 * @param {Object} [params.data={}] Les données passés en paramètres.
 * @returns {*} Le résultat du gestionnaire de l'évènement le cas échéant.
 */
export function handleSocketEvent({ action = null, data = {} } = {}) {
  console.debug("handleSocketEvent", action, data)
  switch (action) {
    case "heal":
      return _heal(data)
    case "customEffect":
      return CustomEffectData.handle(data)
    case "oppositeRoll":
      return _oppositeRoll(data)
    case "_luckyRoll":
      return _luckyRoll(data)
    default:
      return null
  }
}

/**
 * Fonction qui va proposer dans le chat d'appliquer des soins
 * @param {*} targets : Liste d'uuid d'acteur cible
 * @param {int} healAmount : Quantité de PV restaurés
 * @param {string} fromUserId : Id de l'acteur à l'origine du soin
 */
export async function _heal({ targets, healAmount, fromUserId }) {
  if (game.user.isGM) {
    for (const target of targets) {
      const actor = fromUuidSync(target)
      await actor.applyHeal(healAmount)
    }
  }
}

/**
 * Handles the "_oppositeRoll" socket event, updating the message with new roll data and result.
 *
 * @async
 * @function _oppositeRoll
 * @param {Object} [params={}] The parameters for the function.
 * @param {string} params.userId The ID of the user who triggered the event.
 * @param {string} params.messageId The ID of the message to update.
 * @param {Array} params.rolls The array of roll data to update the message with.
 * @param {any} params.result The result to update in the message's system data.
 * @returns {Promise<void>} Resolves when the message is successfully updated.
 */
export async function _oppositeRoll({ userId, messageId, rolls, result } = {}) {
  console.log(`handleSocketEvent _oppositeRoll from ${userId} !`, messageId, rolls, result)

  if (game.user.isGM) {
    const message = game.messages.get(messageId)
    await message.update({ rolls: rolls, "system.result": result })
  }
}

/**
 * Gère l'évènement socket "_luckyRoll", mettant à jour le message avec les infos du nouveau jet et du résultat.
 * Marche aussi bien sur le skillRoll quele attackRoll
 * @async
 * @function _luckyRoll
 * @param {Object} [params={}] The parameters for the function.
 * @param {string} params.userId The ID of the user who triggered the event.
 * @param {string} params.messageId The ID of the message to update.
 * @param {Array} params.rolls The array of roll data to update the message with.
 * @param {any} params.result The result to update in the message's system data.
 * @returns {Promise<void>} Resolves when the message is successfully updated.
 */
export async function _luckyRoll({ userId, messageId, rolls, result } = {}) {
  if (game.user.isGM) {
    const message = game.messages.get(messageId)
    await message.update({ rolls: rolls, "system.result": result })
  }
}

import { CustomEffectData } from "./models/schemas/custom-effect.mjs"
import { Modifier } from "./models/schemas/modifier.mjs"

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
      return _customEffect(data)
    case "oppositeRoll":
      return _oppositeRoll(data)
  }
}

/** * @description
 * //Fonction qui va proposer dans le chat d'appliquer des soins
 * @param {*} targets : Liste d'uuid d'acteur cible
 * @param {int} Quantité de PV restaurés
 * @param {string} id de l'acteur à l'origine du soin
 */
export async function _heal({ targets, healAmount, fromUserId }) {
  if (game.user.isGM) {
    // Attention la fonction applyHealAndDamage attend une valeur negative pour du heal
    let totalHeal = healAmount
    if (totalHeal > 0) totalHeal = -totalHeal
    // En tant que GM il peux appliquer les effets sur les acteurs
    for (let i = 0; i < targets.length; i++) {
      const actor = await fromUuid(targets[i])
      actor.applyHealAndDamage(totalHeal)
    }
  }
}
/**
 * Fonction qui va provoquer la mise en place d'un custom Effect sur le client donné s'il est dans la liste
 * @param {*} data : Ensemble des données transmises par packet via le socket
 * @param {*} data.userId: game.user.id,
 * @param {CustomEffectData} data.ce CustomEffetcs à appliquer
 * @param {string} data.ce.nom Nom de l'item source
 * @param {string} data.ce.source UUID de l'item source
 * @param {string} data.ce.statuses: liste des status à appliquer
 * @param {int} data.ce.duration this.additionalEffect.duration
 * @param {string} data.ce.unit this.additionalEffect.unit
 * @param {string} data.ce.formule: ce.formule,
 * @param {string} data.ce.elementType: this.additionalEffect.elementType,
 * @param {string} data.ce.effectType: SYSTEM.CUSTOM_EFFECT.status.id,
 * @param {Modifier} data.ce.modifiers: liste de modifiers,
 * @param {Set<int>} data.ce.targets: uuidList,
 */
export async function _customEffect(data) {
  if (game.user.isGM) {
    // Je suis une cible donc je m'applique l'effet
    console.log("je reçoit un message socket avec comme donnée : ", data)
    // Conception de l'effet
    const custom = new CustomEffectData({
      nom: data.ce.nom,
      source: data.ce.source,
      statuses: data.ce.statuses,
      duration: data.ce.duration,
      unit: data.ce.unit,
      formula: data.ce.formula,
      elementType: data.ce.elementType,
      effectType: data.ce.effectType,
      startedAt: game.combat.round,
      remainingDuration: data.ce.duration,
      slug: data.ce.slug,
    })
    for (let i = 0; i < data.ce.modifiers.length; i++) {
      const modifier = data.ce.modifiers[i]
      custom.modifiers.push(new Modifier(modifier))
    }
    for (let i = 0; i < data.targets.length; i++) {
      const actor = await fromUuid(data.targets[i])
      await actor.applyCustomEffect(custom)
    }
  }
}

/**
 *
 * @param root0
 * @param root0.userId
 * @param root0.messageId
 * @param root0.rolls
 * @param root0.result
 */
export async function _oppositeRoll({ userId, messageId, rolls, result } = {}) {
  console.log(`handleSocketEvent _oppositeRoll from ${userId} !`, messageId, rolls, result)
  // const currentUser = game.user._id
  if (game.user.isGM) {
    const message = game.messages.get(messageId)
    await message.update({ rolls: rolls, "system.result": result })
  }
}

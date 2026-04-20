import { CORoll } from "../documents/roll.mjs"
import { Resolver } from "../models/schemas/resolver.mjs"
import Utils from "./utils.mjs"

export default class OpposedRollHandler {
  /**
   * Résout un jet opposé contre un acteur cible.
   * @param {object} params
   * @param {string} params.oppositeValue La formule d'opposition (ex: "@oppose.int")
   * @param {Actor} params.targetActor L'acteur qui fait le jet opposé
   * @param {Roll} params.attackerRoll Le jet de l'attaquant (pour déterminer la difficulté)
   * @returns {Promise<object|null>} Le résultat du jet opposé, ou null si annulé
   */
  static async resolveOpposedRoll({ oppositeValue, targetActor, attackerRoll }) {
    const abilityId = oppositeValue?.startsWith("@oppose.") ? oppositeValue.replace("@oppose.", "") : null
    const isSkillRoll = abilityId && Object.keys(SYSTEM.ABILITIES).includes(abilityId)

    let roll
    let resultAnalysis
    let resultStr
    let tooltipStr
    let skillUsed = null
    let flavor = null

    if (isSkillRoll) {
      const targetRollSkill = await targetActor.rollSkill(abilityId, { difficulty: attackerRoll.total, showResult: false, showOppositeRoll: false })
      if (!targetRollSkill) return null
      roll = targetRollSkill.roll
      resultAnalysis = CORoll.analyseRollResult(roll)
      resultStr = roll.result
      tooltipStr = await roll.getTooltip()
      skillUsed = roll.options.skillUsed
      flavor = roll.options.flavor
    } else {
      const value = Utils.evaluateOppositeFormula(oppositeValue, targetActor)
      const formula = value ? `1d20 + ${value}` : `1d20`
      roll = await new Roll(formula).roll()
      resultAnalysis = CORoll.analyseRollResult(roll)
      resultStr = roll.result
      tooltipStr = await roll.getTooltip()
    }

    return {
      roll,
      total: roll.total,
      resultAnalysis,
      resultStr,
      tooltipStr,
      skillUsed,
      flavor,
      actorName: targetActor.name,
      actorId: targetActor.id,
      hasLuckyPoints: targetActor.system.resources?.fortune?.value > 0,
    }
  }

  /**
   * Calcule le résultat d'un jet opposé (succès/échec) en tenant compte des critiques et fumbles croisés.
   * @param {object} params
   * @param {object} params.attackerResult Résultat analysé du jet de l'attaquant (isCritical, isFumble)
   * @param {object} params.defenderResult Résultat analysé du jet du défenseur (isCritical, isFumble)
   * @param {number} params.attackerTotal Total du jet de l'attaquant
   * @param {number} params.defenderTotal Total du jet du défenseur
   * @param {number} params.attackerProduct Produit du dé de l'attaquant (rolls[0].product)
   * @returns {{ isSuccess: boolean, isFailure: boolean }}
   */
  static computeOutcome({ attackerResult, defenderResult, attackerTotal, defenderTotal, attackerProduct }) {
    let isSuccess = attackerTotal >= defenderTotal
    let isFailure = !isSuccess

    if (defenderResult.isCritical && !attackerResult.isCritical) {
      isSuccess = false
      isFailure = true
    } else if (defenderResult.isFumble && attackerProduct > 1) {
      isSuccess = true
      isFailure = false
    } else if (!defenderResult.isCritical && attackerProduct === 20) {
      isSuccess = true
      isFailure = false
    }
    if (attackerResult.isCritical) {
      isSuccess = true
      isFailure = false
    }
    if (attackerResult.isFumble) {
      isSuccess = false
      isFailure = true
    }

    return { isSuccess, isFailure }
  }

  /**
   * Déclenche le jet de dommages lié si le jet opposé est un succès.
   * @param {object} params
   * @param {object} params.linkedRoll Données sérialisées du jet de dommages
   * @param {object} params.speaker Speaker du message de chat
   * @param {string} params.rollMode Mode de visibilité du jet
   * @param {Array} [params.targetResults] Résultats par cible (filtré sur les succès)
   */
  static async triggerLinkedDamage({ linkedRoll, speaker, rollMode, targetResults }) {
    if (!linkedRoll || Object.keys(linkedRoll).length === 0) return
    const damageRoll = Roll.fromData(linkedRoll)
    const damageSystem = { subtype: "damage" }
    if (targetResults?.length > 0) damageSystem.targetResults = targetResults.filter((tr) => tr.isSuccess)
    await damageRoll.toMessage(
      { style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "action", system: damageSystem, speaker },
      { messageMode: rollMode },
    )
  }

  /**
   * Applique les effets personnalisés si les conditions sont remplies.
   * @param {object} params
   * @param {object} params.customEffect L'effet personnalisé à appliquer
   * @param {object} params.additionalEffect Configuration de l'effet additionnel
   * @param {object} params.result Résultat du jet (isSuccess, isFailure, etc.)
   * @param {Actor} params.targetActor L'acteur cible
   */
  static async applyEffects({ customEffect, additionalEffect, result, targetActor }) {
    if (!customEffect || !additionalEffect || !additionalEffect.active) return
    if (!Resolver.shouldManageAdditionalEffect(result, additionalEffect)) return
    if (game.user.isGM) await targetActor.applyCustomEffect(customEffect)
    else {
      await game.users.activeGM.query("co2.applyCustomEffect", { ce: customEffect, targets: [targetActor.uuid] })
    }
  }

  /**
   * Met à jour un message de chat (via le MJ si nécessaire).
   * @param {object} params
   * @param {ChatMessage} params.message Le message à mettre à jour
   * @param {object} params.updateData Les données de mise à jour
   */
  static async updateMessage({ message, updateData }) {
    if (game.user.isGM) {
      await message.update(updateData)
    } else {
      await game.users.activeGM.query("co2.updateMessageAfterOpposedRoll", {
        existingMessageId: message.id,
        rolls: updateData.rolls,
        result: updateData["system.result"],
        targetResults: updateData["system.targetResults"],
      })
    }
  }

  /**
   * Dépense un point de chance du défenseur : +10 sur la difficulté du jet opposé.
   * @param {object} params
   * @param {Actor} params.defenderActor L'acteur défenseur
   * @param {ChatMessage} params.message Le message de chat
   * @param {string} [params.targetUuid] UUID de la cible (pour les attaques multi-cibles)
   */
  static async spendDefenderLuckyPoint({ defenderActor, message, targetUuid }) {
    if (!defenderActor) return

    if (defenderActor.system.resources.fortune.value > 0) {
      defenderActor.system.resources.fortune.value -= 1
      await defenderActor.update({ "system.resources.fortune.value": defenderActor.system.resources.fortune.value })
    }

    const rolls = message.rolls
    const currentTargetResults = message.system.targetResults ?? []
    const hasTargetResults = currentTargetResults.length > 0

    if (hasTargetResults && targetUuid) {
      const attackerResult = CORoll.analyseRollResult(rolls[0])
      const newTargetResults = currentTargetResults.map((tr) => {
        if (tr.uuid !== targetUuid || tr.needsOppositeRoll) return tr
        const newDifficulty = parseInt(tr.difficulty) + 10
        const isSuccess = attackerResult.isCritical ? true : attackerResult.isFumble ? false : rolls[0].total >= newDifficulty
        const isFailure = !isSuccess
        return { ...tr, difficulty: newDifficulty, isSuccess, isFailure, opposeHasLuckyPoints: false }
      })
      rolls[0].options.targetResults = newTargetResults
      await OpposedRollHandler.updateMessage({ message, updateData: { rolls, "system.targetResults": newTargetResults } })
    } else {
      rolls[0].options.difficulty = parseInt(rolls[0].options.difficulty) + 10
      rolls[0].options.opposeHasLuckyPoints = false
      const newResult = CORoll.analyseRollResult(rolls[0])
      await OpposedRollHandler.updateMessage({ message, updateData: { rolls, "system.result": newResult } })
    }
  }
}

export default class Hitpoints {
  static async applyToTargets({ fromActor, source, type, amount, drChecked, tempDamage } = {}) {
    const targets = [...game.user.targets]
    if (targets.length === 0) {
      ui.notifications.warn(game.i18n.localize("CO.notif.warningApplyDamageNoTarget"))
      return
    }
    for (const target of targets) {
      await Hitpoints.applyToSingleTarget({ targetActor: target.actor, fromActor, source, type, amount, drChecked, tempDamage })
    }
  }

  static async applyToSingleTarget({ targetActor, fromActor, source, type, amount, drChecked, tempDamage } = {}) {
    if (!targetActor) return
    const sourceActor = game.actors.get(fromActor)
    const sourceActorName = sourceActor?.name ?? ""

    const currentHp = targetActor.system.attributes.hp.value
    const currentMaxHp = targetActor.system.attributes.hp.max
    const currentTempDamage = targetActor.system.attributes.tempDm

    let finalAmount = amount
    // Dommages
    if (type === "full" || type === "half" || type === "double") {
      if (type === "half") {
        finalAmount = Math.ceil(finalAmount / 2)
      } else if (type === "double") {
        finalAmount = finalAmount * 2
      }
      if (drChecked) finalAmount -= targetActor.system.combat.dr.value
      if (finalAmount <= 0) finalAmount = 1

      if (tempDamage) {
        const targetFor = targetActor.system.abilities.for.value
        const amountTempDamage = Math.max(0, finalAmount - targetFor)
        let newTempDamage = Math.min(currentTempDamage + amountTempDamage, currentMaxHp)
        if (game.user.isGM) await targetActor.update({ "system.attributes.tempDm": newTempDamage })
        else if (game.settings.get("co2", "allowPlayersToModifyTargets"))
          await game.users.activeGM.query("co2.actorDamageSingleTarget", {
            fromActor: sourceActorName,
            fromSource: source,
            targetUuid: targetActor.uuid,
            damageAmount: finalAmount,
            isTemporaryDamage: true,
            ignoreDR: drChecked,
          })
      } else {
        const newHp = Math.max(0, currentHp - finalAmount)
        if (game.user.isGM) await targetActor.update({ "system.attributes.hp.value": newHp })
        else if (game.settings.get("co2", "allowPlayersToModifyTargets"))
          await game.users.activeGM.query("co2.actorDamageSingleTarget", {
            fromActor: sourceActorName,
            fromSource: source,
            targetUuid: targetActor.uuid,
            damageAmount: finalAmount,
            isTemporaryDamage: false,
            ignoreDR: drChecked,
          })
      }
    }
    // Soins
    else {
      if (drChecked) finalAmount -= targetActor.system.combat.dr.value
      if (tempDamage) {
        const targetFor = targetActor.system.abilities.for.value
        const amountTempDamage = Math.max(0, finalAmount - targetFor)
        let newTempDamage = Math.max(currentTempDamage - amountTempDamage, 0)
        if (game.user.isGM) await targetActor.update({ "system.attributes.tempDm": newTempDamage })
        else if (game.settings.get("co2", "allowPlayersToModifyTargets"))
          await game.users.activeGM.query("co2.actorHealSingleTarget", {
            fromActor: sourceActorName,
            fromSource: source,
            targetUuid: targetActor.uuid,
            healAmount: finalAmount,
            isTemporaryDamage: true,
            ignoreDR: drChecked,
          })
      } else {
        const newHp = Math.min(currentHp + finalAmount, currentMaxHp)
        if (game.user.isGM) await targetActor.update({ "system.attributes.hp.value": newHp })
        else if (game.settings.get("co2", "allowPlayersToModifyTargets"))
          await game.users.activeGM.query("co2.actorHealSingleTarget", {
            fromActor: sourceActorName,
            fromSource: source,
            targetUuid: targetActor.uuid,
            healAmount: finalAmount,
            isTemporaryDamage: false,
            ignoreDR: drChecked,
          })
      }
    }
  }
}

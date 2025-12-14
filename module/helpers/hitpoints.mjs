export default class Hitpoints {
  static async applyToTargets({ fromActor, source, type, amount, drChecked, tempDamage } = {}) {
    // On prend uniquement les cibles s'il y en a
    let targets = [...game.user.targets].length > 0 ? [...game.user.targets] : []
    if (targets.length === 0) {
      ui.notifications.warn(game.i18n.localize("CO.notif.warningApplyDamageNoTarget"))
    } else {
      const sourceActor = game.actors.get(fromActor)
      const sourceActorName = sourceActor.name

      for (let target of targets) {
        const actor = target.actor
        const currentHp = actor.system.attributes.hp.value
        const currentMaxHp = actor.system.attributes.hp.max
        const currentTempDamage = actor.system.attributes.tempDm

        let finalAmount = amount
        // Dommages
        if (type === "full" || type === "half" || type === "double") {
          if (type === "half") {
            finalAmount = Math.ceil(finalAmount / 2)
          } else if (type === "double") {
            finalAmount = finalAmount * 2
          }
          // Application de la RD si c'est cochée
          if (drChecked) finalAmount -= actor.system.combat.dr.value
          // Dommages minimaux
          if (finalAmount <= 0) finalAmount = 1

          // Dommages temporaires
          if (tempDamage) {
            const targetFor = actor.system.abilities.for.value
            const amountTempDamage = Math.max(0, finalAmount - targetFor)
            let newTempDamage = Math.min(currentTempDamage + amountTempDamage, currentMaxHp)
            if (game.user.isGM) await actor.update({ "system.attributes.tempDm": newTempDamage })
            else
              await game.users.activeGM.query("co2.actorDamageSingleTarget", {
                fromActor: sourceActorName,
                fromSource: source,
                targetUuid: actor.uuid,
                damageAmount: finalAmount,
                isTemporaryDamage: true,
                ignoreDR: drChecked,
              })
          }
          // Dommages normaux
          else {
            let newHp = Math.max(0, currentHp - finalAmount)

            if (game.user.isGM) await actor.update({ "system.attributes.hp.value": newHp })
            else
              await game.users.activeGM.query("co2.actorDamageSingleTarget", {
                fromActor: sourceActorName,
                fromSource: source,
                targetUuid: actor.uuid,
                damageAmount: finalAmount,
                isTemporaryDamage: false,
                ignoreDR: drChecked,
              })
          }
        }
        // Soins : on rend les PV en ajoutant la RD si c'est cochée
        else {
          // Application de la RD si c'est cochée
          if (drChecked) finalAmount -= actor.system.combat.dr.value
          // Dommages temporaires
          if (tempDamage) {
            const targetFor = actor.system.abilities.for.value
            const amountTempDamage = Math.max(0, finalAmount - targetFor)
            let newTempDamage = Math.max(currentTempDamage - amountTempDamage, 0)
            if (game.user.isGM) await actor.update({ "system.attributes.tempDm": newTempDamage })
            else
              await game.users.activeGM.query("co2.actorHealSingleTarget", {
                fromActor: sourceActorName,
                fromSource: source,
                targetUuid: actor.uuid,
                healAmount: finalAmount,
                isTemporaryDamage: true,
                ignoreDR: drChecked,
              })
          }
          // Dommages normaux
          else {
            let newHp = Math.min(currentHp + finalAmount, currentMaxHp)
            if (game.user.isGM) await actor.update({ "system.attributes.hp.value": newHp })
            else
              await game.users.activeGM.query("co2.actorHealSingleTarget", {
                fromActor: sourceActorName,
                fromSource: source,
                targetUuid: actor.uuid,
                healAmount: finalAmount,
                isTemporaryDamage: false,
                ignoreDR: drChecked,
              })
          }
        }
      }
    }
  }
}

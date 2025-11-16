export default class Hitpoints {
  static async applyToTargets(type, amount, drChecked, tempDamage) {
    // On prend les cibles s'il y en a, sinon on prend les tokens actifs.
    // notation [...] transforme un Set en Array
    let targets = [...game.user.targets].length > 0 ? [...game.user.targets] : canvas.tokens.objects.children.filter((t) => t._controlled)
    if (targets.length === 0) {
      ui.notifications.warn(game.i18n.localize("CO.notif.warningApplyDamageNoTarget"))
    } else {
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
            await actor.update({ "system.attributes.tempDm": newTempDamage })

            // DM temporaires supérieurs au nombre de PV restant : statut inconscient
            if (actor.system.isTempDmSuperiorToCurrentHp) {
              await actor.toggleStatusEffect("unconscious", true)
            }
          }
          // Dommages normaux
          else {
            let newHp = currentHp - finalAmount
            if (newHp < 0) newHp = 0

            // DM temporaires supérieurs au nombre de PV restant
            // PV mis à 0
            // Si c'est un PNJ : mort
            if (actor.system.isTempDmSuperiorToCurrentHp) {
              newHp = 0
              if (actor.type !== "character") await actor.toggleStatusEffect("dead", true)
            }
            await actor.update({ "system.attributes.hp.value": newHp })
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
            await actor.update({ "system.attributes.tempDm": newTempDamage })
          }
          // Dommages normaux
          else {
            let newHp = Math.min(currentHp + finalAmount, currentMaxHp)
            await actor.update({ "system.attributes.hp.value": newHp })
          }
        }
      }
    }
  }

  /**
   * Handles the click event for the chat message apply button.
   *
   * @param {Event} event The click event triggered by the user.
   * @param {jQuery} html The jQuery object representing the HTML content.
   * @param {Object} data Additional data passed to the function.
   */
  static onClickChatMessageApplyButton(event, html, data) {
    const dataset = event.currentTarget.dataset
    const type = dataset.apply
    const dmg = parseInt(dataset.total)
    const tempDamage = html.querySelector("#tempDm").checked
    const drChecked = html.querySelector("#dr").checked

    Hitpoints.applyToTargets(type, dmg, drChecked, tempDamage)
  }
}

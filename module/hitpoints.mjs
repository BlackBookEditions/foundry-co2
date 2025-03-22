export class Hitpoints {
  static applyToTargets(amount, drChecked) {
    // On prend les cibles s'il y en a, sinon on prend les tokens actifs.
    // notation [...] transforme un Set en Array
    let targets = [...game.user.targets].length > 0 ? [...game.user.targets] : canvas.tokens.objects.children.filter((t) => t._controlled)
    if (targets.length === 0) {
      ui.notifications.warn(game.i18n.localize("CO.notif.warningApplyDamageNoTarget"))
    } else {
      for (let target of targets) {
        let currentHp = foundry.utils.duplicate(target.actor.system.attributes.hp.value)

        let finalAmount = amount
        // Dommages
        if (amount < 0) {
          // Application de la RD si c'est cochée
          if (drChecked) finalAmount += target.actor.system.combat.dr.value
          if (finalAmount > -1) finalAmount = -1
        }

        let newHp = currentHp + finalAmount
        if (newHp > target.actor.system.attributes.hp.max) newHp = target.actor.system.attributes.hp.max
        if (newHp < 0) newHp = 0

        target.actor.update({ "system.attributes.hp.value": newHp })
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
    const drChecked = html.find("#dr").is(":checked")
    switch (type) {
      case "full":
        Hitpoints.applyToTargets(-dmg, drChecked)
        break
      case "half":
        Hitpoints.applyToTargets(-Math.ceil(dmg / 2), drChecked)
        break
      case "double":
        Hitpoints.applyToTargets(-dmg * 2, drChecked)
        break
      case "heal":
        Hitpoints.applyToTargets(dmg, drChecked)
        break
    }
  }
}

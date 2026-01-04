import { SYSTEM } from "../config/system.mjs"
import BaseMessageData from "./base-message.mjs"

export default class HealMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      healer: new fields.DocumentUUIDField({ type: "Actor", nullable: true }),
      item: new fields.DocumentUUIDField({ type: "Item", nullable: true }),
      formula: new fields.StringField({ required: true, nullable: false, initial: "" }),
      total: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      label: new fields.StringField({ required: false, nullable: false, initial: "" }),
      targetType: new fields.StringField({ required: true, choices: SYSTEM.RESOLVER_TARGET, initial: SYSTEM.RESOLVER_TARGET.none.id }),
    })
  }

  /**
   * Modifie le contenu HTML d'un message
   * @async
   * @param {COChatMessage} message Le document ChatMessage en cours de rendu.
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   * @returns {Promise<void>} Résout lorsque le HTML a été mis à jour.
   */
  async alterMessageHTML(message, html) {
    // Affichage des cibles
    const targetsSection = html.querySelector(".targets")
    if (!targetsSection) return

    if (this.targetType !== SYSTEM.RESOLVER_TARGET.none.id) {
      const targetActors = Array.from(message.system.targets)
      if (targetActors.length > 0) {
        const targetList = document.createElement("ul")
        targetList.classList.add("target-list")
        targetActors.forEach((actorUuid) => {
          const actor = fromUuidSync(actorUuid)
          if (!actor) return
          const listItem = document.createElement("li")
          // Ajouter l'image de l'acteur avant le nom
          const img = document.createElement("img")
          img.src = actor.img
          img.classList.add("target-actor-img")
          listItem.appendChild(img)
          // Ajouter le nom de l'acteur après l'image
          const name = document.createElement("span")
          name.textContent = actor.name
          name.classList.add("name-stacked")
          listItem.appendChild(name)

          // ----- Bouton appliquer le soin -----

          /*
          // ----- création de <a> -----
          const link = document.createElement("a")
          link.classList.add("btn", "apply-dmg")
          link.dataset.apply = "heal"
          link.dataset.total = message.system.total

          // ----- création de <i> -----
          const icon = document.createElement("i")
          icon.classList.add("fas", "fa-user-plus")
          icon.dataset.tooltip = game.i18n.localize("CO.ui.applyHealing")
          icon.dataset.tooltipDirection = "UP"

          // ----- on insère <i> dans <a> -----
          link.appendChild(icon)

          // ----- on insère <a> dans le <li> -----
          listItem.append(" ")
          listItem.appendChild(link)
          */

          // ----- on insère le <li> dans la <ul> -----
          targetList.appendChild(listItem)
        })
        targetsSection.appendChild(targetList)
      }
    } else {
      targetsSection.remove()
    }
  }
}

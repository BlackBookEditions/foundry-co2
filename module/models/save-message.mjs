import BaseMessageData from "./base-message.mjs"
import CustomEffectData from "./schemas/custom-effect.mjs"
import { CORoll } from "../documents/roll.mjs"
import { Resolver } from "./schemas/resolver.mjs"

export default class SaveMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      ability: new fields.StringField({ required: true }),
      difficulty: new fields.StringField({ required: true }),
      result: new fields.ObjectField(),
      customEffect: new fields.EmbeddedDataField(CustomEffectData),
      additionalEffect: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        applyOn: new fields.StringField({ required: true, choices: SYSTEM.RESOLVER_RESULT, initial: SYSTEM.RESOLVER_RESULT.success.id }),
        successThreshold: new fields.NumberField({ integer: true, positive: true }),
        statuses: new fields.SetField(new fields.StringField({ required: true, blank: true, choices: SYSTEM.RESOLVER_ADDITIONAL_EFFECT_STATUS })),
        duration: new fields.StringField({ required: true, nullable: false, initial: "0" }),
        unit: new fields.StringField({ required: true, choices: SYSTEM.COMBAT_UNITE, initial: SYSTEM.COMBAT_UNITE.round.id }),
        formula: new fields.StringField({ required: false }),
        formulaType: new fields.StringField({ required: false, choices: SYSTEM.RESOLVER_FORMULA_TYPE }),
        elementType: new fields.StringField({ required: false }),
      }),
      showButton: new fields.BooleanField({ initial: true }),
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

    // Affiche ou non la difficulté
    const displayDifficulty = game.settings.get("co2", "displayDifficulty")
    if (displayDifficulty === "none" || (displayDifficulty === "gm" && !game.user.isGM)) {
      const element = html.querySelector(".display-difficulty")
      if (element) {
        element.remove()
      }
    }

    // Affiche le bouton de jet de sauvegarde
    if (this.showButton) {
      const footer = html.querySelector(".card-footer")
      if (footer) {
        footer.remove()
      }
      const luckyPointsDiv = html.querySelector(".lucky-points")
      if (luckyPointsDiv) {
        luckyPointsDiv.remove()
      }
    }
    // Affiche le résultat du jet de sauvegarde
    else {
      const button = html.querySelector(".save-roll")
      if (button) {
        button.remove()
      }
      const totalDiv = html.querySelector(".save-total")
      if (totalDiv) {
        totalDiv.innerHTML = `<label>${game.i18n.localize("CO.ui.total")}</label><div>${this.result.total}</div>`
      }
      const footerFormula = html.querySelector(".footer-formula")
      if (footerFormula) {
        footerFormula.innerText = this.parent.rolls[0].formula
      }
      const footerTooltip = html.querySelector(".footer-tooltip")
      if (footerTooltip) {
        footerTooltip.innerHTML = this.parent.rolls[0].options.toolTip
      }

      // Affichage de la div de gestion des points de chance si c'est un échec, et uniquement dans le cas d'un personnage
      const targetUuid = this.targets[0]
      const currentUserActor = game.user.character
      const currentUserActorUuid = currentUserActor ? currentUserActor.uuid : null
      if (this.result.isCritical || this.result.isSuccess || currentUserActorUuid !== targetUuid || currentUserActor.type !== "character") {
        const luckyPointsDiv = html.querySelector(".lucky-points")
        if (luckyPointsDiv) {
          luckyPointsDiv.remove()
        }
      }
    }
  }

  /**
   * Ajoute les listeners du message
   * @async
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   */
  async addListeners(html) {
    // TODO Vérifier la gestion de la chance
    // Click sur le bouton de chance si c'est un jet d'attaque raté
    if (this.result.isFailure) {
      const luckyButton = html.querySelector(".lp-button-save")
      const targetUuid = this.targets[0]
      const currentUserActor = game.user.character
      const currentUserActorUuid = currentUserActor ? currentUserActor.uuid : null

      const displayButton = game.user.isGM || currentUserActorUuid === targetUuid

      if (luckyButton && displayButton) {
        luckyButton.addEventListener("click", async (event) => {
          event.preventDefault()
          event.stopPropagation()
          const messageId = event.currentTarget.closest(".message").dataset.messageId
          if (!messageId) return
          const message = game.messages.get(messageId)

          let rolls = this.parent.rolls
          rolls[0].options.bonus = String(parseInt(rolls[0].options.bonus) + 10)
          rolls[0].options.hasLuckyPoints = false
          rolls[0]._total = parseInt(rolls[0].total) + 10

          let newResult = CORoll.analyseRollResult(rolls[0])

          // L'acteur consomme son point de chance
          const actorId = rolls[0].options.actorId
          const actor = game.actors.get(actorId)
          if (actor.system.resources.fortune.value > 0) {
            actor.system.resources.fortune.value -= 1
            await actor.update({ "system.resources.fortune.value": actor.system.resources.fortune.value })
          }

          // Gestion des custom effects
          const customEffect = message.system.customEffect
          const additionalEffect = message.system.additionalEffect
          if (customEffect && additionalEffect && additionalEffect.active && Resolver.shouldManageAdditionalEffect(newResult, additionalEffect)) {
            const target = message.system.targets.length > 0 ? message.system.targets[0] : null
            if (target) {
              const targetActor = fromUuidSync(target)
              if (game.user.isGM) await targetActor.applyCustomEffect(customEffect)
              else {
                await game.users.activeGM.query("co2.applyCustomEffect", { ce: customEffect, targets: [targetActor.uuid] })
              }
            }
          }

          // Mise à jour du message de chat
          // Le MJ peut mettre à jour le message de chat
          if (game.user.isGM) {
            await message.update({ rolls: rolls, "system.result": newResult })
          }
          // Sinon on émet un message pour mettre à jour le message de chat
          else {
            await game.users.activeGM.query("co2.updateMessageAfterLuck", { existingMessageId: message.id, rolls: rolls, result: newResult })
          }
        })
      }
    }

    // Click sur le bouton de jet de sauvegarde
    // Jet de compétence basé sur la difficulté récupérée dans le contexte du message et envoi du résultat au GM pour mise à jour du message et application du résultat
    const saveButton = html.querySelector(".save-roll")
    const displaySaveButton = game.user.isGM || this.isActorTargeted

    if (saveButton && displaySaveButton) {
      saveButton.addEventListener("click", async (event) => {
        event.preventDefault()
        event.stopPropagation()
        const messageId = event.currentTarget.closest(".message").dataset.messageId
        if (!messageId) {
          console.log("Evenement de click sur le bouton de jet de sauvegarde : erreur dans la récupération de l'ID du message")
          return
        }
        const message = game.messages.get(messageId)
        if (!message || !message.system) {
          console.log("Evenement de click sur le bouton de jet de sauvegarde : erreur dans la récupération du message ou de son context")
          return
        }

        const dataset = event.currentTarget.dataset
        const targetUuid = message.system.targets[0]
        if (!targetUuid) {
          console.log("Evenement de click sur le bouton de jet de sauvegarde : erreur dans la récupération de l'UUID de la cible")
          return
        }

        const saveAbility = dataset.saveAbility
        const difficulty = dataset.saveDifficulty

        const targetActor = fromUuidSync(targetUuid)
        if (!targetActor) {
          console.log("Evenement de click sur le bouton de jet de sauvegarde : erreur dans la récupération de l'acteur cible")
          return
        }

        // L'acteur cible effectue son jet de compétence et retourne {roll, result}
        const targetRollSkill = await targetActor.rollSkill(saveAbility, { difficulty: difficulty, showResult: false })
        message.system.result = targetRollSkill.result
        message.system.linkedRoll = targetRollSkill.roll

        console.log("result : ", targetRollSkill.result)

        let rolls = this.parent.rolls
        rolls[0] = targetRollSkill.roll
        rolls[0].options.oppositeRoll = false

        // TODO : Doit on prévoir autre chose qu'un effet supplémentaire ? genre des dés de degat bonus appliqué si jet raté ? A voir...

        // Doit on appliquer l'effet s'il y en a
        const customEffect = message.system.customEffect
        const additionalEffect = message.system.additionalEffect
        if (customEffect && additionalEffect && additionalEffect.active && Resolver.shouldManageAdditionalEffect(targetRollSkill.result, additionalEffect)) {
          console.log("on va appliquer les effets", "customEffect : ", customEffect)

          if (game.user.isGM) await targetActor.applyCustomEffect(customEffect)
          else {
            await game.users.activeGM.query("co2.applyCustomEffect", { ce: customEffect, targets: [targetActor.uuid] })
          }
        }

        // Mise à jour du message de chat
        // Le MJ peut mettre à jour le message de chat
        if (game.user.isGM) {
          await message.update({ rolls: rolls, "system.showButton": false, "system.result": targetRollSkill.result })
        }
        // Sinon on émet un message pour mettre à jour le message de chat
        else {
          await game.users.activeGM.query("co2.updateMessageAfterSavedRoll", { existingMessageId: message.id, rolls: rolls, result: targetRollSkill.result })
        }
      })
    }
  }
}

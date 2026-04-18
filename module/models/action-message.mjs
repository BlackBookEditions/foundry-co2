import BaseMessageData from "./base-message.mjs"
import CustomEffectData from "./schemas/custom-effect.mjs"
import { CORoll } from "../documents/roll.mjs"
import Hitpoints from "../helpers/hitpoints.mjs"
import { Resolver } from "./schemas/resolver.mjs"
import Utils from "../helpers/utils.mjs"
import COChatMessage from "../documents/chat-message.mjs"

export default class ActionMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      subtype: new fields.StringField({
        required: true,
        choices: Object.values(SYSTEM.CHAT_MESSAGE_TYPES),
        initial: SYSTEM.CHAT_MESSAGE_TYPES.UNKNOWN,
      }),
      result: new fields.ObjectField(),
      targetResults: new fields.ArrayField(
        new fields.SchemaField({
          uuid: new fields.StringField({ required: false, nullable: true, blank: true }),
          name: new fields.StringField({ required: false, nullable: true, blank: true }),
          img: new fields.StringField({ required: false, nullable: true, blank: true }),
          difficulty: new fields.NumberField({ required: false, nullable: true, integer: true }),
          isSuccess: new fields.BooleanField({ initial: false }),
          isFailure: new fields.BooleanField({ initial: false }),
          isCritical: new fields.BooleanField({ initial: false }),
          isFumble: new fields.BooleanField({ initial: false }),
          needsOppositeRoll: new fields.BooleanField({ initial: false }),
        }),
        { required: false, initial: [] },
      ),
      linkedRoll: new fields.ObjectField(),
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
      applyOn: new fields.StringField({ required: false }), // Deprecated
    })
  }

  get isAttack() {
    return this.subtype === SYSTEM.CHAT_MESSAGE_TYPES.ATTACK
  }

  get isDamage() {
    return this.subtype === SYSTEM.CHAT_MESSAGE_TYPES.DAMAGE
  }

  get isFailure() {
    return this.isAttack && this.result.isFailure
  }

  /**
   * Modifie le contenu HTML d'un message
   * @async
   * @param {COChatMessage} message Le document ChatMessage en cours de rendu.
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   * @returns {Promise<void>} Résout lorsque le HTML a été mis à jour.
   */
  async alterMessageHTML(message, html) {
    // Message d'attaque
    if (this.isAttack) {
      // Affichage des cibles
      const targetsSection = html.querySelector(".targets")
      if (!targetsSection) return

      const hasTargetResults = message.system.targetResults?.length > 0
      // Rendu legacy : si on n'a pas de targetResults (anciens messages), on injecte la liste portrait+nom en JS
      if (!hasTargetResults) {
        const targetActors = Array.from(message.system.targets)
        if (targetActors.length > 0) {
          const targetList = document.createElement("ul")
          targetList.classList.add("target-list")
          targetActors.forEach((actorUuid) => {
            const actor = fromUuidSync(actorUuid)
            if (!actor) return
            const listItem = document.createElement("li")
            listItem.classList.add("target-row")
            listItem.dataset.targetUuid = actorUuid
            const img = document.createElement("img")
            img.src = actor.img
            img.classList.add("target-actor-img")
            listItem.appendChild(img)
            const name = document.createElement("span")
            name.textContent = actor.name
            name.classList.add("target-name")
            listItem.appendChild(name)
            targetList.appendChild(listItem)
          })
          targetsSection.appendChild(targetList)
        }
      }

      // Affiche ou non la difficulté
      const displayDifficulty = game.settings.get("co2", "displayDifficulty")
      if (displayDifficulty === "none" || (displayDifficulty === "gm" && !game.user.isGM)) {
        html.querySelectorAll(".display-difficulty").forEach((elt) => {
          elt.remove()
        })
      }
    }
    // Message de dommages
    else {
      // Affiche ou non les boutons d'application des dommages
      // Boutons visibles uniquement par le MJ ou l'auteur du message si l'option est activée
      // FIXME : ne pas afficher pour tous les joueurs, mais uniquement pour le joueur à l'origine du message
      if (!game.settings.get("co2", "displayChatDamageButtonsToAll") && !game.user.isGM) {
        html.querySelectorAll(".apply-dmg").forEach((btn) => {
          btn.style.display = "none"
        })
        html.querySelectorAll(".dr-checkbox").forEach((btn) => {
          btn.style.display = "none"
        })
      }
    }
  }

  /**
   * Ajoute les listeners du message
   * @async
   * @param {HTMLElement} html Élément HTML représentant le message à modifier.
   */
  async addListeners(html) {
    // Message d'attaque
    if (this.isAttack) {
      // Click sur le bouton de chance si c'est un jet d'attaque raté
      if (this.isFailure) {
        const luckyButton = html.querySelector(".lp-button-attack")
        const displayButton = game.user.isGM || this.parent.isAuthor

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

            // Recalcul des résultats par cible avec le nouveau total
            const currentTargetResults = message.system.targetResults ?? []
            let newTargetResults = currentTargetResults
            if (currentTargetResults.length > 0) {
              newTargetResults = Utils.recomputeTargetResults(currentTargetResults, rolls[0].total, newResult)
              rolls[0].options.targetResults = newTargetResults
            }

            // Si l'option Jet combinée est activée et au moins une cible (ou le jet global) est un succès, on lance les dommages
            const anyRowSuccess = newTargetResults.some((tr) => tr.isSuccess)
            const shouldTriggerDamage = currentTargetResults.length > 0 ? anyRowSuccess : newResult.isSuccess
            if (game.settings.get("co2", "useComboRolls") && shouldTriggerDamage && message.system.linkedRoll && Object.keys(message.system.linkedRoll).length > 0) {
              const damageRoll = Roll.fromData(message.system.linkedRoll)
              const damageSystem = { subtype: "damage" }
              if (currentTargetResults.length > 0) damageSystem.targetResults = newTargetResults.filter((tr) => tr.isSuccess)
              await damageRoll.toMessage(
                { style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "action", system: damageSystem, speaker: message.speaker },
                { messageMode: rolls[0].options.rollMode },
              )
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
            const updateData = { rolls: rolls, "system.result": newResult }
            if (currentTargetResults.length > 0) updateData["system.targetResults"] = newTargetResults

            if (game.user.isGM) {
              await message.update(updateData)
            } else {
              await game.users.activeGM.query("co2.updateMessageAfterLuck", {
                existingMessageId: message.id,
                rolls: rolls,
                result: newResult,
                targetResults: currentTargetResults.length > 0 ? newTargetResults : undefined,
              })
            }
          })
        }
      }

      // Click sur le(s) bouton(s) de jet opposé
      const oppositeButtons = html.querySelectorAll(".opposite-roll")
      const displayOppositeButton = game.user.isGM || this.isActorTargeted

      if (oppositeButtons.length > 0 && displayOppositeButton) {
        oppositeButtons.forEach((oppositeButton) => {
          oppositeButton.addEventListener("click", async (event) => {
            event.preventDefault()
            event.stopPropagation()
            const messageId = event.currentTarget.closest(".message").dataset.messageId
            if (!messageId) return
            const message = game.messages.get(messageId)

            const dataset = event.currentTarget.dataset
            const oppositeValue = dataset.oppositeValue
            const oppositeTarget = dataset.oppositeTarget

            const targetActor = fromUuidSync(oppositeTarget)
            if (!targetActor) return

            // Gestion de la fenêtre de skill en cas d'attaque opposé à une ability
            if (!oppositeValue.startsWith("@oppose.")) {
              console.warn("On clique sur un bouton d'opposition qui n'a pas le terme oppose : ", oppositeValue)
              return
            }

            const abilityId = oppositeValue.replace("@oppose.", "")
            const isSkillRoll = Object.keys(SYSTEM.ABILITIES).includes(abilityId)
            let value = 0
            let rolls = message.rolls
            let opposeResultAnalyse = null
            let rowDifficulty = null
            let opposeResultStr = ""
            let opposeTooltipStr = ""

            if (isSkillRoll) {
              const targetRollSkill = await targetActor.rollSkill(abilityId, { difficulty: rolls[0].total, showResult: false, showOppositeRoll: false })
              opposeResultAnalyse = CORoll.analyseRollResult(targetRollSkill.roll)
              rowDifficulty = targetRollSkill.roll.total
              opposeResultStr = targetRollSkill.roll.result
              opposeTooltipStr = await targetRollSkill.roll.getTooltip()
            } else {
              value = Utils.evaluateOppositeFormula(oppositeValue, targetActor)
              const formula = value ? `1d20 + ${value}` : `1d20`
              const roll = await new Roll(formula).roll()
              rowDifficulty = roll.total
              opposeResultAnalyse = CORoll.analyseRollResult(roll)
              opposeResultStr = roll.result
              opposeTooltipStr = await roll.getTooltip()
            }

            // Calcul du résultat pour CETTE cible
            let localResult = CORoll.analyseRollResult(rolls[0])
            let rowSuccess = rolls[0].total >= rowDifficulty
            let rowFailure = !rowSuccess

            if (opposeResultAnalyse.isCritical && !localResult.isCritical) {
              rowSuccess = false
              rowFailure = true
            } else if (opposeResultAnalyse.isFumble && rolls[0].product > 1) {
              rowSuccess = true
              rowFailure = false
            } else if (!opposeResultAnalyse.isCritical && rolls[0].product === 20) {
              rowSuccess = true
              rowFailure = false
            }
            if (localResult.isCritical) {
              rowSuccess = true
              rowFailure = false
            }
            if (localResult.isFumble) {
              rowSuccess = false
              rowFailure = true
            }

            // Mise à jour de targetResults (par cible) ou fallback legacy (system.result)
            const currentTargetResults = message.system.targetResults ?? []
            const hasTargetResults = currentTargetResults.length > 0
            let newTargetResults = currentTargetResults
            let newGlobalResult = null

            if (hasTargetResults) {
              newTargetResults = currentTargetResults.map((tr) => {
                if (tr.uuid !== oppositeTarget) return tr
                return {
                  ...tr,
                  difficulty: rowDifficulty,
                  isSuccess: rowSuccess,
                  isFailure: rowFailure,
                  needsOppositeRoll: false,
                }
              })
              // Synchronise aussi rolls[0].options.targetResults pour que le re-render du template voit la màj
              rolls[0].options.targetResults = newTargetResults
            } else {
              // Fallback legacy : on écrase system.result comme avant
              rolls[0].options.oppositeRoll = false
              rolls[0].options.difficulty = rowDifficulty
              rolls[0].options.opposeResult = opposeResultStr
              rolls[0].options.opposeTooltip = opposeTooltipStr
              newGlobalResult = { ...localResult, isSuccess: rowSuccess, isFailure: rowFailure, difficulty: rowDifficulty }
            }

            // Le jet est un succès : déclenche le jet de dommages lié
            if (rowSuccess && message.system.linkedRoll && Object.keys(message.system.linkedRoll).length > 0) {
              const damageRoll = Roll.fromData(message.system.linkedRoll)
              await damageRoll.toMessage(
                { style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "action", system: { subtype: "damage" }, speaker: message.speaker },
                { messageMode: rolls[0].options.rollMode },
              )
            }

            // Gestion des custom effects (appliqués uniquement à la cible qui fait le jet opposé)
            const customEffect = message.system.customEffect
            const additionalEffect = message.system.additionalEffect
            const rowResultForEffect = { ...localResult, isSuccess: rowSuccess, isFailure: rowFailure }
            if (customEffect && additionalEffect && additionalEffect.active && Resolver.shouldManageAdditionalEffect(rowResultForEffect, additionalEffect)) {
              if (game.user.isGM) await targetActor.applyCustomEffect(customEffect)
              else {
                await game.users.activeGM.query("co2.applyCustomEffect", { ce: customEffect, targets: [targetActor.uuid] })
              }
            }

            // Mise à jour du message de chat
            const updateData = { rolls: rolls }
            if (hasTargetResults) updateData["system.targetResults"] = newTargetResults
            else updateData["system.result"] = newGlobalResult

            if (game.user.isGM) {
              await message.update(updateData)
            } else {
              await game.users.activeGM.query("co2.updateMessageAfterOpposedRoll", {
                existingMessageId: message.id,
                rolls: rolls,
                result: newGlobalResult,
                targetResults: hasTargetResults ? newTargetResults : undefined,
              })
            }
          })
        })
      }

      const associatedActor = this.parent.getAssociatedActor?.()
      const canInteractWithTargets = game.user.isGM || this.parent.isAuthor || associatedActor?.isOwner
      let highlightedTargetToken = null
      const targetRows = html.querySelectorAll(".target-row[data-target-uuid]")
      if (targetRows.length > 0) {
        targetRows.forEach((targetRow) => {
          if (!canInteractWithTargets) return

          targetRow.classList.add("is-interactive")

          targetRow.addEventListener("click", async (event) => {
            event.preventDefault()
            event.stopPropagation()

            const targetReference = Utils.resolveChatTargetReference(event.currentTarget.dataset.targetUuid)
            const targetToken = targetReference?.token
            if (!targetReference?.canLocate || !targetToken || !canvas?.ready) return

            if (targetReference.canControl) {
              targetToken.control({ releaseOthers: !event.shiftKey })
            }
            await canvas.animatePan(targetToken.center)
          })

          targetRow.addEventListener("pointerover", (event) => {
            const targetReference = Utils.resolveChatTargetReference(event.currentTarget.dataset.targetUuid)
            const targetToken = targetReference?.token
            if (!targetReference?.canLocate || !targetToken?.isVisible || targetToken.controlled) return

            targetToken._onHoverIn(event, { hoverOutOthers: true })
            highlightedTargetToken = targetToken
          })

          targetRow.addEventListener("pointerout", (event) => {
            const targetReference = Utils.resolveChatTargetReference(event.currentTarget.dataset.targetUuid)
            const targetToken = targetReference?.token
            if (!targetToken || highlightedTargetToken !== targetToken) return

            targetToken._onHoverOut(event)
            highlightedTargetToken = null
          })
        })
      }
    }
    // Message de dommages
    else {
      // Click sur les boutons d'application des dommages
      if ((game.settings.get("co2", "displayChatDamageButtonsToAll") && this.parent.isAuthor) || game.user.isGM) {
        const damageButtons = html.querySelectorAll(".apply-dmg")
        if (damageButtons) {
          damageButtons.forEach((btn) => {
            btn.addEventListener("click", async (event) => {
              event.preventDefault()
              event.stopPropagation()
              const dataset = event.currentTarget.dataset
              const type = dataset.apply // Values : full, half, double, heal
              const actorId = dataset.actorId
              const sourceLabel = dataset.sourceLabel || null
              const dmg = parseInt(dataset.total)
              const tempDamage = html.querySelector("#tempDm").checked
              const drChecked = html.querySelector("#dr").checked
              const targetUuid = dataset.targetUuid
              if (targetUuid) {
                const targetActor = fromUuidSync(targetUuid)
                Hitpoints.applyToSingleTarget({ targetActor, fromActor: actorId, source: sourceLabel, type, amount: dmg, drChecked, tempDamage })
              } else {
                Hitpoints.applyToTargets({ fromActor: actorId, source: sourceLabel, type, amount: dmg, drChecked, tempDamage })
              }
            })
          })
        }
      }
    }
  }
}

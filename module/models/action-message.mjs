import BaseMessageData from "./base-message.mjs"
import CustomEffectData from "./schemas/custom-effect.mjs"
import { CORoll } from "../documents/roll.mjs"
import Hitpoints from "../helpers/hitpoints.mjs"
import { Resolver } from "./schemas/resolver.mjs"
import Utils from "../helpers/utils.mjs"
import OpposedRollHandler from "../helpers/opposed-roll.mjs"
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
          opposeActorId: new fields.StringField({ required: false, nullable: true, blank: true }),
          opposeHasLuckyPoints: new fields.BooleanField({ initial: false }),
          appliedMultiplier: new fields.NumberField({ required: false, nullable: true, initial: null }),
          appliedDrChecked: new fields.BooleanField({ initial: true }),
        }),
        { required: false, initial: [] },
      ),
      linkedRoll: new fields.ObjectField(),
      oppositeValue: new fields.StringField({ required: false, nullable: true, blank: true }),
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
      if (displayDifficulty === "gm" && !game.user.isGM) {
        html.querySelectorAll(".display-difficulty").forEach((elt) => {
          elt.remove()
        })
      }
    }
    // Message de dommages
    else {
      // Affiche ou non le panneau d'application des dommages
      // Visible uniquement par le MJ ou l'auteur du message si l'option est activée
      if (!game.settings.get("co2", "allowPlayersToModifyTargets") && !game.user.isGM) {
        const applyCollapsible = html.querySelector(".apply-collapsible")
        if (applyCollapsible) applyCollapsible.style.display = "none"
      }

      // Restaure l'état persisté (multiplicateurs et RD) et calcule les dommages ajustés pour chaque cible
      const total = parseInt(html.querySelector(".damage-card")?.dataset.total) || 0
      const damageTargetResults = message.system.targetResults ?? []
      damageTargetResults.forEach((tr) => {
        const row = html.querySelector(`.apply-target-row[data-target-uuid="${tr.uuid}"][data-source="targeted"]`)
        if (!row) return

        // RD de la cible
        const targetActor = fromUuidSync(tr.uuid)
        const targetDr = targetActor?.system?.combat?.dr?.value ?? 0
        row.dataset.targetDr = targetDr

        // Restaure le multiplicateur persisté
        if (tr.appliedMultiplier !== null && tr.appliedMultiplier !== undefined) {
          row.querySelectorAll(".multiplier-btn").forEach((btn) => {
            btn.classList.toggle("active", parseFloat(btn.dataset.multiplier) === tr.appliedMultiplier)
          })
        }

        // Restaure l'état de la case RD
        const drCheckbox = row.querySelector(".target-dr")
        if (drCheckbox) drCheckbox.checked = tr.appliedDrChecked

        // Recalcul de l'affichage des dommages
        const activeBtn = row.querySelector(".multiplier-btn.active")
        const multiplier = activeBtn ? parseFloat(activeBtn.dataset.multiplier) : 1
        const drChecked = drCheckbox?.checked ?? true
        const dmgDisplay = row.querySelector(".target-damage")
        if (dmgDisplay) {
          ActionMessageData.updateDamageDisplay(dmgDisplay, total, multiplier, drChecked, targetDr)
        }
      })
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
      // Si la difficulté n'est visible que par le MJ, le joueur ne connaît pas le résultat : on active le bouton dans tous les cas
      const displayDifficulty = game.settings.get("co2", "displayDifficulty")
      const anyTargetFailure = this.targetResults.some((tr) => tr.isFailure)
      if (this.isFailure || anyTargetFailure || displayDifficulty === "gm") {
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

            // Gestion du message de dommages combiné après le point de chance
            const displayDifficulty = game.settings.get("co2", "displayDifficulty")
            const anyRowSuccess = newTargetResults.some((tr) => tr.isSuccess)
            const shouldTriggerDamage = currentTargetResults.length > 0 ? anyRowSuccess : newResult.isSuccess
            if (game.settings.get("co2", "useComboRolls") && message.system.linkedRoll && Object.keys(message.system.linkedRoll).length > 0) {
              // Un message de dommages existe déjà si la difficulté est masquée (MJ) ou si le résultat global était un succès
              const damageMessageExists = displayDifficulty === "gm" || this.result?.isSuccess

              if (damageMessageExists && currentTargetResults.length > 0) {
                // Mise à jour du message de dommages existant
                const allMessages = game.messages.contents
                const attackIdx = allMessages.indexOf(message)
                if (attackIdx >= 0) {
                  const damageMessage = allMessages.slice(attackIdx + 1).find((m) => m.system?.subtype === "damage")
                  if (damageMessage) {
                    const updatedDamageTargetResults = (damageMessage.system.targetResults ?? []).map((dtr) => {
                      const match = newTargetResults.find((ntr) => ntr.uuid === dtr.uuid)
                      if (match && match.isSuccess !== dtr.isSuccess) {
                        return { ...dtr, isSuccess: match.isSuccess, isFailure: match.isFailure, isCritical: match.isCritical, isFumble: match.isFumble, appliedMultiplier: null }
                      }
                      return dtr
                    })
                    if (game.user.isGM) {
                      await damageMessage.update({ "system.targetResults": updatedDamageTargetResults })
                    } else {
                      await game.users.activeGM.query("co2.updateTargetResults", { existingMessageId: damageMessage.id, targetResults: updatedDamageTargetResults })
                    }
                  }
                }
              } else if (shouldTriggerDamage) {
                // Création d'un nouveau message de dommages
                const damageRoll = Roll.fromData(message.system.linkedRoll)
                const damageSystem = { subtype: "damage" }
                if (currentTargetResults.length > 0) damageSystem.targetResults = newTargetResults.filter((tr) => tr.isSuccess)
                await damageRoll.toMessage(
                  { style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "action", system: damageSystem, speaker: message.speaker },
                  { messageMode: rolls[0].options.rollMode },
                )
              }
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

            if (!oppositeValue.startsWith("@oppose.")) {
              console.warn("On clique sur un bouton d'opposition qui n'a pas le terme oppose : ", oppositeValue)
              return
            }

            let rolls = message.rolls
            const opposed = await OpposedRollHandler.resolveOpposedRoll({ oppositeValue, targetActor, attackerRoll: rolls[0] })
            if (!opposed) return

            const attackerResult = CORoll.analyseRollResult(rolls[0])
            const outcome = OpposedRollHandler.computeOutcome({
              attackerResult,
              defenderResult: opposed.resultAnalysis,
              attackerTotal: rolls[0].total,
              defenderTotal: opposed.total,
              attackerProduct: rolls[0].product,
            })

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
                  difficulty: opposed.total,
                  isSuccess: outcome.isSuccess,
                  isFailure: outcome.isFailure,
                  needsOppositeRoll: false,
                  opposeActorId: opposed.actorId,
                  opposeHasLuckyPoints: opposed.hasLuckyPoints,
                }
              })
              rolls[0].options.targetResults = newTargetResults
            } else {
              rolls[0].options.oppositeRoll = false
              rolls[0].options.difficulty = opposed.total
              rolls[0].options.opposeResult = opposed.resultStr
              rolls[0].options.opposeTooltip = opposed.tooltipStr
              newGlobalResult = { ...attackerResult, isSuccess: outcome.isSuccess, isFailure: outcome.isFailure, difficulty: opposed.total }
            }

            // Le jet est un succès : déclenche le jet de dommages lié
            if (outcome.isSuccess) {
              await OpposedRollHandler.triggerLinkedDamage({
                linkedRoll: message.system.linkedRoll,
                speaker: message.speaker,
                rollMode: rolls[0].options.rollMode,
                targetResults: hasTargetResults ? newTargetResults : undefined,
              })
            }

            // Gestion des custom effects
            const rowResultForEffect = { ...attackerResult, ...outcome }
            await OpposedRollHandler.applyEffects({
              customEffect: message.system.customEffect,
              additionalEffect: message.system.additionalEffect,
              result: rowResultForEffect,
              targetActor,
            })

            // Mise à jour du message de chat
            const updateData = { rolls }
            if (hasTargetResults) updateData["system.targetResults"] = newTargetResults
            else updateData["system.result"] = newGlobalResult

            await OpposedRollHandler.updateMessage({ message, updateData })
          })
        })
      }

      // Click sur le(s) bouton(s) de point de chance du défenseur (jet opposé)
      const opposeLuckyButtons = html.querySelectorAll(".lp-button-oppose-target")
      if (opposeLuckyButtons.length > 0) {
        opposeLuckyButtons.forEach((btn) => {
          const actorId = btn.dataset.actorId
          const defenderActor = actorId ? game.actors.get(actorId) : null
          if (!defenderActor || (!game.user.isGM && !defenderActor.isOwner)) return

          btn.addEventListener("click", async (event) => {
            event.preventDefault()
            event.stopPropagation()
            const messageId = event.currentTarget.closest(".message").dataset.messageId
            if (!messageId) return
            const message = game.messages.get(messageId)

            const targetUuid = event.currentTarget.dataset.targetUuid
            await OpposedRollHandler.spendDefenderLuckyPoint({ defenderActor, message, targetUuid })
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
      // Gestion des boutons d'application des dommages
      if ((game.settings.get("co2", "allowPlayersToModifyTargets") && this.parent.isAuthor) || game.user.isGM) {
        const damageCard = html.querySelector(".damage-card")
        if (!damageCard) return
        const total = parseInt(damageCard.dataset.total) || 0
        const actorId = damageCard.dataset.actorId
        const flavor = damageCard.querySelector(".attack-item-name")?.textContent || ""
        const targetList = html.querySelector(".apply-target-list")
        const applyBtn = html.querySelector(".apply-damage-btn")

        // --- Mode tabs: Ciblé / Sélectionné ---
        // Hook controlToken : mise à jour en direct de la liste "Sélectionné"
        let controlTokenHookId = null
        const rebuildDebounced = foundry.utils.debounce(() => this._rebuildSelectedTargets(targetList, total), 50)

        const registerControlTokenHook = () => {
          if (controlTokenHookId !== null) return
          controlTokenHookId = Hooks.on("controlToken", rebuildDebounced)
        }
        const unregisterControlTokenHook = () => {
          if (controlTokenHookId === null) return
          Hooks.off("controlToken", controlTokenHookId)
          controlTokenHookId = null
        }

        const modeBtns = html.querySelectorAll(".apply-mode-btn")
        modeBtns.forEach((btn) => {
          btn.addEventListener("click", (event) => {
            event.preventDefault()
            modeBtns.forEach((b) => b.classList.remove("active"))
            btn.classList.add("active")
            const mode = btn.dataset.mode
            if (targetList) {
              targetList.dataset.activeMode = mode
              if (mode === "selected") {
                this._rebuildSelectedTargets(targetList, total)
                registerControlTokenHook()
              } else {
                unregisterControlTokenHook()
                // Afficher les cibles du message, masquer les sélectionnées
                targetList.querySelectorAll(".apply-target-row").forEach((row) => {
                  row.style.display = row.dataset.source === "targeted" ? "" : "none"
                })
              }
            }
          })
        })

        // Si le mode initial est "selected" (pas de cibles ciblées), enregistrer le hook et construire la liste
        if (targetList?.dataset.activeMode === "selected") {
          this._rebuildSelectedTargets(targetList, total)
          registerControlTokenHook()
        }

        // --- Multiplier buttons ---
        html.querySelectorAll(".multiplier-btn").forEach((btn) => {
          btn.addEventListener("click", (event) => {
            event.preventDefault()
            const row = btn.closest(".apply-target-row")
            row.querySelectorAll(".multiplier-btn").forEach((b) => b.classList.remove("active"))
            btn.classList.add("active")
            const multiplier = parseFloat(btn.dataset.multiplier)
            const drCheckbox = row.querySelector(".target-dr")
            const drChecked = drCheckbox?.checked ?? true
            const targetDr = parseInt(row.dataset.targetDr) || 0
            const dmgDisplay = row.querySelector(".target-damage")
            if (dmgDisplay) {
              ActionMessageData.updateDamageDisplay(dmgDisplay, total, multiplier, drChecked, targetDr)
            }
          })
        })

        // --- DR checkboxes ---
        html.querySelectorAll(".target-dr").forEach((checkbox) => {
          checkbox.addEventListener("change", () => {
            const row = checkbox.closest(".apply-target-row")
            const activeBtn = row.querySelector(".multiplier-btn.active")
            const multiplier = activeBtn ? parseFloat(activeBtn.dataset.multiplier) : 1
            const targetDr = parseInt(row.dataset.targetDr) || 0
            const dmgDisplay = row.querySelector(".target-damage")
            if (dmgDisplay) {
              ActionMessageData.updateDamageDisplay(dmgDisplay, total, multiplier, checkbox.checked, targetDr)
            }
          })
        })

        // --- Apply button ---
        if (applyBtn) {
          applyBtn.addEventListener("click", async (event) => {
            event.preventDefault()
            const tempDamage = html.querySelector("#tempDm")?.checked ?? false
            const rows = targetList.querySelectorAll(".apply-target-row")
            for (const row of rows) {
              if (row.style.display === "none") continue
              const targetUuid = row.dataset.targetUuid
              if (!targetUuid) continue
              const activeBtn = row.querySelector(".multiplier-btn.active")
              const multiplier = activeBtn ? parseFloat(activeBtn.dataset.multiplier) : 1
              if (multiplier === 0) continue

              let type
              if (multiplier === 2) type = "double"
              else if (multiplier === 0.5) type = "half"
              else if (multiplier < 0) type = "heal"
              else type = "full"

              const drCheckbox = row.querySelector(".target-dr")
              const drChecked = drCheckbox?.checked ?? true

              const targetActor = fromUuidSync(targetUuid)
              if (targetActor) {
                await Hitpoints.applyToSingleTarget({ targetActor, fromActor: actorId, source: flavor, type, amount: total, drChecked, tempDamage })
              }
            }

            // Persistance des choix (multiplicateurs et RD) pour les cibles issues du jet
            const message = this.parent
            const targetResults = foundry.utils.deepClone(message.system.targetResults ?? [])
            let changed = false
            for (const row of targetList.querySelectorAll('.apply-target-row[data-source="targeted"]')) {
              const uuid = row.dataset.targetUuid
              const activeBtn = row.querySelector(".multiplier-btn.active")
              const mult = activeBtn ? parseFloat(activeBtn.dataset.multiplier) : 1
              const drCheckbox = row.querySelector(".target-dr")
              const drChecked = drCheckbox?.checked ?? true
              const tr = targetResults.find((t) => t.uuid === uuid)
              if (tr) {
                if (tr.appliedMultiplier !== mult) {
                  tr.appliedMultiplier = mult
                  changed = true
                }
                if (tr.appliedDrChecked !== drChecked) {
                  tr.appliedDrChecked = drChecked
                  changed = true
                }
              }
            }
            if (changed) {
              if (game.user.isGM) {
                await message.update({ "system.targetResults": targetResults })
              } else {
                await game.users.activeGM.query("co2.updateTargetResults", { existingMessageId: message.id, targetResults })
              }
            }
          })
        }
      }
    }
  }

  /**
   * Met à jour l'affichage des dommages d'une cible en tenant compte du multiplicateur, de la RD et de son état coché.
   * @param {HTMLElement} dmgDisplay L'élément `.target-damage`
   * @param {number} total Total brut des dommages
   * @param {number} multiplier Multiplicateur actif (-1, 0, 0.5, 1, 2)
   * @param {boolean} drChecked La case RD est cochée
   * @param {number} targetDr Valeur de RD de la cible
   */
  static updateDamageDisplay(dmgDisplay, total, multiplier, drChecked, targetDr) {
    if (multiplier === 0) {
      dmgDisplay.textContent = "0"
    } else {
      let computed = Math.ceil(Math.abs(total * multiplier))
      if (drChecked) computed = Math.max(multiplier > 0 ? 1 : 0, computed - targetDr)
      dmgDisplay.textContent = multiplier < 0 ? `+${computed}` : `-${computed}`
    }
    dmgDisplay.dataset.multiplier = multiplier
  }

  /**
   * Reconstruit la liste des tokens sélectionnés (controlled) sur le canvas
   * @param {HTMLElement} targetList Conteneur de la liste des cibles
   * @param {number} total Montant total de dommages
   */
  _rebuildSelectedTargets(targetList, total) {
    // Supprimer les anciennes cibles "selected"
    targetList.querySelectorAll('.apply-target-row[data-source="selected"]').forEach((row) => row.remove())
    // Masquer les cibles "targeted"
    targetList.querySelectorAll('.apply-target-row[data-source="targeted"]').forEach((row) => (row.style.display = "none"))

    const targets = canvas.tokens?.controlled ?? []
    if (targets.length === 0) {
      const emptyRow = document.createElement("div")
      emptyRow.classList.add("apply-target-row", "apply-empty-row")
      emptyRow.dataset.source = "selected"
      emptyRow.innerHTML = `<span class="target-name empty-message">${game.i18n.localize("CO.notif.warningApplyDamageNoTarget")}</span>`
      targetList.appendChild(emptyRow)
      return
    }

    for (const target of targets) {
      const actor = target.actor
      if (!actor) continue
      const row = document.createElement("div")
      row.classList.add("apply-target-row")
      row.dataset.targetUuid = actor.uuid
      row.dataset.source = "selected"
      const targetDr = actor.system?.combat?.dr?.value ?? 0
      row.dataset.targetDr = targetDr

      const img = target.document?.texture?.src ?? actor.img
      const drLabel = game.i18n.localize("CO.ui.dr")
      const drTooltip = game.i18n.localize("CO.ui.drText")
      const initialDamage = Math.max(1, total - targetDr)
      row.innerHTML = `
        <div class="target-info">
          ${img ? `<img class="target-portrait" src="${img}" alt="${actor.name}" height="28" width="28" />` : ""}
          <span class="target-name">${actor.name}</span>
          <label class="target-dr-label" data-tooltip="${drTooltip}" data-tooltip-direction="UP">
            ${drLabel}
            <input type="checkbox" class="target-dr" checked />
          </label>
          <span class="target-damage" data-multiplier="1">-${initialDamage}</span>
        </div>
        <div class="target-controls">
          <span class="multiplier-label">&times;</span>
          <div class="damage-multipliers">
            <button type="button" class="multiplier-btn" data-multiplier="-1" data-tooltip="${game.i18n.localize("CO.ui.applyHealing")}" data-tooltip-direction="UP">-1</button>
            <button type="button" class="multiplier-btn" data-multiplier="0" data-tooltip="${game.i18n.localize("CO.ui.noDamage")}" data-tooltip-direction="UP">0</button>
            <button type="button" class="multiplier-btn" data-multiplier="0.5" data-tooltip="${game.i18n.localize("CO.ui.applyHalfDamage")}" data-tooltip-direction="UP">&frac12;</button>
            <button type="button" class="multiplier-btn active" data-multiplier="1" data-tooltip="${game.i18n.localize("CO.ui.applyDamage")}" data-tooltip-direction="UP">1</button>
            <button type="button" class="multiplier-btn" data-multiplier="2" data-tooltip="${game.i18n.localize("CO.ui.applyDoubleDamage")}" data-tooltip-direction="UP">2</button>
          </div>
        </div>
      `
      targetList.appendChild(row)

      // Ajouter les listeners de multiplicateur et de RD pour les nouvelles lignes
      row.querySelectorAll(".multiplier-btn").forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.preventDefault()
          row.querySelectorAll(".multiplier-btn").forEach((b) => b.classList.remove("active"))
          btn.classList.add("active")
          const multiplier = parseFloat(btn.dataset.multiplier)
          const drCheckbox = row.querySelector(".target-dr")
          const drChecked = drCheckbox?.checked ?? true
          const dmgDisplay = row.querySelector(".target-damage")
          if (dmgDisplay) {
            ActionMessageData.updateDamageDisplay(dmgDisplay, total, multiplier, drChecked, targetDr)
          }
        })
      })

      const drCheckbox = row.querySelector(".target-dr")
      if (drCheckbox) {
        drCheckbox.addEventListener("change", () => {
          const activeBtn = row.querySelector(".multiplier-btn.active")
          const multiplier = activeBtn ? parseFloat(activeBtn.dataset.multiplier) : 1
          const dmgDisplay = row.querySelector(".target-damage")
          if (dmgDisplay) {
            ActionMessageData.updateDamageDisplay(dmgDisplay, total, multiplier, drCheckbox.checked, targetDr)
          }
        })
      }
    }
  }
}

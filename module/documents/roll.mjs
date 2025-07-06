import Utils from "../utils.mjs"
export class CORoll extends Roll {
  static ROLL_TYPE = "standard"

  /** @override  */
  async render({ flavor, template = this.constructor.CHAT_TEMPLATE, isPrivate = false } = {}) {
    if (!this._evaluated) await this.evaluate({ allowInteractive: !isPrivate })
    const chatData = await this._getChatCardData(flavor, isPrivate)
    return foundry.applications.handlebars.renderTemplate(template, chatData)
  }

  async _getChatCardData(flavor, isPrivate) {
    return {
      formula: isPrivate ? "???" : this.formula,
      flavor: isPrivate ? null : (flavor ?? this.options.flavor),
      user: game.user.id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
    }
  }

  /**
   * Fonction qui va analyser les valeurs du jet de dé et indiquer s'il s'agit d'un succes ou non ainsi que les infos
   * @param {*} roll
   * @returns { diceResult, total, isCritical, isFumble, difficulty, isSuccess, isFailure }
   */
  static analyseRollResult(roll) {
    let result = {}
    if ((roll instanceof COAttackRoll && roll.options.type === "attack") || roll instanceof COSkillRoll) {
      // On récupère le résultat du dé conservé
      const diceResult = roll.terms[0].results.find((r) => r.active).result
      const total = Math.ceil(roll.total)
      const isCritical = diceResult >= roll.options.critical
      const isFumble = diceResult === 1
      let difficulty = roll.options.difficulty
      let isSuccess
      let isFailure
      // Si on utilise une difficulté et qu'elle a été définie
      // Si elle n'est pas saisie dans la fenêtre de dialogue, difficulty vaut ""
      if (roll.options.useDifficulty && difficulty && difficulty !== "") {
        if (!roll.options.oppositeRoll) {
          if (typeof difficulty === "string") {
            difficulty = parseInt(difficulty)
          }
          isSuccess = roll.total >= difficulty
          isFailure = roll.total < difficulty
        }
      }
      result = { diceResult, total, isCritical, isFumble, difficulty, isSuccess, isFailure }
    }
    return result
  }
}

export class COSkillRoll extends CORoll {
  static ROLL_TYPE = "skill"

  static DIALOG_TEMPLATE = "systems/co/templates/dialogs/skill-roll-dialog.hbs"

  static CHAT_TEMPLATE = "systems/co/templates/chat/skill-roll-card.hbs"

  static ROLL_CSS = ["co", "skill-roll"]

  /**
   * Affiche une boîte de dialogue pour lancer un jet de compétence et retourne le résultat du jet.
   *
   * @param {Object} dialogContext Le contexte de la boîte de dialogue, contenant des informations comme l'acteur et le label.
   * @param {Object} [options={}] Options supplémentaires pour le jet de compétence. Options.withDialog
   * @returns {Promise<Object|null>} Le résultat du jet de compétence ou null si la boîte de dialogue a été annulée.
   *
   * @example
   * const dialogContext = {
   *   label: "Roll for Initiative",
   *   actor: someActor
   * };
   * const roll = await COSkillRoll.prompt(dialogContext);
   * if (roll) {
   *   console.log("Roll result:", roll.total);
   * }
   */
  static async prompt(dialogContext, options = {}) {
    const withDialog = options.withDialog ?? true
    let formula
    let rollContext

    if (withDialog) {
      const content = await foundry.applications.handlebars.renderTemplate(this.DIALOG_TEMPLATE, dialogContext)

      rollContext = await foundry.applications.api.DialogV2.wait({
        window: { title: dialogContext.title },
        position: { width: 800 },
        classes: this.ROLL_CSS,
        content,
        rejectClose: false,
        buttons: [
          {
            action: "ok",
            label: game.i18n.localize("CO.ui.submit"),
            icon: "fas fa-check",
            default: true,
            callback: (event, button, dialog) => {
              if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COSkillRoll prompt - Callback`), event, button, dialog)
              const output = Array.from(button.form.elements).reduce((obj, input) => {
                if (input.name) obj[input.name] = input.value
                return obj
              }, {})
              if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COSkillRoll prompt - Output`), output)
              /* 
                {
                    "rollMode": "publicroll",
                    "dice": "1d20",
                    "formula": "2d20kl+3",
                    "bonus": "+0",
                    "malus": "+0",
                    "totalSkillBonuses": "0",
                    "difficulty": "",
                    "critical": "20"
                }
              */
              return output
            },
          },
          {
            action: "cancel",
            label: game.i18n.localize("CO.ui.cancel"),
            icon: "fas fa-times",
            callback: () => false,
          },
        ],
        render: (event, dialog) => {
          const inputs = dialog.element.querySelectorAll(".bonus-item")
          if (inputs) {
            inputs.forEach((input) => {
              input.addEventListener("click", this._onToggleCheckSkillBonus.bind(this))
            })
          }
          const radios = dialog.element.querySelectorAll('input[name="dice"]')
          radios.forEach((radio) => {
            radio.addEventListener("change", (event) => {
              event.preventDefault()
              event.stopPropagation()
              let newFormula
              switch (event.target.value) {
                case "standard":
                  newFormula = `1d20+${dialogContext.skillValue}`
                  break
                case "bonus":
                  newFormula = `2d20kh+${dialogContext.skillValue}`
                  break
                case "malus":
                  newFormula = `2d20kl+${dialogContext.skillValue}`
                  break
              }
              dialog.element.querySelector('input[name="formula"]').value = newFormula
            })
          })
        },
      })

      if (!rollContext) return
      rollContext.label = dialogContext.label
      if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COSkillRoll - rollContext`), rollContext)

      formula = `${rollContext.formula}`
      if (parseInt(rollContext.bonus) > 0) formula += `+${parseInt(rollContext.bonus)}`
      if (parseInt(rollContext.malus) > 0) formula += `-${parseInt(rollContext.malus)}`
      if (parseInt(rollContext.totalSkillBonuses) !== 0) formula += `+${parseInt(rollContext.totalSkillBonuses)}`
    }
    // Pas de prompt
    else {
      let dice = dialogContext.dice
      if (dice === "1d20" && dialogContext.superior) dice = "2d20kh"
      formula = `${dice}+${parseInt(dialogContext.skillValue)}`
      if (parseInt(dialogContext.bonus) !== 0) formula += `+${parseInt(dialogContext.bonus)}`
      if (parseInt(dialogContext.malus) !== 0) formula += `+${parseInt(dialogContext.malus)}`
      if (parseInt(dialogContext.totalSkillBonuses) !== 0) formula += `+${parseInt(dialogContext.totalSkillBonuses)}`
    }

    formula = Utils.evaluateFormulaCustomValues(dialogContext.actor, formula)

    const roll = new this(formula, dialogContext.actor.getRollData())
    await roll.evaluate()

    const toolTip = await roll.getTooltip()
    roll.options = {
      actorId: dialogContext.actor.id,
      rollMode: withDialog ? rollContext.rollMode : dialogContext.rollMode,
      flavor: dialogContext.flavor,
      bonus: withDialog ? rollContext.bonus : dialogContext.bonus,
      malus: withDialog ? rollContext.malus : dialogContext.malus,
      critical: withDialog ? rollContext.critical : dialogContext.critical,
      oppositeRoll: withDialog ? rollContext.difficulty?.includes("@oppose") : dialogContext.oppositeRoll.includes("@oppose"),
      oppositeTarget: dialogContext.targets?.length > 0 ? dialogContext.targets[0].uuid : null,
      oppositeValue: withDialog ? rollContext.difficulty : dialogContext.difficulty,
      hasLuckyPoints: withDialog ? rollContext.hasLuckyPoints === "true" : dialogContext.hasLuckyPoints,
      useDifficulty: dialogContext.useDifficulty,
      showDifficulty: dialogContext.showDifficulty,
      difficulty: withDialog ? rollContext.difficulty : dialogContext.difficulty,
      toolTip,
      ...options,
    }

    if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COSkillRoll - roll`), roll)
    return roll
  }

  static _onToggleCheckSkillBonus(event) {
    let item = event.currentTarget.closest(".bonus-item")
    item.classList.toggle("checked")
    let total = this._calculateTotalSkillBonus(event)
    document.querySelector("#totalSkillBonuses").value = total
  }

  static _calculateTotalSkillBonus(event) {
    let parent = event.currentTarget.closest(".skill-bonuses")
    const skillBonuses = Array.from(parent.querySelectorAll(".bonus-item.checked"))
    let total = skillBonuses.reduce((acc, curr) => acc + parseInt(curr.dataset.value), 0)
    return total
  }

  async _getChatCardData(flavor, isPrivate) {
    const rollResults = CORoll.analyseRollResult(this)
    return {
      actor: this.options.actor,
      speaker: ChatMessage.getSpeaker({ actor: this.options.actor, scene: canvas.scene }),
      flavor: this.options.flavor,
      formula: isPrivate ? "???" : this.formula,
      useDifficulty: this.options.useDifficulty,
      showDifficulty: this.options.showDifficulty,
      difficulty: rollResults.difficulty,
      isCritical: rollResults.isCritical,
      isFumble: rollResults.isFumble,
      isSuccess: rollResults.isSuccess,
      isFailure: rollResults.isFailure,
      hasLuckyPoints: this.options.hasLuckyPoints,
      total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      user: game.user.id,
    }
  }
}

export class COAttackRoll extends CORoll {
  static ROLL_TYPE = "attack"

  static DIALOG_TEMPLATE = "systems/co/templates/dialogs/attack-roll-dialog.hbs"

  static CHAT_TEMPLATE = "systems/co/templates/chat/attack-roll-card.hbs"

  static ROLL_CSS = ["co", "attack-roll"]

  static async prompt(dialogContext, options = {}) {
    const withDialog = options.withDialog ?? true
    // Le résultat est un jet d'attaque ou un jet d'attaque et un jet de dommages
    let rolls = []
    let rollContext

    if (withDialog) {
      const content = await foundry.applications.handlebars.renderTemplate(this.DIALOG_TEMPLATE, dialogContext)

      rollContext = await foundry.applications.api.DialogV2.wait({
        window: { title: dialogContext.title },
        position: { width: 700 },
        classes: this.ROLL_CSS,
        content,
        rejectClose: false,
        buttons: [
          {
            action: "ok",
            label: game.i18n.localize("CO.ui.submit"),
            icon: "fas fa-check",
            default: true,
            callback: (event, button, dialog) => {
              if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COAttackRoll prompt - Callback`), event, button, dialog)
              const output = Array.from(button.form.elements).reduce((obj, input) => {
                if (input.name) {
                  if (input.type === "checkbox") {
                    obj[input.name] = input.checked
                  } else if (input.type === "radio") {
                    // Only store the value if this radio button is checked
                    if (input.checked) {
                      obj[input.name] = input.value
                    }
                  } else {
                    obj[input.name] = input.value
                  }
                }
                return obj
              }, {})
              if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COAttackRoll prompt - Output`), output)
              /* Output exemple
                {
                    "rollMode": "publicroll",
                    "dice": "bonus",
                    "formulaAttack": "1d20 + 13",
                    "difficulty": "17",
                    "critical": "20",
                    "skillBonus": "0",
                    "skillMalus": "-3",
                    "formulaDamage": "(1d3+1)+1d4°",
                    "damageBonus": "0",
                    "damageMalus": "0",
                    "tempDamage": true,
                    "tactical": "violent",
                    "flavor": "Mains nues "
                }
              */
              return output
            },
          },
          {
            action: "cancel",
            label: game.i18n.localize("CO.ui.cancel"),
            icon: "fas fa-times",
            callback: () => false,
          },
        ],
        render: (event, dialog) => {
          const radios = dialog.element.querySelectorAll('input[name="dice"]')
          radios.forEach((radio) => {
            radio.addEventListener("change", (event) => {
              event.preventDefault()
              event.stopPropagation()
              let newFormula
              switch (event.target.value) {
                case "standard":
                  newFormula = `1d20+${dialogContext.initialSkillFormula}`
                  break
                case "bonus":
                  newFormula = `2d20kh+${dialogContext.initialSkillFormula}`
                  break
                case "malus":
                  newFormula = `2d20kl+${dialogContext.initialSkillFormula}`
                  break
              }
              dialog.element.querySelector('input[name="formulaAttack"]').value = newFormula
            })
          })
          // Options tactiques
          const radiosTactical = dialog.element.querySelectorAll('input[name="tactical"]')
          radiosTactical.forEach((radio) => {
            radio.addEventListener("change", (event) => {
              event.preventDefault()
              event.stopPropagation()
              let newBonus
              let newDamage
              let newMalus
              switch (event.target.value) {
                case "none":
                  newBonus = `${dialogContext.skillBonus}`
                  newDamage = `${dialogContext.formulaDamage}`
                  newMalus = `${dialogContext.skillMalus}`
                  break
                case "confident":
                  newBonus = `${dialogContext.skillBonus + 5}`
                  newDamage = `(${dialogContext.formulaDamage})/2`
                  newMalus = `${dialogContext.skillMalus}`
                  break
                case "precise":
                  newBonus = `${dialogContext.skillBonus}`
                  newDamage = `(${dialogContext.formulaDamage})+1d4°`
                  newMalus = `${dialogContext.skillMalus - 3}`
                  break
                case "violent":
                  newBonus = `${dialogContext.skillBonus}`
                  newDamage = `(${dialogContext.formulaDamage})+2d4°`
                  newMalus = `${dialogContext.skillMalus - 7}`
                  break
              }
              dialog.element.querySelector('input[name="skillBonus"]').value = newBonus
              dialog.element.querySelector('input[name="formulaDamage"]').value = newDamage
              dialog.element.querySelector('input[name="skillMalus"]').value = newMalus
            })
          })
          // Dommages temporaires
          const tempDamageCb = dialog.element.querySelector('input[name="tempDamage"]')
          const radioButtons = dialog.element.querySelectorAll('input[type="radio"]')
          if (tempDamageCb && radioButtons.length > 0) {
            tempDamageCb.addEventListener("click", this._onCheckTempDamage.bind(this))
          }
        },
      })

      if (!rollContext) return

      rollContext.flavor = dialogContext.flavor
      if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COAttackRoll - rollContext`), rollContext)
    }

    if (dialogContext.type === "attack") {
      const formula = withDialog
        ? Utils.evaluateFormulaCustomValues(dialogContext.actor, `${rollContext.formulaAttack}+${rollContext.skillBonus}+${rollContext.skillMalus}`)
        : Utils.evaluateFormulaCustomValues(dialogContext.actor, `${dialogContext.formulaAttack}+${dialogContext.skillBonus}+${dialogContext.skillMalus}`)

      const roll = new this(formula, dialogContext.actor.getRollData())
      await roll.evaluate()
      const tooltip = await roll.getTooltip()
      roll.options = {
        actorId: dialogContext.actor.id,
        type: dialogContext.type,
        flavor: dialogContext.flavor,
        dice: withDialog ? rollContext.dice : dialogContext.dice,
        formulaAttack: withDialog ? rollContext.formulaAttack : dialogContext.formulaAttack,
        skillBonus: withDialog ? rollContext.skillBonus : dialogContext.skillBonus,
        skillMalus: withDialog ? rollContext.skillMalus : dialogContext.skillMalus,
        formulaDamage: withDialog ? rollContext.formulaDamage : dialogContext.formulaDamage,
        damageBonus: withDialog ? rollContext.damageBonus : dialogContext.damageBonus,
        damageMalus: withDialog ? rollContext.damageMalus : dialogContext.damageMalus,
        critical: withDialog ? rollContext.critical : dialogContext.critical,
        oppositeRoll: withDialog ? rollContext.difficulty?.includes("@oppose") : dialogContext.oppositeRoll.includes("@oppose"),
        oppositeTarget: dialogContext.targets?.length > 0 ? dialogContext.targets[0].uuid : null,
        oppositeValue: withDialog ? rollContext.difficulty : dialogContext.difficulty,
        hasLuckyPoints: dialogContext.hasLuckyPoints,
        useDifficulty: dialogContext.useDifficulty,
        showDifficulty: dialogContext.showDifficulty,
        difficulty: withDialog ? rollContext.difficulty : dialogContext.difficulty,
        tooltip,
        tempDamage: withDialog ? rollContext.tempDamage : dialogContext.tempDamage,
        tactical: withDialog ? rollContext.tactical : dialogContext.tactical,
        ...options,
      }

      rolls.push(roll)

      // Jet de dommages si l'option Jet combiné est activée
      if (dialogContext.useComboRolls) {
        const damageFormula = withDialog
          ? Utils.evaluateFormulaCustomValues(dialogContext.actor, `${rollContext.formulaDamage}+${rollContext.damageBonus}-${rollContext.damageMalus}`)
          : Utils.evaluateFormulaCustomValues(dialogContext.actor, `${dialogContext.formulaDamage}+${dialogContext.damageBonus}-${dialogContext.damageMalus}`)

        if (damageFormula !== "0" && damageFormula !== "") {
          const damageRoll = new this(damageFormula, dialogContext.actor.getRollData())
          await damageRoll.evaluate()
          const damageRollTooltip = await damageRoll.getTooltip()
          damageRoll.options = {
            type: "damage",
            flavor: dialogContext.flavor,
            tooltip: damageRollTooltip,
            formulaDamage: damageFormula,
            tempDamage: rollContext.tempDamage,
            ...options,
          }
          rolls.push(damageRoll)
        }
      }
    } else if (dialogContext.type === "damage") {
      const formula = withDialog
        ? Utils.evaluateFormulaCustomValues(dialogContext.actor, `${rollContext.formulaDamage}+${rollContext.damageBonus}-${rollContext.damageMalus}`)
        : Utils.evaluateFormulaCustomValues(dialogContext.actor, `${dialogContext.formulaDamage}+${dialogContext.damageBonus}-${dialogContext.damageMalus}`)
      const roll = new this(formula, dialogContext.actor.getRollData())
      await roll.evaluate()

      const tooltip = await roll.getTooltip()
      roll.options = {
        type: dialogContext.type,
        flavor: dialogContext.flavor,
        actor: dialogContext.actor,
        tooltip: tooltip,
        formulaDamage: formula,
        tempDamage: rollContext.tempDamage,
        ...options,
      }
      rolls.push(roll)
    }

    if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COAttackRoll - rolls`), rolls)
    return rolls
  }

  async _getChatCardData(flavor, isPrivate) {
    const rollResults = CORoll.analyseRollResult(this)
    if (CONFIG.debug.co?.chat) console.debug(Utils.log(`COAttackRoll - _getChatCardData options`), this.options)

    // Type de jet
    const hasDice = this.options.dice === "bonus" || this.options.dice === "malus"
    // Libellé du type de jet
    let diceType = ""
    if (hasDice) {
      switch (this.options.dice) {
        case "bonus":
          diceType = game.i18n.localize("CO.ui.rollBonus")
          break
        case "malus":
          diceType = game.i18n.localize("CO.ui.rollMalus")
          break
      }
    }

    // Option tactique
    const hasTactical = this.options.tactical !== "none"
    // Libellé de l'option tactique
    let tactical = ""
    if (hasTactical) {
      switch (this.options.tactical) {
        case "confident":
          tactical = game.i18n.localize("CO.ui.tactiqueAssuree")
          break
        case "precise":
          tactical = game.i18n.localize("CO.ui.tactiquePrecise")
          break
        case "violent":
          tactical = game.i18n.localize("CO.ui.tactiqueViolente")
          break
      }
    }

    return {
      type: this.options.type,
      actor: this.options.actor,
      speaker: ChatMessage.getSpeaker({ actor: this.options.actor, scene: canvas.scene }),
      flavor: `${this.options.flavor} - ${this.options.type === "attack" ? "Attaque" : "Dommages"}`,
      hasDice,
      diceType,
      formula: isPrivate ? "???" : this.formula,
      useDifficulty: this.options.useDifficulty,
      showDifficulty: this.options.showDifficulty,
      oppositeRoll: this.options.oppositeRoll,
      oppositeTarget: this.options.oppositeTarget,
      oppositeValue: this.options.difficulty,
      hasLuckyPoints: this.options.hasLuckyPoints,
      difficulty: rollResults.difficulty,
      isCritical: rollResults.isCritical,
      isFumble: rollResults.isFumble,
      isSuccess: rollResults.isSuccess,
      isFailure: rollResults.isFailure,
      total: isPrivate ? "?" : Math.ceil(this.total),
      tooltip: isPrivate ? "" : this.options.tooltip,
      user: game.user.id,
      tempDamage: this.options.tempDamage,
      hasTactical,
      tactical,
    }
  }

  /**
   * Evènement déclenché lorsque l'on coche/décoche la case à cocher Dommages temporaires
   * Si on coche alors que l'arme ne propose pas l'option de dégat temporaire on met le Dé en dé malus
   * Par contre on ne peux pas faire l'inverse car si le dé était déjà un dé malus avant on lui donnerais un dé standard
   * à la place ce qui n'est pas souhaitable
   * @param {*} event évènement déclenché par le click
   * @param {*} dialogContext Context de la fenetre avec son ensemble d'éléments
   */
  static _onCheckTempDamage(event, dialogContext) {
    let checked = event.target.checked
    let canBeTempDamage = event.target.dataset.canbetempdamage
    if (checked === true && canBeTempDamage === "false") {
      let radio = document.getElementById("diceMalus")
      radio.checked = true
      // Créer et déclencher un événement change
      const changeEvent = new Event("change", {
        bubbles: true, // Permet à l'événement de remonter dans le DOM
        cancelable: true,
      })

      radio.dispatchEvent(changeEvent)
    }
  }
}

import Utils from "../utils.mjs"
export class CORoll extends Roll {
  static ROLL_TYPE = "standard"

  /** @override  */
  async render({ flavor, template = this.constructor.CHAT_TEMPLATE, isPrivate = false } = {}) {
    if (!this._evaluated) await this.evaluate({ allowInteractive: !isPrivate })
    const chatData = await this._getChatCardData(flavor, isPrivate)
    return renderTemplate(template, chatData)
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

  static analyseRollResult(roll) {
    let result = {}
    if ((roll instanceof COAttackRoll && roll.options.type === "attack") || roll instanceof COSkillRoll) {
      // On récupère le résultat du dé conservé
      const diceResult = roll.terms[0].results.find((r) => r.active).result
      const total = roll.total
      const isCritical = diceResult >= roll.options.critical
      const isFumble = diceResult === 1
      let difficulty = roll.options.difficulty
      let isSuccess
      let isFailure
      // Si on utilise une difficulté et qu'elle a été définie
      // Si elle n'est pas saisie dans la fenêtre de dialogue, difficulty vaut ""
      if (roll.options.useDifficulty && roll.options.difficulty !== "") {
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
      const content = await renderTemplate(this.DIALOG_TEMPLATE, dialogContext)

      rollContext = await foundry.applications.api.DialogV2.wait({
        window: { title: dialogContext.title },
        position: { width: 600 },
        classes: this.ROLL_CSS,
        content,
        rejectClose: false,
        buttons: [
          {
            action: "cancel",
            label: game.i18n.localize("CO.ui.cancel"),
            icon: "fas fa-times",
            callback: () => false,
          },
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
                  "dice": "1d20",
                  "skillValue": "+4",
                  "critical": "20",
                  "bonus": "+0",
                  "malus": "+0",
                  "difficulty": "10",
                  "totalSkillBonuses": "0",
                  "label": "Test de compétence  Constitution"
              }
              */
              return output
            },
          },
        ],
        render: (event, dialog) => {
          const inputs = dialog.querySelectorAll(".bonus-item")
          if (inputs) {
            inputs.forEach((input) => {
              input.addEventListener("click", this._onToggleCheckSkillBonus.bind(this))
            })
          }
        },
      })

      if (!rollContext) return
      rollContext.label = dialogContext.label
      if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COSkillRoll - rollContext`), rollContext)

      formula = `${rollContext.dice}+${parseInt(rollContext.skillValue)}`
      if (parseInt(rollContext.bonus) !== 0) formula += `+${parseInt(rollContext.bonus)}`
      if (parseInt(rollContext.malus) !== 0) formula += `+${parseInt(rollContext.malus)}`
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
      oppositeRoll: withDialog ? rollContext.difficulty.includes("@opposite") : dialogContext.oppositeRoll.includes("@opposite"),
      oppositeTarget: dialogContext.targets?.length > 0 ? dialogContext.targets[0].uuid : null,
      oppositeValue: withDialog ? rollContext.difficulty : dialogContext.difficulty,
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
    console.log("COSkillRoll _getChatCardData options", this.options)
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
    // Le résultat est un jet d'attaque ou un jet d'attaque et un jet de dégâts
    let rolls = []
    let rollContext

    if (withDialog) {
      const content = await renderTemplate(this.DIALOG_TEMPLATE, dialogContext)

      rollContext = await foundry.applications.api.DialogV2.wait({
        window: { title: dialogContext.title },
        position: { width: "auto" },
        classes: this.ROLL_CSS,
        content,
        rejectClose: false,
        buttons: [
          {
            action: "cancel",
            label: game.i18n.localize("CO.ui.cancel"),
            icon: "fas fa-times",
            callback: () => false,
          },
          {
            action: "ok",
            label: game.i18n.localize("CO.ui.submit"),
            icon: "fas fa-check",
            default: true,
            callback: (event, button, dialog) => {
              if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COAttackRoll prompt - Callback`), event, button, dialog)
              const output = Array.from(button.form.elements).reduce((obj, input) => {
                if (input.name) obj[input.name] = input.value
                return obj
              }, {})
              if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COAttackRoll prompt - Output`), output)
              /* 
              {
                  "dice": "1d20",
                  "formulaAttack": "5",
                  "critical": "20",
                  "skillBonus": "",
                  "skillMalus": "",
                  "difficulty": "",
                  "formulaDamage": "1d8 + 4",
                  "damageBonus": "",
                  "damageMalus": "",
                  "label": "Epée longue Attaque simple"
              }
              */
              return output
            },
          },
        ],
        render: (event, dialog) => {
          const inputs = dialog.querySelectorAll(".bonus-item")
          if (inputs) {
            inputs.forEach((input) => {
              input.addEventListener("click", this._onToggleCheckSkillBonus.bind(this))
            })
          }
        },
      })

      if (!rollContext) return

      rollContext.flavor = dialogContext.flavor
      if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COAttackRoll - rollContext`), rollContext)
    }

    if (dialogContext.type === "attack") {
      const formula = withDialog
        ? Utils.evaluateFormulaCustomValues(dialogContext.actor, `${rollContext.dice}+${rollContext.formulaAttack}+${rollContext.skillBonus}-${rollContext.skillMalus}`)
        : Utils.evaluateFormulaCustomValues(dialogContext.actor, `${dialogContext.dice}+${dialogContext.formulaAttack}+${dialogContext.skillBonus}-${dialogContext.skillMalus}`)

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
        oppositeRoll: withDialog ? (rollContext.difficulty ?? "").includes("@opposite") : dialogContext.oppositeRoll.includes("@opposite"),
        oppositeTarget: (dialogContext.targets ?? []).length > 0 ? dialogContext.targets[0].uuid : null,
        oppositeValue: withDialog ? (rollContext.difficulty ?? 0) : dialogContext.difficulty,
        useDifficulty: dialogContext.useDifficulty,
        showDifficulty: dialogContext.showDifficulty,
        difficulty: withDialog ? rollContext.difficulty : dialogContext.difficulty,
        tooltip,
        ...options,
      }

      rolls.push(roll)

      // Jet de dégâts si l'option Jet combiné est activée
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
            ...options,
          }
          rolls.push(damageRoll)
        }
      }
    } else if (dialogContext.type === "damage") {
      const formula = `${rollContext.formulaDamage}`
      const roll = new this(formula, dialogContext.actor.getRollData())
      await roll.evaluate()

      const tooltip = await roll.getTooltip()
      roll.options = {
        type: dialogContext.type,
        flavor: dialogContext.flavor,
        actor: dialogContext.actor,
        tooltip,
        ...options,
      }
      rolls.push(roll)
    }

    if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`COAttackRoll - rolls`), rolls)
    return rolls
  }

  async _getChatCardData(flavor, isPrivate) {
    const rollResults = CORoll.analyseRollResult(this)
    console.log("COAttackRoll _getChatCardData options", this.options)
    return {
      type: this.options.type,
      actor: this.options.actor,
      speaker: ChatMessage.getSpeaker({ actor: this.options.actor, scene: canvas.scene }),
      flavor: `${this.options.flavor} - ${this.options.type === "attack" ? "Attaque" : "Dommages"}`,
      formula: isPrivate ? "???" : this.formula,
      useDifficulty: this.options.useDifficulty,
      showDifficulty: this.options.showDifficulty,
      oppositeRoll: this.options.oppositeRoll,
      oppositeTarget: this.options.oppositeTarget,
      oppositeValue: this.options.difficulty,
      difficulty: rollResults.difficulty,
      isCritical: rollResults.isCritical,
      isFumble: rollResults.isFumble,
      isSuccess: rollResults.isSuccess,
      isFailure: rollResults.isFailure,
      total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
      tooltip: isPrivate ? "" : this.options.tooltip,
      user: game.user.id,
    }
  }
}

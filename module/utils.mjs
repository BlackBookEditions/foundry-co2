import { SYSTEM } from "./config/system.mjs"

export default class Utils {
  static shortcutResolve(shortcut) {
    return shortcut.replace("@", "system.")
  }

  /**
   * Generates a tooltip string based on the provided name and value.
   *
   * @param {string} name The name to be included in the tooltip.
   * @param {number} value The value to be included in the tooltip.
   * @returns {string} "Nom : valeur " the formatted tooltip string if both name and value are valid, otherwise an empty string.
   */
  static getTooltip(name, value) {
    if (name !== "" && value !== 0) {
      return ` ${name} : ${value}`
    }
    return ""
  }

  static log(message) {
    return `${SYSTEM.SYSTEM_DESCRIPTION} | ${message}`
  }

  static getAbilityName(ability) {
    return game.i18n.localize(`CO.abilities.long.${ability}`)
  }

  /**
   * For an actor, evaluate the formula
   * @param {*} actor
   * @param {*} formula
   * @param {*} source The item source's UUID : used for the #rank
   * @param {boolean} toEvaluate
   * @returns {int} the formula's value
   */
  static evaluate(actor, formula, source, toEvaluate = false) {
    if (formula === "") return 0
    if (formula.includes("@")) return this._evaluateCustom(actor, formula, source, toEvaluate, false)
    const resultat = parseInt(formula)
    if (isNaN(resultat)) return 0
    return resultat
  }

  /**
   * For an actor, evaluate the formula
   * @param {*} actor
   * @param {*} formula
   * @param {*} source The item source's UUID : used for the #rank
   * @returns {string} the formula
   */
  static evaluateWithDice(actor, formula, source) {
    if (formula === "") return ""
    if (formula.includes("@")) return this._evaluateCustom(actor, formula, source, true, true)
    return formula
  }

  /**
   * Evaluate a custom value
   * Shortcuts : @for @str @dex @con @int @sag @wis @cha @atc @mel @atd @ran @atm @mag @def @niv @lvl @rang[+1,0,+1,0,0] @rank[+1,0,+1,0,0]
   * @param {*} actor
   * @param {string} formula
   * @param {UUID} source The item source's UUID : used for the #rank
   * @param {boolean} toEvaluate : true to evaluate the replaced formula
   * @param {boolean} withDice : true if there is dice in the formula ; if yes toEvaluate should be false
   * @returns {int} the modifier's value
   */
  static _evaluateCustom(actor, formula, source, toEvaluate, withDice) {
    let replacedFormula = formula
    const DSL = {
      "@for": "system.abilities.for.value",
      "@str": "system.abilities.for.value",
      "@agi": "system.abilities.agi.value",
      "@con": "system.abilities.con.value",
      "@int": "system.abilities.int.value",
      "@per": "system.abilities.per.value",
      "@wil": "system.abilities.vol.value",
      "@vol": "system.abilities.vol.value",
      "@cha": "system.abilities.cha.value",
      "@atc": "system.combat.melee.value",
      "@mel": "system.combat.melee.value",
      "@atd": "system.combat.ranged.value",
      "@ran": "system.combat.ranged.value",
      "@atm": "system.combat.magic.value",
      "@mag": "system.combat.magic.value",
      "@def": "system.combat.def.value",
      "@ini": "system.combat.init.value",
      "@niv": "system.attributes.level.base",
      "@lvl": "system.attributes.level.base",
    }

    // Shortcuts
    Object.keys(DSL).forEach((shortcut) => {
      if (replacedFormula.includes(shortcut)) {
        replacedFormula = replacedFormula.replace(shortcut, foundry.utils.getProperty(actor, DSL[shortcut]))
      }
    })

    /* Remplacer aussi des valeurs d'un toekn ciblé si c'est le cas */

    const CBL = {
      "@target.for": "system.abilities.for.base",
      "@target.str": "system.abilities.for.base",
      "@target.agi": "system.abilities.agi.base",
      "@target.con": "system.abilities.con.base",
      "@target.int": "system.abilities.int.base",
      "@target.per": "system.abilities.per.base",
      "@target.wil": "system.abilities.vol.base",
      "@target.vol": "system.abilities.vol.base",
      "@target.cha": "system.abilities.cha.base",
      "@target.atc": "system.combat.melee.base",
      "@target.mel": "system.combat.melee.base",
      "@target.atd": "system.combat.ranged.base",
      "@target.ran": "system.combat.ranged.base",
      "@target.atm": "system.combat.magic.base",
      "@target.mag": "system.combat.magic.base",
      "@target.ini": "system.combat.init.base",
      "@target.def": "system.combat.def.base",
      "@target.niv": "system.attributes.level.base",
      "@target.lvl": "system.attributes.level.base",
    }

    let targets = [...game.user.targets].length > 0 ? [...game.user.targets] : canvas.tokens.objects.children.filter((t) => t._controlled)
    if (targets.length !== 0) {
      Object.keys(CBL).forEach((shortcut) => {
        if (replacedFormula.includes(shortcut)) {
          let targetactorid = targets[0].document.actorId
          let targetactor = game.actors.get(targetactorid)
          let property = foundry.utils.getProperty(targetactor, CBL[shortcut])
          replacedFormula = replacedFormula.replace(shortcut, foundry.utils.getProperty(targetactor, CBL[shortcut]))
        }
      })
    } else {
      //Si on a pas ciblé ou si on ne trouve pas la cible
      Object.keys(CBL).forEach((shortcut) => {
        if (replacedFormula.includes(shortcut)) {
          replacedFormula = replacedFormula.replace(shortcut, "")
        }
      })
    }

    /**
     * Calculates the total rank based on a given formula and keyword.
     *
     * This function searches for a keyword within the provided formula and extracts
     * a list of ranks enclosed in square brackets. It then sums up the ranks up to
     * the current rank of the path associated with the actor's item source.
     *
     * @param {string} replacedFormula The formula string that may contain the keyword and ranks.
     * @param {string} keyword The keyword to search for within the formula.
     * @returns {string} - The updated formula with the total rank calculated and replaced.
     */
    function calculateTotalRank(replacedFormula, keyword) {
      if (replacedFormula.includes(keyword)) {
        let startRank = replacedFormula.substring(replacedFormula.indexOf(keyword))
        let extract = startRank.substring(startRank.indexOf("[") + 1, startRank.indexOf("]"))
        let ranks = extract.split(",")
        let itemSource = actor.items.get(source)
        const pathId = itemSource.system.path
        const path = actor.items.get(pathId)
        const rank = path.system.rank
        let total = 0
        if (rank) {
          for (let index = 0; index < rank; index++) {
            const element = ranks[index]
            let val = parseInt(element)
            if (val) total += val
          }
        }
        replacedFormula = replacedFormula.replace(`${keyword}[${extract}]`, total)
      }
      return replacedFormula
    }

    replacedFormula = calculateTotalRank(replacedFormula, "@rang")
    replacedFormula = calculateTotalRank(replacedFormula, "@rank")
    console.log(replacedFormula)
    // Remaining formula
    if (replacedFormula.includes("@")) {
      replacedFormula = replacedFormula.replace("@", "actor.system.")
    }
    console.log(replacedFormula)
    if (withDice) return replacedFormula
    else {
      if (toEvaluate) return eval(replacedFormula)
      else return replacedFormula
    }
  }
}

import Utils from "../../utils.mjs"
import { CoAttackCheck } from "../../system/roll.mjs"

/**
 * Resolver
 *
 * @class
 * @param {string} type The type of the action.
 * @param {number} skill The skill level required for the action.
 * @param {number} dmg The damage value of the action.
 */
export class Resolver extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      type: new fields.StringField({ required: true, initial: "auto" }),
      skill: new fields.ObjectField(),
      dmg: new fields.ObjectField(),
    }
  }

  get resolvers() {
    return {
      melee: function () {},
      ranged: function () {},
      heal: function () {},
      modifier: function () {},
      auto: function () {},
    }
  }

  resolve(actor, item, action, type) {
    if (this.type === "melee") {
      this.melee(actor, item, action, type)
      return true
    } else if (this.type === "auto") {
      this.auto(actor, item, action)
      return true
    }

    return false
  }

  async melee(actor, item, action, type) {
    const auto = false

    const itemName = item.name
    const actionName = action.label

    const skillFormula = this.skill.formula[0].part
    const crit = this.skill.crit    
    const diffToEvaluate = this.skill.difficulty.match("[0-9]{0,}[d|D][0-9]{1,}")
    let diff = ""
    if (diffToEvaluate) {
      diff = Utils.evaluateWithDice(actor, this.skill.difficulty, item.uuid)
    } else {
      diff = Utils.evaluate(actor, this.skill.difficulty, item.uuid, true)
    }
    const skillFormulaToEvaluate = !(skillFormula.match("[0-9]{0,}[d|D][0-9]{1,}")
    let skillFormulaEvaluated = skillFormulaToEvaluate ? Utils.evaluate(actor, skillFormula, item.uuid, true) : Utils.evaluateWithDice(actor, skillFormula, item.uuid)

    const damageFormula = this.dmg.formula[0].part
    const damageFormulaToEvaluate = !damageFormula.match("[0-9]{0,}[d|D][0-9]{1,}")
    let damageFormulaEvaluated = damageFormulaToEvaluate ? Utils.evaluate(actor, damageFormula, item.uuid, true) : Utils.evaluateWithDice(actor, damageFormula, item.uuid)

    new CoAttackCheck(actor, item).init({
      auto,
      type,
      itemName,
      actionName,
      skillFormula,
      skillFormulaToEvaluate,
      skillFormulaEvaluated,
      damageFormula,
      damageFormulaToEvaluate,
      damageFormulaEvaluated,
      crit,
      diff,
    })
  }

  async auto(actor, item, action) {
    const itemName = item.name
    const actionName = action.label
    const damageFormula = this.dmg.formula[0].part
    const auto = true
    const type = "damage"

    let damageFormulaEvaluated =
      damageFormula.match("[0-9]{0,}[d|D][0-9]{1,}") ? Utils.evaluateWithDice(actor, damageFormula, item.uuid) : Utils.evaluate(actor, damageFormula, item.uuid)
    new CoAttackCheck(actor, item).init({ auto, type, itemName, actionName, damageFormulaEvaluated })
  }
}

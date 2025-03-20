import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../utils.mjs"
import COActor from "../../documents/actor.mjs"

/**
 * Resolver
 *
 * @class
 * @param {string} type Le type d'action.
 * @param {number} skill Le niveau de skill requis pour l'action ? ou la formule de skill a utiliser (attaque)
 *  skill.difficulty skill.formula (array)
 * @param {number} dmg La valeur de dégâts ou de soin de l'action.
 * @param {string} target Le type de cible de l'action : self, character, encounter
 */
export class Resolver extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      type: new fields.StringField({ required: true, initial: "auto" }),
      bonusDiceAdd: new fields.BooleanField({ initial: false }),
      malusDiceAdd: new fields.BooleanField({ initial: false }),
      skill: new fields.ObjectField(),
      dmg: new fields.ObjectField(),
      target: new fields.SchemaField({
        type: new fields.StringField({ required: true, choices: SYSTEM.RESOLVER_TARGET, initial: SYSTEM.RESOLVER_TARGET.none.id }),
        number: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        scope: new fields.StringField({ required: true, choices: SYSTEM.RESOLVER_SCOPE, initial: SYSTEM.RESOLVER_SCOPE.all.id }),
      }),
    }
  }

  get resolvers() {
    return {
      melee: function () {},
      ranged: function () {},
      magical: function () {},
      heal: function () {},
      auto: function () {},
      consume: function () {},
    }
  }

  async resolve(actor, item, action, type) {
    switch (this.type) {
      case "melee":
      case "ranged":
      case "magical":
        return await this.attack(actor, item, action, type)
      case "auto":
        return await this.auto(actor, item, action)
      case "heal":
        return await this.heal(actor, item, action)
      case "consumable":
        return await this.consume(actor, item, action)
      default:
        return false
    }
  }

  /**
   * Resolver pour les actions de type Attaque
   * @param {COActor} actor : l'acteur pour lequel s'applique l'action
   * @param {COItem} item : la source de l'action
   * @param {Action} action : l'action
   * @param {("attack"|"damage")} type : type de resolver
   */
  async attack(actor, item, action, type) {
    if (CONFIG.debug.co?.resolvers) console.debug(Utils.log(`Resolver attack`), actor, item, action, type)

    let skillFormula = this.skill.formula
    skillFormula = Utils.evaluateFormulaCustomValues(actor, skillFormula, item.uuid)
    let skillFormulaEvaluated = Roll.replaceFormulaData(skillFormula, actor.getRollData())
    const skillFormulaTooltip = this.skill.formula

    let damageFormula = this.dmg.formula
    damageFormula = Utils.evaluateFormulaCustomValues(actor, damageFormula, item.uuid)
    let damageFormulaEvaluated = Roll.replaceFormulaData(damageFormula, actor.getRollData())
    const damageFormulaTooltip = this.dmg.formula
    console.log("ce resolver", this)
    console.log("bonusDice", this.bonusDiceAdd)
    console.log("malusDice", this.malusDiceAdd)
    const result = await actor.rollAttack(item, {
      auto: false,
      type,
      actionName: action.label,
      chatFlavor: action.chatFlavor,
      skillFormula: skillFormulaEvaluated,
      damageFormula: damageFormulaEvaluated,
      skillFormulaTooltip,
      damageFormulaTooltip,
      critical: this.skill.crit,
      difficulty: this.skill.difficulty,
      bonusDice: this.bonusDiceAdd === true ? 1 : 0,
      malusDice: this.malusDiceAdd === true ? 1 : 0,
    })

    if (result === null) return false
    return true
  }

  /**
   * Resolver pour les actions de type Attaque automatique
   * @param {COActor} actor : l'acteur pour lequel s'applique l'action
   * @param {COItem} item : la source de l'action
   * @param {Action} action : l'action
   */
  async auto(actor, item, action) {
    if (CONFIG.debug.co?.resolvers) console.debug(Utils.log(`Resolver auto`), actor, item, action)

    let damageFormula = this.dmg.formula
    damageFormula = Utils.evaluateFormulaCustomValues(actor, damageFormula, item.uuid)
    let damageFormulaEvaluated = Roll.replaceFormulaData(damageFormula, actor.getRollData())
    const damageFormulaTooltip = this.dmg.formula
    const result = await actor.rollAttack(item, {
      auto: true,
      type: "damage",
      actionName: action.label,
      damageFormula: damageFormulaEvaluated,
      damageFormulaTooltip,
      bonusDice: this.bonusDiceAdd === true ? 1 : 0,
      malusDice: this.malusDiceAdd === true ? 1 : 0,
    })
    if (result === null) return false
    return true
  }

  /**
   * Resolver pour les actions de type Soin
   * @param {COActor} actor : l'acteur pour lequel s'applique l'action
   * @param {COItem} item : la source de l'action
   * @param {Action} action : l'action.
   */
  async heal(actor, item, action) {
    if (CONFIG.debug.co?.resolvers) console.debug(Utils.log(`Resolver heal`), actor, item, action)

    let healFormula = this.skill.formula
    healFormula = Utils.evaluateFormulaCustomValues(actor, healFormula)
    let healFormulaEvaluated = Roll.replaceFormulaData(healFormula, actor.getRollData())

    const targets = actor.acquireTargets(this.target.type, this.target.scope, action)
    if (CONFIG.debug.co?.resolvers) console.debug(Utils.log("Heal Targets", targets))

    await actor.rollHeal(item, { actionName: action.label, healFormula: healFormulaEvaluated, targetType: this.target.type, targets: targets })
    return true
  }

  /**
   * Resolver pour les actions de type Consommer. Va simplement consommer un item
   * @param {COActor} actor : l'acteur pour lequel s'applique l'action
   * @param {COItem} item : la source de l'action
   * @param {Action} action : l'action.
   */
  async consume(actor, item, action) {
    let quantity = item.system.quantity.current - 1
    if (quantity === 0 && item.system.quantity.destroyIfEmpty) {
      await actor.deleteEmbeddedDocuments("Item", [item.id])
    } else {
      await item.update({ "system.quantity.current": quantity })
    }
    return true
  }
}

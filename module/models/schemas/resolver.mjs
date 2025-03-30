import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../utils.mjs"
import COActor from "../../documents/actor.mjs"
import { CustomEffectData } from "./custom-effect.mjs"
import { handleSocketEvent } from "../../socket.mjs"

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
      additionalEffect: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        applyOn: new fields.StringField({ required: true, choices: SYSTEM.RESOLVER_RESULT, initial: SYSTEM.RESOLVER_RESULT.success.id }),
        statuses: new fields.StringField(),
        duration: new fields.StringField({ required: true, nullable: false, initial: "0" }),
        unit: new fields.StringField({ required: true, choices: SYSTEM.COMBAT_UNITE, initial: "round" }),
        formula: new fields.StringField({ required: false }),
        elementType: new fields.StringField({ required: false }),
        applyBuff: new fields.BooleanField({ initial: false }),
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
      buffDebuff: function () {},
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
      case "buffDebuff":
        return await this.buffDebuff(actor, item, action)

      default:
        return false
    }
  }

  /**
   * On va déterminer comment gérer les effets selon les cibles
   * @param {COActor} actor
   * @param {COItem} item
   * @param {Action} action
   */
  async manageAdditionalEffect(actor, item, action) {
    if (!game.combat) {
      ui.notifications.warn("Pas de combat en cours !")
      return false // Si pas de combat, pas d'effet sur la durée
    }
    // Evaluation de la durée si besoin
    let durationResult = Utils.evaluateFormulaCustomValues(actor, this.additionalEffect.duration)
    durationResult = Roll.replaceFormulaData(durationResult, actor.getRollData())
    console.log("duration", durationResult)
    if (/[+\-*/%]/.test(durationResult) === true) durationResult = eval(durationResult)
    console.log("duration", durationResult)

    // Conception de l'effet
    const ce = new CustomEffectData({
      nom: item.name,
      source: item.uuid,
      slug: item.name.slugify(),
      statuses: this.additionalEffect.statuses,
      unit: this.additionalEffect.unit,
      duration: parseInt(durationResult),
      formula: this.additionalEffect.formula,
      elementType: this.additionalEffect.elementType,
      effectType: SYSTEM.CUSTOM_EFFECT.status.id,
      startedAt: game.combat.round,
      remainingDuration: this.additionalEffect.duration,
    })

    if (this.additionalEffect.formula && this.additionalEffect.formula !== "0" && this.additionalEffect.formula !== "") {
      ce.effectType = SYSTEM.CUSTOM_EFFECT.damageOrHeal.id
    } else if (this.additionalEffect.statuses && this.additionalEffect.statuses !== "") {
      ce.effectType = SYSTEM.CUSTOM_EFFECT.status.id
    } else if (action.modifiers && action.modifiers.Length > 0) {
      const mod = action.modifiers.filter((m) => m.value < 0)
      ce.modifiers.push(action.modifiers) // On les ajoutes du coup s'il y en a :)
      if (mod && mod.length > 0) {
        // Debuff
        ce.effectType = SYSTEM.CUSTOM_EFFECT.debuff.id
      } else {
        // Buff
        ce.effectType = SYSTEM.CUSTOM_EFFECT.buff.id
      }
    }

    console.log("duration", ce.duration)

    // Evaluation de la formule à partir du caster
    let formulResult = Utils.evaluateFormulaCustomValues(actor, ce.formula)
    formulResult = Roll.replaceFormulaData(formulResult, actor.getRollData())
    ce.formula = formulResult

    // Est ce que l'on a des modifier à appliquer
    if (action.modifiers && action.modifiers.length > 0 && this.additionalEffect.applyBuff === true) {
      for (let i = 0; i < action.modifiers.length; i++) {
        const mod = foundry.utils.deepClone(action.modifiers[i])
        ce.modifiers.push(mod)
      }
    }

    // Gestion de la cible
    if (this.target.type === SYSTEM.RESOLVER_TARGET.self.id) await actor.applyCustomEffect(ce)
    else {
      const targets = actor.acquireTargets(this.target.type, this.target.scope, this.target.number, action.name)
      const uuidList = targets.map((obj) => obj.uuid)
      if (game.user.isGM) Hooks.callAll("applyEffect", targets, ce)
      else {
        game.socket.emit(`system.${SYSTEM.ID}`, {
          action: "customEffect",
          data: {
            userId: game.user.id,
            ce: {
              nom: item.name,
              source: item.uuid,
              statuses: this.additionalEffect.statuses,
              duration: ce.duration,
              unit: this.additionalEffect.unit,
              formula: ce.formula,
              elementType: this.additionalEffect.elementType,
              effectType: SYSTEM.CUSTOM_EFFECT.status.id,
              modifiers: ce.modifiers,
            },
            targets: uuidList,
          },
        })
      }
    }
    return true
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
    // Si c'est une attaque et que target a les valeur par defaut on met cible unique et ennemis
    if (this.target.type === SYSTEM.RESOLVER_TARGET.none.id) {
      this.target.type = SYSTEM.RESOLVER_TARGET.single.id
      this.target.scope = SYSTEM.RESOLVER_SCOPE.all.id
      this.target.number = 1
    }
    let skillFormula = this.skill.formula
    skillFormula = Utils.evaluateFormulaCustomValues(actor, skillFormula, item.uuid)
    let skillFormulaEvaluated = Roll.replaceFormulaData(skillFormula, actor.getRollData())
    const skillFormulaTooltip = this.skill.formula

    let damageFormula = this.dmg.formula
    damageFormula = Utils.evaluateFormulaCustomValues(actor, damageFormula, item.uuid)
    let damageFormulaEvaluated = Roll.replaceFormulaData(damageFormula, actor.getRollData())
    const damageFormulaTooltip = this.dmg.formula

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
      bonusDice: this.bonusDiceAdd ? 1 : 0,
      malusDice: this.malusDiceAdd ? 1 : 0,
    })

    if (result === null) return false
    console.log("result", result)
    if (result[0].isSuccess && this.additionalEffect.active && this.additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.success.id) {
      console.log("le resultat est un succes")
      await this.manageAdditionalEffect(actor, item, action)
    } else if (result[0].isFailure && this.additionalEffect.active && this.additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.fail.id) {
      console.log("le resultat est un echec")
      await this.manageAdditionalEffect(actor, item, action)
    }
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
    healFormula = Utils.evaluateFormulaCustomValues(actor, healFormula, item.uuid)
    let healFormulaEvaluated = Roll.replaceFormulaData(healFormula, actor.getRollData())
    console.log("healFormulaEvaluated", healFormulaEvaluated)

    const targets = actor.acquireTargets(this.target.type, this.target.scope, this.target.number, action.name)
    if (CONFIG.debug.co?.resolvers) console.debug(Utils.log("Heal Targets", targets))

    await actor.rollHeal(item, { actionName: action.label, healFormula: healFormulaEvaluated, targetType: this.target.type, targets: targets })
    return true
  }

  /**
   * Resolver pour les actions de type buff ou debuff.
   * Un buff ou un debuff est une amélioration/affaiblissement temporaire d'un ou plusieurs individus
   * on doit forcément avoir coché la case effets supplémentaire pour définir une durée en round à minima
   * @param {COActor} actor : l'acteur qui execute l'action
   * @param {COItem} item : la source de l'action
   * @param {Action} action : l'action
   */
  async buffDebuff(actor, item, action) {
    if (action.modifiers && action.modifiers.length > 0 && this.additionalEffect.active && this.additionalEffect.applyBuff === true) {
      return await this.manageAdditionalEffect(actor, item, action)
    } else {
      return false
    }
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

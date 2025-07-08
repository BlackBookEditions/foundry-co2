import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../utils.mjs"
import COActor from "../../documents/actor.mjs"
import { CustomEffectData } from "./custom-effect.mjs"
import { CORoll } from "../../documents/roll.mjs"

/**
 * Resolver
 *
 * @class
 * @param {string} type Le type d'action.
 * @param {number} skill Le niveau de skill requis pour l'action ? ou la formule de skill a utiliser (attaque)
 *  skill.difficulty skill.formula (array)
 * @param {number} dmg La valeur de dommages ou de soin de l'action.
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
        successThreshold: new fields.NumberField({ integer: true, positive: true }),
        statuses: new fields.SetField(new fields.StringField({ required: true, blank: true, choices: SYSTEM.RESOLVER_ADDITIONAL_EFFECT_STATUS })),
        duration: new fields.StringField({ required: true, nullable: false, initial: "0" }),
        unit: new fields.StringField({ required: true, choices: SYSTEM.COMBAT_UNITE, initial: "round" }),
        formula: new fields.StringField({ required: false }),
        formulaType: new fields.StringField({ required: false, choices: SYSTEM.RESOLVER_FORMULA_TYPE }),
        elementType: new fields.StringField({ required: false }),
      }),
    }
  }

  get resolvers() {
    return {
      attack: function () {},
      heal: function () {},
      auto: function () {},
      consume: function () {},
      buffDebuff: function () {},
    }
  }

  async resolve(actor, item, action, type) {
    switch (this.type) {
      case "attack":
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

    // Création de l'éventuel custom effect
    let customEffect
    if (this.additionalEffect.active) {
      customEffect = await this._createCustomEffect(actor, item, action)
    }

    const result = await actor.rollAttack(item, {
      auto: false,
      type,
      actionName: action.label,
      actionType: action.type,
      chatFlavor: action.chatFlavor,
      skillFormula: skillFormulaEvaluated,
      damageFormula: damageFormulaEvaluated,
      skillFormulaTooltip,
      damageFormulaTooltip,
      critical: this.skill.crit,
      difficulty: this.skill.difficulty,
      bonusDice: this.bonusDiceAdd ? 1 : 0,
      malusDice: this.malusDiceAdd ? 1 : 0,
      customEffect,
      applyOn: this.additionalEffect.applyOn,
    })

    if (result === null) return false

    // Gestion des effets supplémentaires
    if (this.additionalEffect.active && Resolver.shouldManageAdditionalEffect(result[0], this.additionalEffect)) {
      await this._manageAdditionalEffect(actor, item, action)
    }
    return true
  }

  static shouldManageAdditionalEffect(result, additionalEffect) {
    if (additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.always.id) return true
    if (additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.success.id && result.isSuccess) return true
    if (additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.successTreshold.id && result.isSuccess && result.total >= result.difficulty + additionalEffect.successThreshold)
      return true
    if (additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.critical.id && result.isCritical) return true
    if (additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.failure.id && result.isFailure) return true
    return false
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
    if (this.dmg.formula && this.dmg.formula !== "" && this.dmg.formula !== "0") {
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
    }

    // Gestion des effets supplémentaires
    if (this.additionalEffect.active && this.additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.always.id) {
      await this._manageAdditionalEffect(actor, item, action)
    }

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

    const targets = actor.acquireTargets(this.target.type, this.target.scope, this.target.number, action.actionName)
    if (CONFIG.debug.co?.resolvers) console.debug(Utils.log("Heal Targets", targets))

    await actor.rollHeal(item, { actionName: action.label, healFormula: healFormulaEvaluated, targetType: this.target.type, targets: targets })

    // Gestion des effets supplémentaires
    if (this.additionalEffect.active && this.additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.always.id) {
      await this._manageAdditionalEffect(actor, item, action)
    }
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
    if (action.modifiers && action.modifiers.length > 0 && this.additionalEffect.active && this.additionalEffect.applyOn === SYSTEM.RESOLVER_RESULT.always.id) {
      return await this._manageAdditionalEffect(actor, item, action)
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

  /**
   * Gère l'application d'un effet supplémentaire sur un acteur pendant un combat.
   *
   * @async
   * @param {Actor} actor L'acteur sur lequel l'effet sera appliqué.
   * @param {Item} item L'objet déclenchant l'effet supplémentaire.
   * @param {Object} action L'action contenant les modificateurs et autres données pertinentes.
   * @returns {Promise<void>} Résout lorsque l'effet a été appliqué avec succès.
   *
   *
   * @description
   * Cette méthode gère la création et l'application d'un effet personnalisé basé sur l'acteur,
   * l'objet et l'action fournis. Elle évalue la durée et la formule de l'effet, détermine les
   * cibles appropriées et applique l'effet en conséquence. Si aucun combat n'est actif ou démarré,
   * la méthode s'arrête avec une notification d'avertissement.
   *
   * - Évalue la durée et la formule de l'effet en utilisant des valeurs personnalisées et les données de l'acteur.
   * - Calcule le round où l'effet prendra fin en fonction de l'état du combat.
   * - Filtre les modificateurs applicables à partir de l'action.
   * - Crée un objet `CustomEffectData` pour représenter l'effet.
   * - Applique l'effet à l'acteur ou à ses cibles, selon le type de cible.
   * - Envoie un événement socket au MJ si l'utilisateur n'est pas MJ et que des cibles sont impliquées.
   *
   * @example
   * // Exemple d'utilisation :
   * await _manageAdditionalEffect(actor, item, action);
   */
  async _manageAdditionalEffect(actor, item, action) {
    // Si pas de combat, pas d'effet sur la durée
    if (!game.combat || !game.combat.started) {
      // FIXME : Debug pour l'instant, à supprimer
      ui.notifications.warn("Pas de combat en cours ou combat non démarré !")
      return
    }

    const ce = await this._createCustomEffect(actor, item, action)

    // Application de l'effet en fonction de la gestion des cibles
    // Aucune cible ou soi-même : le MJ ou un joueur peut appliquer l'effet
    if (this.target.type === SYSTEM.RESOLVER_TARGET.none.id || this.target.type === SYSTEM.RESOLVER_TARGET.self.id) await actor.applyCustomEffect(ce)
    else {
      const targets = actor.acquireTargets(this.target.type, this.target.scope, this.target.number, action.name)
      const uuidList = targets.map((t) => t.uuid)
      if (game.user.isGM) await Promise.all(targets.map((target) => target.actor.applyCustomEffect(ce)))
      else {
        game.socket.emit(`system.${SYSTEM.ID}`, {
          action: "customEffect",
          data: {
            userId: game.user.id,
            ce,
            targets: uuidList,
          },
        })
      }
    }
  }

  async _createCustomEffect(actor, item, action) {
    if (!game.combat || game.combat.round === null) {
      ui.notifications.warn(game.i18n.localize("CO.label.long.customEffectInCombat"))
      return
    }
    let ce
    // Evaluation de la durée si besoin
    let evaluatedDuration = Utils.evaluateFormulaCustomValues(actor, this.additionalEffect.duration)
    evaluatedDuration = Roll.replaceFormulaData(evaluatedDuration, actor.getRollData())
    // Si on a un dé il faut l'evaluer
    if (evaluatedDuration.match("\\d+[d|D]\\d+")) {
      let roll = new CORoll(evaluatedDuration)
      evaluatedDuration = (await roll.evaluate()).total
    }
    // TODO : vérifier si eval est nécessaire ici
    if (/[+\-*/%]/.test(evaluatedDuration)) evaluatedDuration = eval(evaluatedDuration)
    const duration = parseInt(evaluatedDuration)

    // Calcul du round de fin
    let lastRound
    if (this.additionalEffect.unit === SYSTEM.COMBAT_UNITE.round) {
      lastRound = game.combat.round + duration
    } else {
      lastRound = game.combat.round + Math.round(duration / CONFIG.time.roundTime)
    }

    // Evaluation de la formule à partir de l'acteur à l'origine de l'effet
    // TODO Vérifier dans le cas où elle n'est pas définie
    let evaluatedFormula = Utils.evaluateFormulaCustomValues(actor, this.additionalEffect.formula)
    evaluatedFormula = Roll.replaceFormulaData(evaluatedFormula, actor.getRollData())

    // Les modifiers qui s'appliquent (avec apply égal à others ou both)
    let modifiers = []
    if (action.modifiers?.length) {
      modifiers = action.modifiers.filter((m) => m.apply === SYSTEM.MODIFIERS_APPLY.others.id || m.apply === SYSTEM.MODIFIERS_APPLY.both.id)
    }

    // Création de l'effet
    ce = new CustomEffectData({
      name: item.name,
      source: item.uuid,
      statuses: this.additionalEffect.statuses,
      unit: this.additionalEffect.unit,
      duration,
      startedAt: game.combat.round,
      lastRound,
      modifiers,
      formula: evaluatedFormula,
      formulaType: this.additionalEffect.formulaType,
      elementType: this.additionalEffect.elementType,
      slug: item.name.slugify(),
    })

    return ce
  }
}

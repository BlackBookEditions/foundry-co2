import ItemData from "./item.mjs"
import { SYSTEM } from "../config/system.mjs"
import { Modifier } from "./schemas/modifier.mjs"
import Utils from "../utils.mjs"

/**
 * Subtype : "customEffect"
 * statuses : liste de string contenant les nom des conditionState à appliquer cf CUSTOM_STATUS_EFFECT.XXX.id
 * effectType : Type d'effet : damage, heal, buff, debuff, status
 * unite : type d'unité de mesure de temps : round/seconde
 * duration : Nombre d'unité de temps à compter (ex : 5 round, 60 secondes etc.)
 * modifiers : Liste de modifier à appliquer sur l'acteur (buff/debuff)
 * Formula: Formule de calcul de degat si effectType = damage, Formule de soin si effectType = heal
 */
export class CustomEffectData extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    return {
      nom: new fields.StringField({ required: true }),
      source: new fields.DocumentUUIDField(),
      statuses: new fields.ArrayField(new fields.StringField({ required: false })),
      effectType: new fields.StringField({ required: true, choices: Object.values(SYSTEM.CUSTOM_EFFECT).map((effect) => effect.id), initial: "status" }),
      unite: new fields.StringField({ required: true, choices: SYSTEM.COMBAT_UNITE, initial: "round" }),
      duration: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      startedAt: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      lastRound: new fields.NumberField({ ...requiredInteger, initial: 0 }), // Au cas ou le mj reviens en arriere il faut verifier qu'on applique pas 2 fois les actions
      remainingDuration: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      modifiers: new fields.ArrayField(new fields.EmbeddedDataField(Modifier)),
      formule: new fields.StringField({ required: false }),
      elementType: new fields.StringField({ required: false }),
    }
  }

  /**
   * A appeler au début de l'application de l'effet d'un résolver
   * Va gérer les effets à appliquer
   * @param {COActor} actor acteur qui se prend l'effet
   * @param {integer} round numéro de round de depart de l'effet
   */
  async startApplyingEffect(actor, round) {
    this.startedAt = round
    this.remainingDuration = this.duration
    this.lastRound = round
    // Applique le statut
    if (statuses.length > 0) {
      for (const status of this.statuses) {
        await actor.activateCOStatusEffect({ state: true, effectid: status })
      }
    }
  }

  /**
   * Va se charger d'appliquer le soins ou dommages à chaque appel
   * @param {COActor} actor
   */
  async applyDamageAndHeal(actor) {
    if (this.effectType === SYSTEM.CUSTOM_EFFECT.damage.id || this.effectType === SYSTEM.CUSTOM_EFFECT.heal.id) {
      // Doit on jeter un dé ou c'est une valeur fixe ?
      const diceInclude = this.formule.match("d[0-9]{1,}")
      let formulResult = this.formule
      if (diceInclude) {
        // On évalue la formule
        formulResult = Utils.evaluateFormulaCustomValues(actor, formulResult)
        formulResult = Roll.replaceFormulaData(formulResult, actor.getRollData())
        const roll = new Roll(formulResult)
        await roll.evaluate()
        formulResult = roll.total
      }
      actor.applyHealAndDamage(formulResult)
    }
  }

  /**
   * Fonction appelée à chaque fois que le MJ clic sur NextRound.S'il ne reviens pas en arriere on met à jour la duréerestante
   * @param {*} updateData : contient {round, turn}. Exemple { round: 1, turn: 1}
   * @param {*} updateOptions contiens {diff:true/false, direction: -1, modifiedTime: longdate, pack, parent, recursive, render, updates, worldTime: {delta: advanceTime}} -1 si on reviens en arriere et 1 si on avance
   */
  async onNextRound(updateData, updateOptions) {
    if (direction >= 1 && updateDate.round > lastRound) {
      if (this.unite === SYSTEM.COMBAT_UNITE.round) {
        this.remainingDuration -= 1
      } else {
        this.remainingDuration -= updateOptions.worldTime.delta
      }
      lastRound = updateData.round
    }
  }

  /**
   * On change de tour donc on peut gérer des actions qui se terminent "à la fin du tour". Normalement j'arrive ici si le tour actuel pointe sur l'acteur courant
   * cf l'appel dans la classe COActor
   * @param {*} updateData : contient {round, turn}
   * @param {*} updateOptions contiens {direction: -1, worldTime:  worldTime: {delta: CONFIG.time.turnTime} -1 si on reviens en arriere et 1 si on avance
   */
  async onNextTurn(updateData, updateOptions) {
    console.log(updateData, updateOptions)
    if (direction >= 1 && updateDate.round === lastRound) {
      if (this.effectType === SYSTEM.CUSTOM_EFFECT.damage.id || this.effectType === SYSTEM.CUSTOM_EFFECT.heal.id) await this.applyDamageAndHeal(actor)
    }
  }

  /**
   * Met fin aux effets
   * @param {COActor} actor
   */
  async onEndApplyEffect(actor) {
    // Supprime le statut
    if (statuses.length > 0) {
      for (const status of this.statuses) {
        await actor.activateCOStatusEffect({ state: false, effectid: status })
      }
    }
  }
}

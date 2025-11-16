import { SYSTEM } from "../../config/system.mjs"
import RulesEngine from "../../helpers/rules-engine.mjs"

/**
 * La classe Condition représente un contrôle de condition qui peut être évalué pour un élément donné.
 */
export class Condition extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      predicate: new fields.StringField({ required: true, choices: SYSTEM.CONDITION_PREDICATES, initial: SYSTEM.CONDITION_PREDICATES.isEquipped.id }),
      object: new fields.StringField({}),
    }
  }

  /**
   * Évalue une condition basée sur l'élément et l'acteur fournis.
   *
   * @param {Object} item L'élément à évaluer.
   * @param {Object} actor L'acteur effectuant l'évaluation.
   * @returns {Promise<boolean>} Une promesse qui se résout avec le résultat de l'évaluation.
   */
  async evaluate(item, actor) {
    return RulesEngine.evaluate(this, item, actor) // Utilisation de l'évaluation statique
  }
}

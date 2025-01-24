import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../utils.mjs"

/**
 * Définie les élément sur lesquels une action a une influence
 * La liste des influence étant définie sous ./module/config/modifier.mjs
 * @param {*} source L'action à l'origine du modifier
 * @param {string} type Le type de modificateur qui indique l'origine : Equipement, Trait, Profil, Capacité, Attaque
 * @param {string} subtype Indique sur quel type de cible on va appliquer le modificateur : ability (agi, for, con etc), combat (melee, ranged, magic, init, def),
 *  ressource (fortune, mana, recorvery), attribute (hp, recovery dice), skill (bonus sur le sjet d'attribut à selectionner selon le jet)
 * @param {string} target : Sous element de subtype ciblé par le modificateur : agi, for, con, melee etc.
 * @param {string} value : Valeur à appliquer, peux être une formule (ex +1, -5, 1 * @[variable])
 */
export class Modifier extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      source: new fields.DocumentUUIDField(),
      type: new fields.StringField({ required: true, choices: SYSTEM.MODIFIERS_TYPE, initial: "equipment" }),
      subtype: new fields.StringField({ required: true, choices: SYSTEM.MODIFIERS_SUBTYPE, initial: "ability" }),
      target: new fields.StringField({ required: true, choices: SYSTEM.MODIFIERS_TARGET, initial: "agi" }),
      value: new fields.StringField({ required: true, initial: "0" }),
    }
  }

  /**
   * Met à jour la source du modificateur
   * @param {*} source
   */
  updateModifierSource(source) {
    this.source = source
  }

  /**
   * Evalue (prend en compte donc les formules) l'acteur en utilisant la source et la valeur specifiée.
   *
   * @param {Object} actor The actor to be evaluated.
   * @returns {int} The result of the evaluation.
   */
  evaluate(actor) {
    return Utils.evaluate(actor, this.value, this.source, true)
  }

  /**
   * Generates a tooltip for the given actor based on the item's name and evaluated value.
   *
   * @param {Actor} actor The actor for which the tooltip is generated.
   * @returns {string|undefined} The generated tooltip string or undefined if the item is not found.
   */
  getTooltip(actor) {
    const { id } = foundry.utils.parseUuid(this.source)
    let item = actor.items.get(id)
    if (!item) return
    let name = item.name
    let value = this.evaluate(actor)
    return Utils.getTooltip(name, value)
  }

  /**
   * Retrieves the source information for a given actor.
   * Pour un objet appartenant à un acteur, la source est l'id de l'objet (embedded item) ou du type Actor.id.Item.id
   * Retourne Le nom et la description de l'objet à l'origine du modifier
   *
   * @param {Object} actor The actor object containing items.
   * @returns {Object|undefined} An object containing the name and description of the item, or undefined if the item is not found.
   * @property {string} name - The name of the item.
   * @property {string} description - The description of the item.
   */
  getSourceInfos(actor) {
    const { id } = foundry.utils.parseUuid(this.parent.source)
    let item = actor.items.get(id)
    if (!item) return
    const name = item.name
    const description = item.system.description
    return { name, description }
  }
}

import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../helpers/utils.mjs"

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
      apply: new fields.StringField({ required: true, choices: SYSTEM.MODIFIERS_APPLY, initial: "self" }),
      value: new fields.StringField({ required: true, initial: "0" }),
      additionalInfos: new fields.StringField({ required: true, blank: true }), // Initial value is an empty string
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
   * Evalue la formule de modificateur pour un acteur en utilisant la source et la valeur specifiée. La valeur est une formule.
   *
   * @param {Object} actor The actor to be evaluated.
   * @param {boolean} withDiceValue optional boolean to evaluate if dice have to be compute
   * @returns {int|string} The result of the evaluation.
   */
  evaluate(actor, withDiceValue = false) {
    return withDiceValue ? Utils.evaluateCoModifierWithDiceValue(actor, this.value, this.source) : Utils.evaluateCoModifier(actor, this.value, this.source)
  }

  /**
   * Generates a tooltip for the given actor based on the item's name and evaluated value.
   *
   * @param {Actor} actor The actor for which the tooltip is generated.
   * @param {boolean} withDiceValue define if the formula contain dice value (false by default)
   * @returns {string|undefined} The generated tooltip string or undefined if the item is not found.
   */
  getTooltip(actor, withDiceValue = false) {
    const id = foundry.utils.parseUuid(this.source)?.id
    if (!id) return
    let item = actor.items.get(id)
    let name = "Autre"
    if (item) {
      name = item.name
    }
    let value = this.evaluate(actor, withDiceValue)
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
    const id = foundry.utils.parseUuid(this.parent.source)?.id
    if (!id) return
    let item = actor.items.get(id)
    if (!item) return
    const sourceType = item.type
    const name = item.name
    const description = item.system.description
    let pathType = ""
    // Pour une capacité, remonte le type de voie
    if (item.type === SYSTEM.ITEM_TYPE.capacity.id) {
      const pathId = foundry.utils.parseUuid(item.system.path)?.id
      if (pathId) {
        const path = actor.items.get(pathId)
        if (path) pathType = game.i18n.localize(SYSTEM.PATH_TYPES[path.system.subtype].label)
      }
    }
    return { sourceType, name, description, pathType }
  }

  /**
   * Permet de savoir si c'est un modifier type state ou pas
   * return {boolean}
   */
  get isState() {
    return this.subtype === SYSTEM.MODIFIERS_SUBTYPE.state.id
  }

  get isTargetDamage() {
    return Utils.isDamageType(this.target)
  }
}

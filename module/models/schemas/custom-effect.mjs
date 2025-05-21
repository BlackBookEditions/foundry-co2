import { SYSTEM } from "../../config/system.mjs"
import { Modifier } from "./modifier.mjs"

/**
 * Subtype : "customEffect"
 * statuses : liste de string contenant les nom des conditionState à appliquer cf CUSTOM_STATUS_EFFECT.XXX.id
 * unit : type d'unité de mesure de temps (round/seconde)
 * duration : Nombre d'unités de temps à compter (ex : 5 round, 60 secondes etc.)
 * modifiers : Liste des modifiers à appliquer sur l'acteur (buff/debuff)
 * Formula: Formule de calcul des dommages ou du soin
 */
export class CustomEffectData extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    return {
      name: new fields.StringField({ required: true }),
      source: new fields.DocumentUUIDField(),
      statuses: new fields.ArrayField(new fields.StringField({ required: false })),
      unit: new fields.StringField({ required: true, choices: SYSTEM.COMBAT_UNITE, initial: "round" }),
      duration: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      startedAt: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      previousRound: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      lastRound: new fields.NumberField({ ...requiredInteger, initial: 0 }), // Au cas ou le mj reviens en arriere il faut verifier qu'on applique pas 2 fois les actions
      modifiers: new fields.ArrayField(new fields.EmbeddedDataField(Modifier)),
      formulaType: new fields.StringField({ required: true, choices: SYSTEM.RESOLVER_FORMULA_TYPE, initial: "damage" }),
      formula: new fields.StringField({ required: false }),
      elementType: new fields.StringField({ required: false }),
      slug: new fields.StringField({ required: true }),
    }
  }

  /**
   * Génère un tooltip à partir d'un customEffect
   * @returns {string} Renvoi un tooltip à afficher
   */
  get tooltip() {
    let tip = `${game.i18n.localize("CO.ui.duration")} : ${this.duration} ${this.unit}<br />`
    if (this.formula && this.formula !== "") tip += `${game.i18n.localize("CO.ui.dmg")} : ${this.formula}`
    if (this.elementType && this.elementType !== "") tip += `${this.elementType}`
    if (this.formula && this.formula !== "") tip += `<br />`
    if (this.statuses && this.statuses.length > 0) tip += `${game.i18n.localize("CO.customEffect.status")} :${this.statuses.join(", ")}<br />`
    if (this.modifiers && this.modifiers.length > 0) {
      for (let i = 0; i < this.modifiers.length; i++) {
        tip += ` ${game.i18n.localize(SYSTEM.MODIFIERS_SUBTYPE[this.modifiers[i].subtype].label)} ${game.i18n.localize(SYSTEM.MODIFIERS_TARGET[this.modifiers[i].target].label)} : ${this.modifiers[i].value}<br />`
      }
    }
    return tip
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData()
    this.slug = this.parent.name.slugify({ strict: true })
  }

  /**
   * Fonction qui va provoquer la mise en place d'un custom Effect sur le client donné s'il est dans la liste
   * @param {*} data : Ensemble des données transmises par packet via le socket
   * @param {*} data.userId: game.user.id,
   * @param {CustomEffectData} data.ce CustomEffetcs à appliquer
   * @param {string} data.ce.nom Nom de l'item source
   * @param {string} data.ce.source UUID de l'item source
   * @param {string} data.ce.statuses: liste des status à appliquer
   * @param {int} data.ce.duration this.additionalEffect.duration
   * @param {string} data.ce.unit this.additionalEffect.unit
   * @param {string} data.ce.formule: ce.formule,
   * @param {string} data.ce.elementType: this.additionalEffect.elementType,
   * @param {Modifier} data.ce.modifiers: liste de modifiers,
   * @param {Set<int>} data.ce.targets: uuidList,
   */

  /**
   * Gère l'application d'un effet personnalisé à un ensemble d'acteurs cibles.
   * Cette méthode est exécutée uniquement si l'utilisateur actuel est un Maître de Jeu (MJ).
   *
   * @param {Object} data Les données nécessaires pour gérer l'effet personnalisé.
   * @param {Object} data.ce Les données de l'effet personnalisé utilisées pour créer l'effet.
   * @param {Array<string>} data.targets Un tableau de UUID représentant les acteurs cibles.
   */
  static async handle(data) {
    if (game.user.isGM) {
      console.log("CustomEffectData - handle data", data)
      // Création de l'effet
      const ce = CustomEffectData.createFromCE(data.ce)
      console.log("CustomEffectData - handle ce", ce)
      for (const target of data.targets) {
        const actor = fromUuidSync(target)
        await actor.applyCustomEffect(ce)
      }
    }
  }

  /**
   * Creates a new instance of CustomEffectData from a given custom effect object.
   *
   * @param {Object} ce The custom effect object to create the instance from.
   * @param {string} ce.name The name of the custom effect.
   * @param {string} ce.source The source of the custom effect.
   * @param {Array<string>} ce.statuses The statuses associated with the custom effect.
   * @param {string} ce.unit The unit of measurement for the custom effect's duration.
   * @param {number} ce.duration The duration of the custom effect.
   * @param {Date} ce.startedAt The start time of the custom effect.
   * @param {number} ce.previousRound The previous round number when the effect was active.
   * @param {number} ce.lastRound The last round number when the effect was active.
   * @param {string} ce.formula The formula associated with the custom effect.
   * @param {string} ce.elementType The element type of the custom effect.
   * @param {string} ce.slug A unique identifier (slug) for the custom effect.
   * @param {Array<Object>} ce.modifiers An array of modifier objects to apply to the custom effect.
   * @returns {CustomEffectData} A new instance of CustomEffectData populated with the provided custom effect data.
   */
  static createFromCE(ce) {
    let customEffect = new CustomEffectData({
      name: ce.name,
      source: ce.source,
      statuses: ce.statuses,
      unit: ce.unit,
      duration: ce.duration,
      startedAt: ce.startedAt,
      previousRound: ce.previousRound,
      lastRound: ce.lastRound,
      formula: ce.formula,
      elementType: ce.elementType,
      slug: ce.slug,
    })
    for (let i = 0; i < ce.modifiers.length; i++) {
      const modifier = ce.modifiers[i]
      customEffect.modifiers.push(new Modifier(modifier))
    }
    return customEffect
  }
}

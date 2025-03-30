import { SYSTEM } from "../../config/system.mjs"
import { Modifier } from "./modifier.mjs"

/**
 * Subtype : "customEffect"
 * statuses : liste de string contenant les nom des conditionState à appliquer cf CUSTOM_STATUS_EFFECT.XXX.id
 * effectType : Type d'effet : damage, heal, buff, debuff, status
 * unit : type d'unité de mesure de temps : round/seconde
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
      unit: new fields.StringField({ required: true, choices: SYSTEM.COMBAT_UNITE, initial: "round" }),
      duration: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      startedAt: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      previousRound: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      lastRound: new fields.NumberField({ ...requiredInteger, initial: 0 }), // Au cas ou le mj reviens en arriere il faut verifier qu'on applique pas 2 fois les actions
      modifiers: new fields.ArrayField(new fields.EmbeddedDataField(Modifier)),
      formula: new fields.StringField({ required: false }),
      elementType: new fields.StringField({ required: false }),
      slug: new fields.StringField({ required: true }),
    }
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData()
    this.slug = this.parent.name.slugify({ strict: true })
  }
}

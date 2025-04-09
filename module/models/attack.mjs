import ItemData from "./item.mjs"
import { BaseValue } from "./schemas/base-value.mjs"
import { Action } from "./schemas/action.mjs"
export default class AttackData extends ItemData {
  static defineSchema() {
    const fields = foundry.data.fields

    return foundry.utils.mergeObject(super.defineSchema(), {
      subtype: new fields.StringField({
        required: true,
        nullable: false,
        initial: "",
      }),
      learned: new fields.BooleanField({
        required: true,
        initial: false,
      }),
      charges: new fields.SchemaField({
        current: new fields.NumberField({
          required: false,
          nullable: true,
          integer: true,
        }),
        max: new fields.NumberField({
          required: false,
          nullable: true,
          integer: true,
        }),
      }),
      properties: new fields.SchemaField({
        spell: new fields.BooleanField({
          required: true,
          initial: false,
        }),
        chargeable: new fields.BooleanField({
          required: true,
          initial: false,
        }),
      }),
      range: new fields.EmbeddedDataField(BaseValue, {
        label: "CO.ui.range",
        nullable: true,
      }),
      actions: new fields.ArrayField(new fields.EmbeddedDataField(Action)),
    })
  }

  get isContact() {
    return this.subtype === "melee"
  }

  get isRanged() {
    return this.subtype === "ranged"
  }

  get isMagic() {
    return this.subtype === "magic"
  }

  get subtypeLabel() {
    if (this.isContact) return game.i18n.localize("CO.ui.melee")
    if (this.isRanged) return game.i18n.localize("CO.ui.ranged")
    if (this.isMagic) return game.i18n.localize("CO.ui.magic")
    return ""
  }

  get subtypeIcon() {
    if (this.isContact) return "fas fa-fw fa-sword"
    if (this.isRanged) return "fas fa-fw fa-bow-arrow"
    if (this.isMagic) return "fas fa-fw fa-wand-magic-sparkles"
    return ""
  }

  get hasRange() {
    if (this.range.value > 0) return true
    return false
  }

  get rangeValue() {
    if (this.hasRange) return this.range.value
    return undefined
  }

  get rangeLabel() {
    if (this.hasRange) return this.range.value + this.range.unit
    return ""
  }

  get displayValues() {
    let attack = ""
    let damage = ""
    let source = ""
    let actions = this.actions
    if (actions.length > 0) {
      let action = actions[0]
      if (action.hasResolvers) {
        let resolver = action.resolvers[0]
        attack = `${resolver?.skill?.formula}`
        damage = `${resolver?.dmg?.formula}`
      }
      source = action.source
    }
    return { attack, damage, source }
  }
}

import { AbilityValue } from "./ability-value.mjs"
import { BaseValue } from "./base-value.mjs"

export class CompanionAbilityValue extends AbilityValue {
  static defineSchema() {
    const schema = super.defineSchema()
    schema.formula = new foundry.data.fields.StringField({ required: true, nullable: false, initial: "0" })
    return schema
  }
}

export class CompanionCombatValue extends BaseValue {
  static defineSchema() {
    const schema = super.defineSchema()
    schema.formula = new foundry.data.fields.StringField({ required: true, nullable: false, initial: "0" })
    return schema
  }
}

import { SYSTEM } from "../config/system.mjs"
import BaseMessageData from "./base-message.mjs"

export default class HealMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      healer: new fields.DocumentUUIDField({ type: "Actor", nullable: true }),
      item: new fields.DocumentUUIDField({ type: "Item", nullable: true }),
      formula: new fields.StringField({ required: true, nullable: false, initial: "" }),
      total: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      label: new fields.StringField({ required: false, nullable: false, initial: "" }),
      targetType: new fields.StringField({ required: true, choices: SYSTEM.RESOLVER_TARGET, initial: SYSTEM.RESOLVER_TARGET.none.id }),
    })
  }
}

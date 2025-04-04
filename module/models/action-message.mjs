import BaseMessageData from "./base-message.mjs"
import { CustomEffectData } from "./schemas/custom-effect.mjs"

export default class ActionMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      subtype: new fields.StringField({
        required: true,
        choices: Object.values(SYSTEM.CHAT_MESSAGE_TYPES),
        initial: SYSTEM.CHAT_MESSAGE_TYPES.UNKNOWN,
      }),
      result: new fields.ObjectField(),
      linkedRoll: new fields.ObjectField(),
      customEffect: new fields.EmbeddedDataField(CustomEffectData),
      applyType: new fields.StringField({ required: false }),
    })
  }

  get isAttack() {
    return this.subtype === SYSTEM.CHAT_MESSAGE_TYPES.ATTACK
  }

  get isDamage() {
    return this.subtype === SYSTEM.CHAT_MESSAGE_TYPES.DAMAGE
  }
}

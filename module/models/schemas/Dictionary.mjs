export class DictionaryValue extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      value: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        integer: true,
      }),
      key: new fields.StringField({
        required: true,
        nullable: false,
        initial: "",
      }),
    }
  }
}

import { AbilityValue } from "./schemas/ability-value.mjs"

export default class ActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }

    const schema = {}

    schema.abilities = new fields.SchemaField(
      Object.values(SYSTEM.ABILITIES).reduce((obj, ability) => {
        obj[ability.id] = new fields.EmbeddedDataField(AbilityValue, { label: ability.label, nullable: false })
        return obj
      }, {}),
    )

    return schema
  }

  /** @override */
  prepareDerivedData() {
    this.slug = this.parent.name.slugify({ strict: true })
  }

  /**
   * Retrieves an array of ability modifiers from various sources associated with the character.
   *
   * @returns {Array} An array of ability modifiers.
   */
  get abilityModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.ability.id)
  }

  /**
   * Gets the resource modifiers for the character.
   *
   * @returns {Array} An array of resource modifiers.
   */
  get resourceModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.resource.id)
  }

  /**
   * Retrieves the state modifiers for the character.
   *
   * @returns {Array} An array of state modifiers.
   */
  get stateModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.state.id)
  }

  /**
   * Retrieves the bonusDice modifiers for the character.
   *
   * @returns {Array} An array of state modifiers.
   */
  get bonusDiceModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.bonusDice.id)
  }

  /**
   * Retrieves the malusDice modifiers for the character.
   *
   * @returns {Array} An array of state modifiers.
   */
  get malusDiceModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.malusDice.id)
  }

  /**
   * Retrieves an array of combat modifiers from various sources associated with the character.
   *
   * @returns {Array} An array of combat modifiers.
   */
  get combatModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.combat.id)
  }

  /**
   * Retrieves the attribute modifiers for the character.
   *
   * @returns {Array} An array of attribute modifiers.
   */
  get attributeModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.attribute.id)
  }

  /**
   * Retrieves the skill modifiers for the character.
   *
   * @returns {Array} An array of skill modifiers.
   */
  get skillModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.skill.id)
  }

  /**
   * Checks if there are any bonus dice modifiers for a given attack type.
   *
   * @param {string} attackType The type of attack to check for bonus dice modifiers.
   * @returns {boolean} - Returns true if there are bonus dice modifiers for the given attack type, otherwise false.
   */
  hasBonusDiceForAttack(attackType) {
    if (!attackType) return false
    console.log(this.bonusDiceModifiers)
    const modifiers = this.bonusDiceModifiers.filter((m) => m.target === attackType)
    return modifiers.length > 0
  }

  /**
   * Checks if there are any malus dice modifiers for a given attack type.
   *
   * @param {string} attackType The type of attack to check for malus dice modifiers.
   * @returns {boolean} - Returns true if there are malus dice modifiers for the given attack type, otherwise false.
   */
  hasMalusDiceForAttack(attackType) {
    if (!attackType) return false
    const modifiers = this.malusDiceModifiers.filter((m) => m.target === attackType)
    return modifiers.length > 0
  }
}

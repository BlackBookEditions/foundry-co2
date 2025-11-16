import { AbilityValue } from "./schemas/ability-value.mjs"
import CustomEffectData from "./schemas/custom-effect.mjs"

export default class ActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields

    const schema = {}

    schema.abilities = new fields.SchemaField(
      Object.values(SYSTEM.ABILITIES).reduce((obj, ability) => {
        obj[ability.id] = new fields.EmbeddedDataField(AbilityValue, { label: ability.label, nullable: false })
        return obj
      }, {}),
    )
    schema.currentEffects = new fields.ArrayField(new fields.EmbeddedDataField(CustomEffectData))
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
   * Retrieves an array of modifiers from various sources
   *
   * For character : the sources include features, profiles, capacities, and equipment.
   * For encounter : the sources include capacities, and equipment.
   *
   * Each source is checked for enabled modifiers of the specified type and subtype.
   * Only modifiers of applyOn self or both should be considered.
   * For features and profiles, the modifiers are in the item
   * for capacities and equipment, the modifiers are in the actions
   *
   * @param {string} subtype The subtype of the modifier.
   * @returns {Array} An array of modifiers.
   */
  _getModifiers(subtype) {
    const sources = this.parent.type === "character" ? ["features", "profiles", "capacities", "equipments"] : ["capacities", "equipments"]
    let modifiersArray = []

    sources.forEach((source) => {
      let items = this.parent[source]
      if (items) {
        let allModifiers = items
          .reduce((mods, item) => mods.concat(item.enabledModifiers), [])
          .filter((m) => m.subtype === subtype && (m.apply === SYSTEM.MODIFIERS_APPLY.self.id || m.apply === SYSTEM.MODIFIERS_APPLY.both.id))
        modifiersArray.push(...allModifiers)
      }
    })

    // Prise en compte des customEffects en cours (applyOn others ou both)
    if (this.currentEffects.length > 0) {
      for (const effect of this.currentEffects) {
        if (effect.modifiers.length > 0) {
          modifiersArray.push(
            ...effect.modifiers.filter((m) => m.subtype === subtype && (m.apply === SYSTEM.MODIFIERS_APPLY.others.id || m.apply === SYSTEM.MODIFIERS_APPLY.both.id)),
          )
        }
      }
    }

    return modifiersArray
  }

  /**
   * Checks if there are any bonus dice modifiers for a given attack type.
   *
   * @param {string} attackType The type of attack to check for bonus dice modifiers.
   * @returns {boolean} - Returns true if there are bonus dice modifiers for the given attack type, otherwise false.
   */
  hasBonusDiceForAttack(attackType) {
    if (!attackType) return false
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

  /**
   * Determines whether the current temporary damage (tempDm) exceeds the current hit points (hp).
   *
   * @returns {boolean} True if the temporary damage is greater than the current hit points, otherwise false.
   */
  get isTempDmSuperiorToCurrentHp() {
    const currentHp = this.attributes.hp.value
    const currentTempDamage = this.attributes.tempDm
    return currentTempDamage > currentHp
  }
}

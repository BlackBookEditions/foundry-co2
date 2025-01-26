import { SYSTEM } from "../../config/system.mjs"
/**
 * The Condition class represents a conditional check that can be evaluated for a given item.
 * subject The subject of the condition.
   predicate The predicate or method to evaluate the condition.
   object The object of the condition, or '_self' to refer to the item being evaluated.
 */
export class Condition extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      subject: new fields.StringField({ required: true, initial: "item" }),
      predicate: new fields.StringField({ required: true, initial: "isEquipped" }),
      object: new fields.StringField({ required: true, initial: "_self" }),
    }
  }

  /**
   * Returns an object containing the available condition methods.
   * @returns {object} An object containing condition methods.
   */
  get conditions() {
    return {
      isEquipped: this.isEquipped,
      isOwned: this.isOwned,
      isLearned: this.isLearned,
      isTagged: this.isTagged,
    }
  }

  /**
   * Checks if the item is equipped.
   * @param {object} condition The condition object.
   * @param {object} object The object to check.
   * @param {object} item The item to check.
   * @returns {boolean} True if the item is equipped, false otherwise.
   */
  isEquipped(condition, object, item) {
    return item.type === SYSTEM.ITEM_TYPE.equipment.id ? item.system.equipped : false
  }

  /**
   * Checks if the item is owned.
   * @param {object} condition The condition object.
   * @param {object} object The object to check.
   * @param {object} item The item to check.
   * @returns {boolean} True if the item is owned, false otherwise.
   */
  isOwned(condition, object, item) {
    // Implement the isOwned condition
    return false
  }

  /**
   * Checks if the capacity is learned.
   * @param {object} condition The condition object.
   * @param {object} object The object to check.
   * @param {object} item The item to check.
   * @returns {boolean} True if the capacity is learned, false otherwise.
   */
  isLearned(condition, object, item) {
    return item.type === SYSTEM.ITEM_TYPE.capacity.id ? item.system.learned : false
  }

  /**
   * Placeholder for the isTagged condition.
   * @param {object} condition The condition object.
   * @param {object} object The object to check.
   * @param {object} item The item to check.
   * @returns {boolean} To be implemented.
   */
  isTagged(condition, object, item) {
    // Implement the isTagged condition
    return false
  }

  /**
   * Evaluates the condition for a given item.
   * @param {object} item The item to evaluate the condition for.
   * @returns {boolean} The result of the condition evaluation.
   * @throws {Error} If the specified predicate is not a valid condition method.
   */
  async evaluate(item) {
    const obj = await this.getObject(item)
    this.validatePredicate()
    return this.conditions[this.predicate](this, obj, item)
  }

  /**
   * Retrieves the object based on the condition's object property.
   * @param {_self|UUID} item The item to retrieve the object for.
   * @returns {object} The retrieved object.
   */
  async getObject(item) {
    return this.object === "_self" ? item : await fromUuid(item)
  }

  /**
   * Validates the predicate to ensure it is a valid condition method.
   * @throws {Error} If the predicate is not valid.
   */
  validatePredicate() {
    if (!Object.prototype.hasOwnProperty.call(this.conditions, this.predicate)) {
      throw new Error(`Invalid predicate ${this.predicate}`)
    }
  }
}

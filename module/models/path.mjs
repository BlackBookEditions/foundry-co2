import ItemData from "./item.mjs"
import { SYSTEM } from "../config/system.mjs"

/**
 * Define the data schema for a Path
 * subtype : the type of the path
 * capacities : an array of capacities' uuis
 * rank : the rank in the path, will be define when a capacity is learned and unlearned
 * maxDefenseArmor : définie la protection maximale autorisé pour la voie
 * pvByLevel : Pour les voies de prestige, indique le nombre de PV obtenu par niveau
 */
export default class PathData extends ItemData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      subtype: new fields.StringField({ required: true, choices: SYSTEM.PATH_TYPES, initial: "profile" }),
      capacities: new fields.ArrayField(new fields.DocumentUUIDField({ type: "Item" })),
      rank: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
      maxDefenseArmor: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      pvByLevel: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
    })
  }

  /** Retourne la position d'une capacité dans la liste des capacités de la voie
   * @param {string} capacityUuid L'UUID de la capacité recherchée
   * @returns {number} La position dans la liste ou 0 si la capacité n'est pas trouvée
   */
  getCapacityRank(capacityUuid) {
    const rankpos = this.capacities.indexOf(capacityUuid)
    return rankpos !== -1 ? rankpos : 0
  }

  /**
   * Asynchronously retrieves and returns a list of capacities.
   *
   * This method iterates over the `capacities` property of the current instance,
   * retrieves each capacity using the `fromUuid` function, and collects the
   * results in an array.
   *
   * @returns {Promise<Array>} A promise that resolves to an array of capacities.
   */
  async getCapacities() {
    let capacities = []

    // Embedded path in an actor
    if (this.parent.isEmbedded) {
      for (const capacityUuid of this.capacities) {
        const item = fromUuidSync(capacityUuid)
        if (item) {
          capacities.push(item)
        }
      }
    }

    // Not Embedded : could be in the world or in a compendium
    else {
      for (const capacityUuid of this.capacities) {
        const item = await fromUuid(capacityUuid)
        if (item) {
          capacities.push(item)
        }
      }
    }

    return capacities
  }

  /** Retourne le nombre de capacité apprise
   * @returns {integer} Nombre de capacités apprise
   */
  get numberLearnedCapacities() {
    let capacities = []
    for (const capacityUuid of this.capacities) {
      const item = fromUuidSync(capacityUuid)
      if (item) {
        capacities.push(item)
      }
    }
    if (capacities.length === 0) return 0
    console.log(capacities)
    let learned = capacities.filter((c) => c.system?.learned)
    return learned.length
  }

  /**
   * Détermine si la voie doit être affichée en fonction de son sous-type et de son rang.
   *
   * @returns {boolean} - Retourne `true` si la voie remplit les conditions pour être affichée :
   *                      - Le sous-type est `SYSTEM.PATH_TYPES.prestige.id` et le rang est supérieur à 3.
   *                      - Le sous-type est `SYSTEM.PATH_TYPES.profile.id` et le rang est supérieur à 0.
   *                      - Le sous-type est `SYSTEM.PATH_TYPES.people.id` et le rang est supérieur à 0.
   *                      Sinon, retourne `false`.
   */
  get displayPath() {
    if (this.subtype === SYSTEM.PATH_TYPES.prestige.id && this.rank > 3) {
      return true
    }
    if (this.subtype === SYSTEM.PATH_TYPES.profile.id && this.rank > 0) {
      return true
    }
    if (this.subtype === SYSTEM.PATH_TYPES.people.id && this.rank > 0) {
      return true
    }
    return false
  }
}

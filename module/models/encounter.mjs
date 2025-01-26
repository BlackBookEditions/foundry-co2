import { SYSTEM } from "../config/system.mjs"
import { BaseValue } from "./schemas/base-value.mjs"
import ActorData from "./actor.mjs"

export default class EncounterData extends ActorData {
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.combat = new fields.SchemaField({
      init: new fields.EmbeddedDataField(BaseValue),
      def: new fields.EmbeddedDataField(BaseValue),
    })

    schema.pasteData = new fields.HTMLField()
    schema.details = new fields.SchemaField({
      archetype: new fields.StringField({
        required: false,
        nullable: true,
        initial: SYSTEM.ENCOUNTER_ARCHETYPES.standard,
        options: SYSTEM.ENCOUNTER_ARCHETYPES,
      }),
      category: new fields.StringField({
        required: false,
        nullable: true,
        initial: SYSTEM.ENCOUNTER_CATEGORIES.humanoid,
        options: SYSTEM.ENCOUNTER_CATEGORIES,
      }),
      size: new fields.StringField({
        required: false,
        nullable: true,
        initial: SYSTEM.SIZES.medium,
        options: SYSTEM.SIZES,
      }),
      bossRank: new fields.StringField({
        required: false,
        nullable: true,
        initial: SYSTEM.ENCOUNTER_BOSS_RANKS.noboss,
        options: SYSTEM.ENCOUNTER_BOSS_RANKS,
      }),
      description: new fields.SchemaField({
        private: new fields.HTMLField(),
        public: new fields.HTMLField(),
      }),
      notes: new fields.SchemaField({
        private: new fields.HTMLField(),
        public: new fields.HTMLField(),
      }),
      languages: new fields.ArrayField(new fields.StringField()),
    })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  prepareDerivedData() {
    super.prepareDerivedData()

    for (const [key, skill] of Object.entries(this.combat)) {
      console.debug(skill)
      // Somme du bonus de la feuille et du bonus des effets
      const bonuses = Object.values(skill.bonuses).reduce((prev, curr) => prev + curr)

      if (key === SYSTEM.COMBAT.INIT) {
        skill.value = skill.base + bonuses
      }

      if (key === SYSTEM.COMBAT.DEF) {
        skill.value = skill.base + bonuses
      }
    }
  }

  // #region accesseurs

  /**
   * Toutes les actions visibles des capacités
   * Retrieves all visible actions from items of type SYSTEM.ITEM_TYPE.capacity.id.
   *
   * @returns {Array} An array of visible actions from the items.
   */
  get visibleActions() {
    let allActions = []
    this.parent.items.forEach((item) => {
      if ([SYSTEM.ITEM_TYPE.capacity.id].includes(item.type) && item.actions.length > 0) {
        allActions.push(...item.visibleActions)
      }
    })
    return allActions
  }

  get attacks() {
    return this.parent.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.attack.id)
  }

  /**
   * Retourne toutes les actions visibles des attaques
   */
  get attacksActions() {
    let allActions = []
    this.parent.items.forEach((item) => {
      if ([SYSTEM.ITEM_TYPE.attack.id].includes(item.type) && item.actions.length > 0) {
        allActions.push(...item.visibleActions)
      }
    })
    return allActions
  }

  // #endregion

  /**
   * Add an attack as an embedded item
   * @param {COItem} attack
   * @returns {number} id of the created capacity
   */
  async addAttack(attack) {
    let attackData = attack.toObject()
    attackData.system.learned = true
    attackData = attackData instanceof Array ? attackData : [attackData]
    const newAttack = await this.parent.createEmbeddedDocuments("Item", attackData)
    // Update the source of all actions with the id of the new embedded capacity created
    let newActions = Object.values(foundry.utils.deepClone(newAttack[0].system.actions)).map((m) => {
      const action = new Action(
        m.source,
        m.indice,
        m.type,
        m.img,
        m.label,
        m.chatFlavor,
        m.properties.visible,
        m.properties.activable,
        m.properties.enabled,
        m.properties.temporary,
        m.conditions,
        m.modifiers,
        m.resolvers,
      )
      // Update the source and source's modifiers for the action
      action.updateSource(newAttack[0].id)
      return action
    })

    const updateActions = { _id: newAttack[0].id, "system.actions": newActions }
    await this.parent.updateEmbeddedDocuments("Item", [updateActions])

    return newAttack[0].id
  }
}

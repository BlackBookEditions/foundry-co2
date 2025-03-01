import { SYSTEM } from "../config/system.mjs"
import { BaseValue } from "./schemas/base-value.mjs"
import ActorData from "./actor.mjs"
import Utils from "../utils.mjs"

export default class EncounterData extends ActorData {
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.combat = new fields.SchemaField({
      init: new fields.EmbeddedDataField(BaseValue),
      def: new fields.EmbeddedDataField(BaseValue),
      dr: new fields.EmbeddedDataField(BaseValue),
    })

    schema.pasteData = new fields.HTMLField()
    schema.details = new fields.SchemaField({
      category: new fields.StringField({
        required: false,
        nullable: true,
        initial: Object.keys(SYSTEM.ENCOUNTER_CATEGORIES).find((key) => SYSTEM.ENCOUNTER_CATEGORIES[key] === SYSTEM.ENCOUNTER_CATEGORIES.humanoid),
        options: SYSTEM.ENCOUNTER_CATEGORIES,
      }),
      size: new fields.StringField({
        required: false,
        nullable: true,
        initial: Object.keys(SYSTEM.SIZES).find((key) => SYSTEM.SIZES[key] === SYSTEM.SIZES.medium),
        options: SYSTEM.SIZES,
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

    this._prepareAbilities()

    this._prepareHPMax()

    for (const [key, skill] of Object.entries(this.combat)) {
      console.debug(skill)
      // Somme du bonus de la feuille et du bonus des effets
      const bonuses = Object.values(skill.bonuses).reduce((prev, curr) => prev + curr)

      if (key === SYSTEM.COMBAT.init.id) {
        skill.value = skill.base + bonuses
      }

      if (key === SYSTEM.COMBAT.def.id) {
        skill.value = skill.base + bonuses
      }

      if (key === SYSTEM.COMBAT.dr.id) {
        skill.value = skill.base + bonuses
      }
    }
  }

  /**
   * Calcule la valeur et le mod des caractéristiques <br/>
   *              Valeur = base + bonus + modificateurs <br/>
   *              bonus est à la somme du bonus de la fiche et du champ dédié aux Active Effets <br/>
   *              modificateurs est la somme de tous les modificateurs modifiant la caractéristique, quelle que soit la source
   */
  _prepareAbilities() {
    for (const [key, ability] of Object.entries(this.abilities)) {
      // Somme du bonus de la feuille et du bonus des actives effects
      const bonuses = Object.values(ability.bonuses).reduce((prev, curr) => prev + curr)

      // Prise en compte d'un modifier qui donne un dé bonus
      if (this.bonusDiceModifiers) {
        let bonusDice = this.bonusDiceModifiers.find((m) => m.target === key)
        if (bonusDice) {
          ability.superior = true
        } else {
          ability.superior = false
        }
      }

      ability.value = ability.base + bonuses
      ability.tooltipValue = Utils.getTooltip(Utils.getAbilityName(key), ability.base).concat(Utils.getTooltip("Bonus", bonuses))
    }
  }

  _prepareHPMax() {
    const hpMaxBonuses = Object.values(this.attributes.hp.bonuses).reduce((prev, curr) => prev + curr)

    this.attributes.hp.max = this.attributes.hp.base + hpMaxBonuses
    this.attributes.hp.tooltip = Utils.getTooltip("Base ", this.attributes.hp.base).concat(Utils.getTooltip("Bonus", hpMaxBonuses))
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

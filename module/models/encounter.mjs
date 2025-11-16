import { SYSTEM } from "../config/system.mjs"
import { BaseValue } from "./schemas/base-value.mjs"
import ActorData from "./actor.mjs"
import Utils from "../helpers/utils.mjs"

export default class EncounterData extends ActorData {
  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    schema.attributes = new fields.SchemaField({
      movement: new fields.EmbeddedDataField(BaseValue, {
        label: "CO.label.long.movement",
        nullable: false,
        initial: { base: 10, unit: "m", bonuses: { sheet: 0, effects: 0 } },
      }),
      nc: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
      hp: new fields.SchemaField(
        {
          base: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          temp: new fields.NumberField({
            required: true,
            nullable: true,
            initial: null,
            integer: true,
          }),
          max: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          tempmax: new fields.NumberField({
            required: true,
            nullable: true,
            initial: null,
            integer: true,
          }),
          bonuses: new fields.SchemaField({
            sheet: new fields.NumberField({ ...requiredInteger, initial: 0 }),
            effects: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          }),
        },
        { label: "CO.label.long.hp", nullable: false },
      ),
      tempDm: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    })

    schema.combat = new fields.SchemaField({
      init: new fields.EmbeddedDataField(BaseValue),
      def: new fields.EmbeddedDataField(BaseValue),
      dr: new fields.EmbeddedDataField(BaseValue),
      crit: new fields.EmbeddedDataField(BaseValue),
      melee: new fields.EmbeddedDataField(BaseValue), // Va servir à stocker les modifiers
      ranged: new fields.EmbeddedDataField(BaseValue), // Va servir à stocker les modifiers
      magic: new fields.EmbeddedDataField(BaseValue), // Va servir à stocker les modifiers
    })

    schema.magic = new fields.NumberField({ ...requiredInteger, initial: 0 })

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
      // Pour indiquer les immunités ou propriétés spéciales
      properties: new fields.HTMLField(),
    })

    // Currencies
    const currencyField = (label) => {
      const schema = {
        value: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
      }
      return new fields.SchemaField(schema, { label })
    }

    schema.wealth = new fields.SchemaField(
      Object.values(SYSTEM.CURRENCY).reduce((obj, currency) => {
        obj[currency.id] = currencyField(currency.label)
        return obj
      }, {}),
    )

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    const updates = {
      prototypeToken: {
        sight: {
          enabled: false,
          visionMode: "basic",
        },
      },
    }

    const stats = this.parent._stats

    // Pour un acteur non dupliqué, non provenant d'un compendium et non exporté
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource) {
      // Image par défaut
      if (!foundry.utils.hasProperty(data, "img")) {
        if (SYSTEM.ACTOR_ICONS[this.parent.type]) {
          const img = SYSTEM.ACTOR_ICONS[this.parent.type]
          if (img) updates.img = img
        }
      }

      const sizemodifier = SYSTEM.TOKEN_SIZE[this.details.size]
      // Configuration du prototype token : size et scale
      foundry.utils.mergeObject(updates.prototypeToken, {
        width: sizemodifier.size,
        height: sizemodifier.size,
        texture: {
          scaleX: sizemodifier.scale,
          scaleY: sizemodifier.scale,
        },
      })

      if (game.modules.get("cof-base")?.active) {
        const items = []
        const item = await fromUuid(game.system.CONST.BASE_ITEM_UUID.hands)
        if (item) items.push(item)
        // The method updateSource will merge the arrays for embedded collections
        updates.items = items.map((i) => game.items.fromCompendium(i, { keepId: true, clearFolder: true }))
      }
    }

    this.parent.updateSource(updates)
  }

  get currentLevel() {
    return this.attributes.nc
  }

  prepareDerivedData() {
    super.prepareDerivedData()

    this._prepareAbilities()

    this._prepareHPMax()

    this._prepareMovement()

    this._prepareCombat()
  }

  _prepareCombat() {
    for (const [key, skill] of Object.entries(this.combat)) {
      // Somme du bonus de la feuille et du bonus des effets
      const bonuses = Object.values(skill.bonuses).reduce((prev, curr) => prev + curr)
      const combatModifiersBonus = this.computeTotalModifiersByTarget(this.combatModifiers, key)
      if (key !== SYSTEM.COMBAT.crit.id) {
        skill.value = skill.base + bonuses + combatModifiersBonus.total
      }

      if (key === SYSTEM.COMBAT.crit.id) {
        this.combat.crit.base = SYSTEM.BASE_CRITICAL

        // Somme des bonus des modifiers
        const critModifiers = this.computeTotalModifiersByTarget(this.combatModifiers, SYSTEM.COMBAT.crit.id)

        if (critModifiers.total > 0) {
          this.combat.crit.value = Math.max(16, SYSTEM.BASE_CRITICAL - critModifiers.total)
          this.combat.crit.tooltipValue = Utils.getTooltip("Bonus", critModifiers.total)
        } else {
          this.combat.crit.value = this.combat.crit.base
        }
      }
    }
  }

  _prepareMovement() {
    const movementModifiers = this.computeTotalModifiersByTarget(this.attributeModifiers, "mov")
    this.attributes.movement.value = this.attributes.movement.base + this.attributes.movement.bonuses.sheet + this.attributes.movement.bonuses.effects + movementModifiers.total
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
      const abilityModifiers = this.computeTotalModifiersByTarget(this.abilityModifiers, key)

      // Prise en compte d'un modifier qui donne un dé bonus
      if (this.bonusDiceModifiers) {
        let bonusDice = this.bonusDiceModifiers.find((m) => m.target === key)
        if (bonusDice) {
          ability.superior = true
        }
      }
      ability.modifiers = abilityModifiers.total

      ability.value = ability.base + bonuses + ability.modifiers
      ability.tooltipValue = Utils.getTooltip(Utils.getAbilityName(key), ability.base).concat(abilityModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
    }

    this.magic = this.abilities.vol.value + (this.attributes.nc === 0.5 ? 0 : this.attributes.nc)
  }

  _prepareHPMax() {
    const hpMaxBonuses = Object.values(this.attributes.hp.bonuses).reduce((prev, curr) => prev + curr)
    const hpMaxModifiers = this.computeTotalModifiersByTarget(this.attributeModifiers, "hp")
    this.attributes.hp.max = this.attributes.hp.base + hpMaxBonuses + hpMaxModifiers.total
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

  /**
   * Return the total modifier and the tooltip for the given target and an array of modifiers.
   * @param {Array} modifiers An array of modifier objects.
   * @param {SYSTEM.MODIFIERS.MODIFIER_TARGET} target The target for which the modifiers are filtered.
   **/
  computeTotalModifiersByTarget(modifiers, target) {
    if (!modifiers) return { total: 0, tooltip: "" }

    let modifiersByTarget = modifiers.filter((m) => m.target === target)

    let total = modifiersByTarget.map((m) => m.evaluate(this.parent)).reduce((acc, curr) => acc + curr, 0)

    let tooltip = ""
    for (const modifier of modifiersByTarget) {
      let partialTooltip = modifier.getTooltip(this.parent)
      if (partialTooltip !== null) tooltip += partialTooltip
    }

    return { total: total, tooltip: tooltip }
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

  // Parcourt toutes les actions de tous les items du personnage et met à jour la source des actions
  async updateAllActionsUuid() {
    const actorId = this.parent.id
    for (const item of this.parent.items) {
      // Capacités
      if ([SYSTEM.ITEM_TYPE.capacity.id].includes(item.type) && item.actions.length > 0) {
        // Pour une capacité on met à jour le path
        if (item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.path) {
          const { primaryType, primaryId, type, id } = foundry.utils.parseUuid(item.system.path)
          const newPath = [primaryType, actorId, type, id].flat().filterJoin(".")
          await item.update({ "system.path": newPath })
        }
        const actions = item.toObject().system.actions
        for (const action of actions) {
          const { primaryType, primaryId, type, id } = foundry.utils.parseUuid(action.source)
          const newSource = [primaryType, actorId, type, id].flat().filterJoin(".")
          action.source = newSource
          if (action.modifiers.length > 0) {
            for (const modifier of action.modifiers) {
              modifier.source = newSource
            }
          }
        }
        await item.update({ "system.actions": actions })
      }
    }
  }
}

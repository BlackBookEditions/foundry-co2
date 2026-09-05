import { SYSTEM } from "../config/system.mjs"
import { CompanionCombatValue, CompanionAbilityValue } from "./schemas/companion-value.mjs"
import { BaseValue } from "./schemas/base-value.mjs"
import ActorData from "./actor.mjs"
import Utils from "../helpers/utils.mjs"

export default class EncounterData extends ActorData {
  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    schema.abilities = new fields.SchemaField(
      Object.values(SYSTEM.ABILITIES).reduce((obj, ability) => {
        obj[ability.id] = new fields.EmbeddedDataField(CompanionAbilityValue, { label: ability.label, nullable: false })
        return obj
      }, {}),
    )

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
          formula: new foundry.data.fields.StringField({ required: true, nullable: false, initial: "0" }), // pour les compagnon, cas de PV = 5 * niv du maitre
        },
        { label: "CO.label.long.hp", nullable: false },
      ),
      tempDm: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    })

    schema.combat = new fields.SchemaField({
      init: new fields.EmbeddedDataField(CompanionCombatValue),
      def: new fields.EmbeddedDataField(CompanionCombatValue),
      dr: new fields.EmbeddedDataField(CompanionCombatValue),
      crit: new fields.EmbeddedDataField(CompanionCombatValue),
      melee: new fields.EmbeddedDataField(CompanionCombatValue), // Va servir à stocker les modifiers
      ranged: new fields.EmbeddedDataField(CompanionCombatValue), // Va servir à stocker les modifiers
      magic: new fields.EmbeddedDataField(CompanionCombatValue), // Va servir à stocker les modifiers
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

    schema.companion = new fields.SchemaField({
      isCompanion: new fields.BooleanField({ initial: false }),
      master: new fields.DocumentUUIDField({ type: "Actor" }),
    })

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
      const companionValue = this._resolveFormula(skill.formula) //0 si il n'est pas un companion
      if (key !== SYSTEM.COMBAT.crit.id) {
        if (skill.formula !== "0") skill.base = companionValue
        skill.value = skill.base + bonuses + combatModifiersBonus.total
      }

      if (key === SYSTEM.COMBAT.crit.id) {
        this.combat.crit.base = SYSTEM.BASE_CRITICAL

        // Si il s'agit d'un compagnon sa valeude critique peux potentiellement être liée à son maitre
        if (this.companion.isCompanion) {
          const compagnonValue = this._resolveFormula(this.combat.crit.formula)
          this.combat.crit.base = compagnonValue != 0 ? compagnonValue : SYSTEM.BASE_CRITICAL
        }

        // Somme des bonus des modifiers
        const critModifiers = this.computeTotalModifiersByTarget(this.combatModifiers, SYSTEM.COMBAT.crit.id)

        if (critModifiers.total > 0) {
          this.combat.crit.value = Math.max(16, this.combat.crit.base - critModifiers.total)
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
      const companionValue = this._resolveFormula(ability.formula) //0 si il n'est pas un companion
      if (ability.formula !== "0") ability.base = companionValue // la formula contient "0" par defaut si on a autre chose c'est que l'on a configuré la formula.
      ability.value = ability.base + bonuses + ability.modifiers
      ability.tooltipValue = Utils.getTooltip(Utils.getAbilityName(key), ability.base).concat(abilityModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
      if (this.companion.isCompanion) ability.tooltipValue = ability.tooltipValue.concat(Utils.getTooltip("Compagnon", companionValue))
    }

    this.magic = this.abilities.vol.value + (this.attributes.nc === 0.5 ? 0 : this.attributes.nc)
  }

  _prepareHPMax() {
    const hpMaxBonuses = Object.values(this.attributes.hp.bonuses).reduce((prev, curr) => prev + curr)
    const hpMaxModifiers = this.computeTotalModifiersByTarget(this.attributeModifiers, "hp")
    const companionValue = this._resolveFormula(this.attributes.hp.formula) //0 si il n'est pas un companion
    if (this.attributes.hp.formula !== "0") this.attributes.hp.base = companionValue // la formula contient "0" par defaut si on a autre chose c'est que l'on a configuré la formula.
    this.attributes.hp.max = this.attributes.hp.base + hpMaxBonuses + hpMaxModifiers.total
    this.attributes.hp.value = Math.min(this.attributes.hp.max, this.attributes.hp.value)
    this.attributes.hp.tooltip = Utils.getTooltip("Base ", this.attributes.hp.base).concat(Utils.getTooltip("Bonus", hpMaxBonuses))
    if (this.companion.isCompanion) this.attributes.hp.tooltip = this.attributes.hp.tooltip.concat(Utils.getTooltip("Compagnon", companionValue))
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

  /**
   * On active ou désactiva la liaison avec un maitre
   * @param {boolean} active Active (tue) ou désactive (false) la liaison
   */
  async toggleCompanion(active) {
    console.log("active", active)
    if (active) {
      // Si on active on met simplement la variable isCompanion à true et on affiche l'onglet supplémentaire dans la fiche de rencontre

      this.companion.isCompanion = true
      await this.parent.update({ "system.companion.isCompanion": this.companion.isCompanion })
    } else {
      // Si on désactive on devrait mettre la variable isCompanion à false ce qui devrait desactiver l'onglet mais on devrait remettre les valeurs de formula à "0" pour ne plus en tenir compte !
      this.companion.isCompanion = false
      await this.parent.update({ "system.companion.isCompanion": this.companion.isCompanion })
      await this.deleteMaster()
    }
  }

  /**
   *Va gérer les actions à faire lors de la suppression du maitre
   * @returns ne retourne rien
   */
  async deleteMaster() {
    if (this.companion.master === null) return
    const newAbilities = {}
    for (const [key, ability] of Object.entries(this.abilities)) {
      newAbilities[key] = { ...ability, formula: "0" } // Copie l'objet et modifie formula
    }
    // Créer une NOUVELLE référence pour combat
    const newCombat = {}
    for (const [key, skill] of Object.entries(this.combat)) {
      newCombat[key] = { ...skill, formula: "0" } // Copie l'objet et modifie formula
    }

    // Mettre à jour TOUTES les propriétés en UNE SEULE requête
    await this.parent.update({
      "system.abilities": newAbilities,
      "system.combat": newCombat,
      "system.attributes.hp.formula": "0",
      "system.companion.master": null,
    })
  }

  /**
   * Permet de remplacer des variables d'une formule de compagnon par leur valeur
   * @param {String} formula
   * @returns {Number} la valeur calculée
   */
  _resolveFormula(formula) {
    const numeric = Number(formula)
    if (!Number.isNaN(numeric)) return numeric // Si on a "0" ou une valeur sans formule on retourne directement la valeur
    //Ajout du master
    if (this.companion.isCompanion && this.companion.master) {
      const master = fromUuidSync(this.companion.master)
      if (master) {
        const evaluated = Utils.evaluateMasterFormula(formula, master)
        if (evaluated) return Number(evaluated)
        else return 0
      } else return 0
    } else return 0
  }
}

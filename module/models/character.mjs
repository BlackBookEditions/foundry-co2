import { SYSTEM } from "../config/system.mjs"
import { BaseValue } from "./schemas/base-value.mjs"
import ActorData from "./actor.mjs"
import Utils from "../utils.mjs"
import CoChat from "../chat.mjs"
import DefaultConfiguration from "../config/configuration.mjs"
export default class CharacterData extends ActorData {
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
      level: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
      encumbrance: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        encumbered: new fields.BooleanField({
          required: true,
          initial: false,
        }),
      }),
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
      xp: new fields.SchemaField(
        {
          max: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        },
        { label: "CO.label.long.xp", required: true, nullable: false },
      ),
      recovery: new fields.SchemaField({
        dice: new fields.StringField({ required: true, blank: true }),
      }),
    })

    schema.combat = new fields.SchemaField(
      Object.values(SYSTEM.COMBAT).reduce((obj, combat) => {
        const initial = {
          base: 0,
          ability: combat.ability,
          bonuses: {
            sheet: 0,
            effects: 0,
          },
        }
        obj[combat.id] = new fields.EmbeddedDataField(BaseValue, { label: combat.label, nullable: false, initial: initial })
        return obj
      }, {}),
    )

    schema.resources = new fields.SchemaField(
      Object.values(SYSTEM.RESOURCES).reduce((obj, resource) => {
        const initial = {
          base: 0,
          ability: resource.ability,
          bonuses: {
            sheet: 0,
            effects: 0,
          },
        }
        obj[resource.id] = new fields.EmbeddedDataField(BaseValue, { label: resource.label, nullable: false, initial: initial })
        return obj
      }, {}),
    )

    schema.details = new fields.SchemaField({
      biography: new fields.SchemaField({
        private: new fields.HTMLField(),
        public: new fields.HTMLField(),
      }),
      appearance: new fields.SchemaField({
        private: new fields.HTMLField(),
        public: new fields.HTMLField(),
      }),
      notes: new fields.SchemaField({
        private: new fields.HTMLField(),
        public: new fields.HTMLField(),
      }),
      size: new fields.StringField({
        required: false,
        nullable: true,
        initial: "medium",
      }),
      languages: new fields.ArrayField(new fields.StringField()),
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

  /** @override */
  prepareBaseData() {
    // Calcul de la base de PV sans le bonus de constitution
    // Au niveau 1 : 2 * PV de la famille
    // Pour chaque niveau supplémentaire : + PV de la famille
    const pvFromFamily = this.profile ? SYSTEM.FAMILIES[this.profile.system.family].hp : 0
    this.attributes.hp.base = 2 * pvFromFamily + (this.attributes.level - 1) * pvFromFamily
  }

  get fpFromFamily() {
    return this.profile ? SYSTEM.FAMILIES[this.profile.system.family].fp : 0
  }

  get rpFromFamily() {
    return this.profile ? SYSTEM.FAMILIES[this.profile.system.family].recoveryBonus : 0
  }

  /**
   * Retrieves the profile item from the items array.
   *
   * @returns {Object|undefined} The profile item if found, otherwise undefined.
   */
  get profile() {
    return this.parent.items.find((item) => item.type === SYSTEM.ITEM_TYPE.profile.id)
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
   * Gets the resource modifiers for the character.
   *
   * @returns {Array} An array of resource modifiers.
   */
  get resourceModifiers() {
    return this._getModifiers(SYSTEM.MODIFIERS_SUBTYPE.resource.id)
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
   * Retrieves an array of modifiers from various sources associated with the character.
   * The sources include features, profiles, capacities, and equipment.
   * Each source is checked for enabled modifiers of the specified type and subtype.
   * For features and profiles, the modifiers are in the item
   * for capacities and equipment, the modifiers are in the actions
   *
   * @param {string} subtype The subtype of the modifier.
   * @returns {Array} An array of modifiers.
   */
  _getModifiers(subtype) {
    const sources = ["features", "profiles", "capacities", "equipments"]
    let modifiersArray = []

    sources.forEach((source) => {
      let items = this.parent[source]
      if (items) {
        let allModifiers = items.reduce((mods, item) => mods.concat(item.enabledModifiers), []).filter((m) => m.subtype === subtype)
        modifiersArray.push(...allModifiers)
      }
    })

    return modifiersArray
  }

  async prepareDerivedData() {
    super.prepareDerivedData()

    this._prepareAbilities()

    this._prepareHPMax()

    this._prepareMovement()

    // Préparation des données de combat : Attaque de contact, attaque à distance, attaque magique, initiative, défense
    for (const [key, skill] of Object.entries(this.combat)) {
      if (key === SYSTEM.COMBAT.crit.id || key === SYSTEM.COMBAT.dr.id) {
        continue
      }
      // Somme du bonus de la feuille et du bonus des actives effects
      const bonuses = Object.values(skill.bonuses).reduce((prev, curr) => prev + curr)
      const abilityBonus = this.abilities[skill.ability].value

      if ([SYSTEM.COMBAT.melee.id, SYSTEM.COMBAT.ranged.id, SYSTEM.COMBAT.magic.id].includes(key)) {
        this._prepareAttack(key, skill, abilityBonus, bonuses)
      }

      if (key === SYSTEM.COMBAT.init.id) {
        this._prepareInit(skill, abilityBonus, bonuses)
      }

      if (key === SYSTEM.COMBAT.def.id) {
        this._prepareDef(skill, abilityBonus, bonuses)
      }
    }

    this._prepareCrit()

    this._prepareDR()

    for (const [key, skill] of Object.entries(this.resources)) {
      // Somme du bonus de la feuille et du bonus des actives effects
      const bonuses = Object.values(skill.bonuses).reduce((prev, curr) => prev + curr)

      // Points de chance  - Fortune Points - FP
      if (key === SYSTEM.RESOURCES.fortune.id) {
        this._prepareFP(skill, bonuses)
      }

      // Points de mana - Mana Points - MP
      if (key === SYSTEM.RESOURCES.mana.id) {
        this._prepareMP(skill, bonuses)
      }

      // Dés de récupération - Recovery Points - RP
      if (key === SYSTEM.RESOURCES.recovery.id) {
        this._prepareRP(skill, bonuses)
      }
    }

    // XP dépensés dans les capacités des voies
    this.attributes.xp.max = 3 + 2 * (this.attributes.level - 1)
    this._prepareVision()
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
        } else {
          ability.superior = false
        }
      }

      ability.modifiers = abilityModifiers.total

      ability.value = ability.base + bonuses + ability.modifiers
      ability.tooltipValue = Utils.getTooltip(Utils.getAbilityName(key), ability.base).concat(abilityModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
    }

    // Cas particulier de l'agilité : la valeur maximum est définie par l'armure. La formule est : le max est 8 - DEF de l'armure
    let maxAgility = 8
    let armors = this.parent.equippedArmors
    if (armors) {
      // Défense de la première armure équipée
      const armor = armors[0]
      if (armor) {
        const defense = armor.system.defense
        maxAgility = 8 - defense
      }
      if (this.abilities.agi.value > maxAgility) {
        this.abilities.agi.value = Math.min(this.abilities.agi.value, maxAgility)
        this.abilities.agi.tooltipValue = this.abilities.agi.tooltipValue.concat(Utils.getTooltip("Max armure", maxAgility))
      }
    }
  }

  _prepareHPMax() {
    const constitutionBonus = this.attributes.level * this.abilities.con.value
    const hpMaxBonuses = Object.values(this.attributes.hp.bonuses).reduce((prev, curr) => prev + curr)
    const hpMaxModifiers = this.computeTotalModifiersByTarget(this.attributeModifiers, "hp")

    this.attributes.hp.max = this.attributes.hp.base + constitutionBonus + hpMaxBonuses + hpMaxModifiers.total
    this.attributes.hp.tooltip = Utils.getTooltip("Base ", this.attributes.hp.base).concat(
      ` ${Utils.getAbilityName("con")} : `,
      constitutionBonus,
      hpMaxModifiers.tooltip,
      Utils.getTooltip("Bonus", hpMaxBonuses),
    )
  }

  _prepareMovement() {
    console.log(this.attributes.movement.bonuses.effects)
    this.attributes.movement.value = this.attributes.movement.base + this.attributes.movement.bonuses.sheet + this.attributes.movement.bonuses.effects
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

  /**
   * On regarde si un modifier modifie la vision
   */
  _prepareVision() {
    const modifiers = this.stateModifiers
    if (!modifiers) return { total: 0, tooltip: "" }
    let currentactor = this.parent
    let modifiersVision = modifiers.find((m) => m.target === "darkvision")

    if (modifiersVision && this.parent.prototypeToken.sight.visionMode !== "darkvision") {
      const prototypeToken = {}
      Object.assign(prototypeToken, {
        sight: { enabled: true, visionMode: "darkvision", range: modifiersVision.value, saturation: -1 },
        actorLink: true,
        disposition: 1,
      })
      this.parent?.updateSource({ prototypeToken })
      let targets = this.parent.getActiveTokens(true, true)
      for (let i = 0; i < targets.length; i++) {
        let sight = {}
        Object.assign(sight, { enabled: true, visionMode: "darkvision", range: modifiersVision.value, saturation: -1 })
        targets[i].updateSource({ sight })
      }
    }

    // Inversement si on a pas de darkvision
    if (!modifiersVision && this.parent.prototypeToken.sight?.visionMode === "darkvision") {
      // On le retire
      const prototypeToken = {}
      Object.assign(prototypeToken, {
        sight: { enabled: true, visionMode: "basic", range: 0, saturation: 0 },
        actorLink: true,
        disposition: 1,
      })
      this.parent?.updateSource({ prototypeToken })
      let targets = this.parent.getActiveTokens(true, true)
      for (let i = 0; i < targets.length; i++) {
        let sight = {}
        Object.assign(sight, { enabled: true, visionMode: "basic", range: 0, saturation: 0 })
        targets[i].updateSource({ sight })
      }
    }
  }

  _prepareAttack(key, skill, abilityBonus, bonuses) {
    // Le bonus de niveau est limité à 10
    const levelBonus = Math.min(this.attributes.level, 10)
    const combatModifiers = this.computeTotalModifiersByTarget(this.combatModifiers, key)
    skill.base = abilityBonus + levelBonus
    skill.tooltipBase = Utils.getTooltip(game.i18n.localize("CO.label.long.level"), levelBonus).concat(Utils.getTooltip(Utils.getAbilityName(skill.ability), abilityBonus))

    skill.value = skill.base + bonuses + combatModifiers.total
    skill.tooltipValue = skill.tooltipBase.concat(combatModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
  }

  /**
   * Dans COF : 10 + PER + Bonus Capacités
   * @param {*} skill
   * @param {*} abilityBonus
   * @param {*} bonuses
   */
  _prepareInit(skill, abilityBonus, bonuses) {
    const initModifiers = this.computeTotalModifiersByTarget(this.combatModifiers, SYSTEM.COMBAT.init.id)

    skill.base = DefaultConfiguration.baseInitiative()
    skill.tooltipBase = Utils.getTooltip("Base", skill.base)

    skill.base += abilityBonus
    skill.tooltipBase = skill.tooltipBase.concat(Utils.getTooltip(Utils.getAbilityName(skill.ability), abilityBonus))

    skill.value = skill.base + bonuses + initModifiers.total
    skill.tooltipValue = skill.tooltipBase.concat(initModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
  }

  /**
   * Calcule la défense
   * Dans COF : 10 + AGILITE + Modificateurs (Bonus Armure + Bonus Bouclier + Bonus Capacités)
   * @param {*} skill
   * @param {*} abilityBonus
   * @param {*} bonuses
   */
  _prepareDef(skill, abilityBonus, bonuses) {
    const defModifiers = this.computeTotalModifiersByTarget(this.combatModifiers, SYSTEM.COMBAT.def.id)

    skill.base = DefaultConfiguration.baseDefense()
    skill.tooltipBase = Utils.getTooltip("Base", skill.base)

    skill.base += abilityBonus
    skill.tooltipBase = skill.tooltipBase.concat(Utils.getTooltip(Utils.getAbilityName(skill.ability), abilityBonus))

    skill.value = skill.base

    // Ajout du bonus de l'armure
    const armorDef = this.parent.defenseFromArmor
    if (armorDef > 0) {
      skill.value += armorDef
      skill.tooltipBase = skill.tooltipBase.concat(Utils.getTooltip("Armure", armorDef))
    }

    // Ajout du bonus du bouclier
    const shieldDef = this.parent.defenseFromShield
    if (shieldDef > 0) {
      skill.value += shieldDef
      skill.tooltipBase = skill.tooltipBase.concat(Utils.getTooltip("Bouclier", shieldDef))
    }

    skill.value += bonuses + defModifiers.total
    skill.tooltipValue = skill.tooltipBase.concat(defModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
  }

  /**
   * Calcule la valeur du critique en ajoutant les bonus
   * Un bonus de 1 au critique donne une valeur de 19 au lieu de 20
   * La valeur minimum est 16
   */
  _prepareCrit() {
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

  /**
   * Calcule la valeur de la résistance aux dégâts en ajoutant les bonus
   */
  _prepareDR() {
    this.combat.dr.base = 0
    this.combat.dr.tooltipBase = Utils.getTooltip("Base", 0)

    // Somme des bonus des modifiers
    const drModifiers = this.computeTotalModifiersByTarget(this.combatModifiers, SYSTEM.COMBAT.dr.id)

    // Somme du bonus de la feuille et du bonus des actives effects
    const bonuses = Object.values(this.combat.dr.bonuses).reduce((prev, curr) => prev + curr)
    this.combat.dr.value = this.combat.dr.base + bonuses + drModifiers.total
    this.combat.dr.tooltipValue = this.combat.dr.tooltipBase.concat(drModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
  }

  /**
   * Calcule les points de chance
   * Dans COF : 2 + CHARISME + Modificateurs
   * Prepares the FP (Fortune Points) for a given skill by calculating its base value,
   * applying bonuses, and computing resource modifiers.
   *
   * @param {Object} skill The skill object to prepare FP for.
   * @param {number} bonuses The additional bonuses to apply to the skill's FP.
   */
  _prepareFP(skill, bonuses) {
    const baseFP = this._computeBaseFP()
    skill.base = baseFP.value
    skill.tooltipBase = baseFP.tooltip

    const resourceModifiers = this.computeTotalModifiersByTarget(this.resourceModifiers, SYSTEM.MODIFIERS_TARGET.fp.id)
    skill.max = skill.base + bonuses + resourceModifiers.total
    skill.tooltip = skill.tooltipBase.concat(resourceModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
  }

  /**
   * Computes the base FP (Force Points) for the character.
   *
   * The base FP is calculated as the sum of a base value (2), the character's charisma ability value,
   * and any additional FP from the character's family.
   * 2 + Charisma MOD + 1 (for the adventurer's family).
   *
   * @returns {Object} An object containing:
   *   - `value` {number}: The computed base FP value.
   *   - `tooltip` {string}: A tooltip string providing details on the components of the base FP.
   */
  _computeBaseFP() {
    const abilityBonus = this.abilities[this.resources.fortune.ability].value
    const baseFP = DefaultConfiguration.baseFortune()
    const value = baseFP + abilityBonus + this.fpFromFamily
    let tooltip = Utils.getTooltip("Base", baseFP)
    tooltip = tooltip.concat(Utils.getTooltip(Utils.getAbilityName(this.resources.fortune.ability), this.abilities.cha.value))
    if (this.fpFromFamily > 0) tooltip = tooltip.concat(Utils.getTooltip("Profil", this.fpFromFamily))
    return { value, tooltip }
  }

  /**
   * Calcule les points de mana
   * Dans COF : si le personnage a au moins un sort, VOLONTE + Nombre de sorts Modificateurs
   * Prepares the MP (Magic Points) for a given skill by calculating its base value,
   * applying resource modifiers, and adding any additional bonuses.
   *
   * @param {Object} skill The skill object to prepare MP for.
   * @param {number} bonuses Additional bonuses to be added to the skill's MP.
   */
  _prepareMP(skill, bonuses) {
    const baseMP = this._computeBaseMP()
    skill.base = baseMP.value
    skill.tooltipBase = baseMP.tooltip

    const resourceModifiers = this.computeTotalModifiersByTarget(this.resourceModifiers, SYSTEM.MODIFIERS_TARGET.mp.id)
    skill.max = skill.base + bonuses + resourceModifiers.total
    skill.tooltip = skill.tooltipBase.concat(resourceModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
  }

  /**
   * Computes the base MP (Magic Points) for the character.
   * Si le personnage a au moins une capacité signalée par un * (donc un sort), il a alors VOL + nb de sorts points de Mana
   * @returns {number} The base MP value. Returns 0 if the character has no spells.
   */
  _computeBaseMP() {
    let value = 0
    if (!this.hasSpells) return { value, tooltip: "Pas de sorts" }
    const nbSpells = this.nbSpells
    let tooltip = Utils.getTooltip("Nb de sorts", nbSpells)
    tooltip = tooltip.concat(Utils.getTooltip("Volonté", this.abilities.vol.value))
    return { value: this.abilities.vol.value + nbSpells, tooltip }
  }

  /**
   * Prepares the RP (Resource Points) for a given skill by computing its base value,
   * applying resource modifiers, and adding any additional bonuses.
   *
   * @param {Object} skill The skill object to prepare RP for.
   * @param {number} bonuses Additional bonuses to be added to the skill's RP.
   */
  _prepareRP(skill, bonuses) {
    const baseRP = this._computeBaseRP()
    skill.base = baseRP.value
    skill.tooltipBase = baseRP.tooltip

    const resourceModifiers = this.computeTotalModifiersByTarget(this.resourceModifiers, SYSTEM.MODIFIERS_TARGET.rp.id)
    skill.max = skill.base + bonuses + resourceModifiers.total
    skill.tooltip = skill.tooltipBase.concat(resourceModifiers.tooltip, Utils.getTooltip("Bonus", bonuses))
  }

  /**
   * Computes the base RP (Resource Points) for the character.
   *
   * The base RP is calculated as the sum of:
   * - A constant value of 2
   * - The character's Constitution ability value
   * - The RP value from the character's family : 1 dé supplémentaire pour la famille des mystiques
   *
   * @returns {number} The computed base RP value.
   */
  _computeBaseRP() {
    const baseRP = DefaultConfiguration.baseRecovery()
    const value = baseRP + this.abilities.con.value + this.rpFromFamily
    let tooltip = Utils.getTooltip("Base", baseRP)
    tooltip = tooltip.concat(Utils.getTooltip("Constitution", this.abilities.con.value))
    if (this.rpFromFamily > 0) tooltip = tooltip.concat(Utils.getTooltip("Profil", this.rpFromFamily))
    return { value, tooltip }
  }

  // #region accesseurs

  /**
   * Retrieves a list of spell items from the character's inventory : item of type capacity with property spell at true
   *
   * @returns {Array} An array of items that are of type 'CAPACITY' and are spells.
   */
  get spells() {
    return this.parent.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.isSpell && item.system.learned)
  }

  /**
   * Checks if the character has any spells.
   *
   * @returns {boolean} True if the character has spells, otherwise false.
   */
  get hasSpells() {
    return this.spells.length > 0
  }

  /**
   * Gets the number of spells : item of type capacity with property spell at true
   *
   * @returns {number} The number of spells.
   */
  get nbSpells() {
    return this.spells.length
  }

  /**
   * Gets the hit dice (hd) for the character : it's the recovery dice value from the character's profile
   *
   * @returns {number|undefined} The recovery dice value from the character's profile system, or undefined if not available.
   */
  get hd() {
    return this.profile?.system.recoveryDice ?? undefined
  }

  /**
   * Retourne Toutes les actions visibles des capacités et des équipements sous forme d'un tableau d'actions
   */
  async getVisibleActions() {
    let allActions = []
    for (const item of this.parent.items) {
      if ([SYSTEM.ITEM_TYPE.equipment.id, SYSTEM.ITEM_TYPE.capacity.id].includes(item.type) && item.actions.length > 0) {
        const itemActions = await item.getVisibleActions()
        allActions.push(...itemActions)
      }
    }
    return allActions
  }

  // #endregion

  useRecovery(withHpRecovery) {
    if (this.resources.recovery.value <= 0) return
    let hp = this.attributes.hp
    let rp = this.resources.recovery
    const level = this.attributes.level.max
    const modCon = this.abilities.con.mod
    if (!withHpRecovery) {
      rp.value -= 1
      this.update({ "system.resources.recovery": rp })
    } else {
      Dialog.confirm({
        title: game.i18n.format("CO.dialogs.spendRecoveryPoint.title"),
        content: game.i18n.localize("CO.dialogs.spendRecoveryPoint.content"),
        yes: async () => {
          const hd = this.hd
          const bonus = level + modCon
          const formula = `${hd} + ${bonus}`
          const roll = await new Roll(formula, {}).roll({ async: true })
          const toolTip = new Handlebars.SafeString(await roll.getTooltip())

          await new CoChat(this)
            .withTemplate("systems/co/templates/chat/healing-card.hbs")
            .withData({
              actorId: this.id,
              title: game.i18n.localize("CO.dialogs.spendRecoveryPoint.rollTitle"),
              formula: formula,
              total: roll.total,
              toolTip: toolTip,
            })
            .withRoll(roll)
            .create()

          hp.value += roll.total
          if (hp.value > hp.max) hp.value = hp.max
          rp.value -= 1
          this.update({ "system.resources.recovery": rp, "system.attributes.hp": hp })
        },
        defaultYes: false,
      })
    }
  }

  /**
   * Calculates the total experience points (XP) spent by the character.
   *
   * This function iterates through the character's paths and their associated capacities,
   * summing up the XP cost of each learned capacity. It also includes capacities that are
   * not associated with any paths.
   *
   * @returns {Promise<number>} The total XP spent by the character.
   */
  async getSpentXP() {
    const paths = this.parent.paths
    let xp = 0

    // Capacités des voies
    for (const path of paths) {
      const capacities = path.system.capacities
      for (const [index, capacityUuid] of capacities.entries()) {
        const capacity = await fromUuid(capacityUuid)
        if (capacity.system.learned) xp += capacity.system.getCost(index + 1)
      }
    }

    // Capacités hors voies
    const capacities = this.parent.capacitiesOffPaths
    for (const capacity of capacities) {
      if (capacity.system.learned) xp += capacity.system.getCost(null)
    }

    return xp
  }

  /**
   * Asynchronously calculates the available experience points (XP) for a character.
   *
   * @returns {Promise<number>} A promise that resolves to the available XP.
   */
  async getAvailableXP() {
    const spentXP = await this.getSpentXP()
    return this.attributes.xp.max - spentXP
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
}

import { SYSTEM } from "../config/system.mjs"
import { BaseValue } from "./schemas/base-value.mjs"
import ActorData from "./actor.mjs"
import Utils from "../utils.mjs"
import CoChat from "../chat.mjs"
import { CustomEffectData } from "./schemas/custom-effect.mjs"
import DefaultConfiguration from "../config/configuration.mjs"
import { Modifier } from "./schemas/modifier.mjs"
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

    schema.currentEffects = new fields.ArrayField(new fields.EmbeddedDataField(CustomEffectData))

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  get fpFromFamily() {
    return this.profile ? SYSTEM.FAMILIES[this.profile.system.family].fp : 0
  }

  get rpFromFamily() {
    return this.profile ? SYSTEM.FAMILIES[this.profile.system.family].recoveryBonus : 0
  }

  get currentLevel() {
    return this.attributes.level
  }

  /**
   * Retrieves the main profile item from the items array.
   *
   * @returns {Object|undefined} The main profile item if found, otherwise undefined.
   */
  get profile() {
    return this.parent.items.find((item) => item.type === SYSTEM.ITEM_TYPE.profile.id && item.system.mainProfile)
  }

  /**
   * Retrieves an array of modifiers from various sources associated with the character.
   * The sources include features, profiles, capacities, and equipment.
   * Each source is checked for enabled modifiers of the specified type and subtype.
   * Only modifiers of applyOn self or both should be considered.
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
   * Return the total modifier and the tooltip for the given target and an array of modifiers.
   * @param {Array} modifiers An array of modifier objects.
   * @param {SYSTEM.MODIFIERS.MODIFIER_TARGET} target The target for which the modifiers are filtered.
   **/
  computeTotalModifiersByTarget(modifiers, target) {
    if (!modifiers) return { total: 0, tooltip: "" }
    let modifiersByTarget = modifiers.filter((m) => m.target === target)

    // Ajout des modifiers qui affecte toutes les cibles
    // Attention on utilise "toutes les cibles uniquement sur un jet de competence ou une Caractéristique ! sinon on va le compter aussi pour le combat etc et on va doubler les bonus apres..."
    const liste = [
      SYSTEM.MODIFIERS_TARGET.agi.id,
      SYSTEM.MODIFIERS_TARGET.for.id,
      SYSTEM.MODIFIERS_TARGET.con.id,
      SYSTEM.MODIFIERS_TARGET.cha.id,
      SYSTEM.MODIFIERS_TARGET.int.id,
      SYSTEM.MODIFIERS_TARGET.vol.id,
      SYSTEM.MODIFIERS_TARGET.per.id,
    ]
    if (liste.includes(target)) modifiersByTarget.push(...modifiers.filter((m) => m.target === SYSTEM.MODIFIERS_TARGET.all.id && m.subtype !== SYSTEM.MODIFIERS_SUBTYPE.skill.id))
    let total = 0
    if (modifiersByTarget && modifiersByTarget.length > 0) total = modifiersByTarget.map((m) => m.evaluate(this.parent)).reduce((acc, curr) => acc + curr, 0)

    let tooltip = ""
    for (const modifier of modifiersByTarget) {
      let partialTooltip = modifier.getTooltip(this.parent)
      if (partialTooltip !== null) tooltip += partialTooltip
    }

    return { total: total, tooltip: tooltip }
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

    // Cas des points de vie à 1 : statut affaibli
    if (this.attributes.hp.value === 1 && !this.parent.statuses.has("weakened")) {
      if (this.parent.statuses.has("unconscious") && this.parent.getFlag("co", "statuses.unconsciousFromZeroHP")) {
        await this.parent.toggleStatusEffect("unconscious", { active: false })
        await this.parent.unsetFlag("co", "statuses.unconsciousFromZeroHP")
      }
      await this.parent.toggleStatusEffect("weakened", { active: true })
      await this.parent.setFlag("co", "statuses.weakenedFromOneHP", true)
    }

    // Cas des points de vie > 1 : statuts affaible et inconscient
    if (this.attributes.hp.value > 1) {
      if (this.parent.statuses.has("weakened") && this.parent.getFlag("co", "statuses.weakenedFromOneHP")) {
        await this.parent.toggleStatusEffect("weakened", { active: false })
        await this.parent.unsetFlag("co", "statuses.weakenedFromOneHP")
      }
      if (this.parent.statuses.has("unconscious") && this.parent.getFlag("co", "statuses.unconsciousFromZeroHP")) {
        await this.parent.toggleStatusEffect("unconscious", { active: false })
        await this.parent.unsetFlag("co", "statuses.unconsciousFromZeroHP")
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
    const hpMaxBonuses = Object.values(this.attributes.hp.bonuses).reduce((prev, curr) => prev + curr)
    const hpMaxModifiers = this.computeTotalModifiersByTarget(this.attributeModifiers, "hp")

    const nbProfiles = this.parent.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.profile.id).length
    // Profil unique
    if (nbProfiles === 1) {
      // Calcul de la base de PV sans le bonus de constitution
      // Au niveau 1 : 2 * PV de la famille
      // Pour chaque niveau supplémentaire : + PV de la famille
      const pvFromFamily = this.profile ? SYSTEM.FAMILIES[this.profile.system.family].hp : 0
      this.attributes.hp.base = 2 * pvFromFamily + (this.attributes.level - 1) * pvFromFamily
      const constitutionBonus = this.attributes.level * this.abilities.con.value

      this.attributes.hp.max = this.attributes.hp.base + constitutionBonus + hpMaxBonuses + hpMaxModifiers.total
      this.attributes.hp.tooltip = Utils.getTooltip("Base ", this.attributes.hp.base).concat(
        ` ${Utils.getAbilityName("con")} : `,
        constitutionBonus,
        hpMaxModifiers.tooltip,
        Utils.getTooltip("Bonus", hpMaxBonuses),
      )
    }
    // Profil hybride
    else if (nbProfiles > 1) {
      const tooltipBase = Utils.getTooltip("Base", this.attributes.hp.base)

      this.attributes.hp.max = this.attributes.hp.base + hpMaxBonuses + hpMaxModifiers.total
      this.attributes.hp.tooltip = tooltipBase.concat(hpMaxModifiers.tooltip, Utils.getTooltip("Bonus", hpMaxBonuses))
    }
  }

  _prepareMovement() {
    const movementModifiers = this.computeTotalModifiersByTarget(this.attributeModifiers, "mov")
    this.attributes.movement.value = this.attributes.movement.base + this.attributes.movement.bonuses.sheet + this.attributes.movement.bonuses.effects + movementModifiers.total
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
   * @returns {number,string} The computed base RP value and tooltip
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

  /**
   * Gère le processus de récupération pour un personnage, soit par un repos rapide, soit par un repos complet.
   *
   * @param {boolean} isFullRest Indique si la récupération est un repos complet (true) ou un repos rapide (false).
   * @returns {Promise<void>} Une promesse qui se résout lorsque le processus de récupération est terminé.
   */
  async useRecovery(isFullRest) {
    let hp = this.attributes.hp
    let rp = this.resources.recovery
    let mp = this.resources.mana
    const hd = this.hd

    // Récupération rapide
    if (!isFullRest) {
      if (rp.value <= 0) return ui.notifications.warn(game.i18n.localize("CO.notif.warningNoMoreRecoveryPoints"))
      const proceedFastRest = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CO.dialogs.fastRest.title") },
        content: game.i18n.localize("CO.dialogs.fastRest.content"),
        rejectClose: false,
        modal: true,
      })
      if (!proceedFastRest) return

      // Dépense d'un DR et récupération de PV
      const level = Math.round(this.attributes.level / 2) // +1/2 niveau
      const formula = `${hd} + ${level}`

      await this._applyRecovery(rp, hp, formula, game.i18n.localize("CO.dialogs.fastRest.title"))

      // Récupération des charges des capacités
      await this.recoverCapacityCharges(isFullRest)
    }

    // Récupération complète
    else {
      // Récupération du mana
      if (mp.value < mp.max) {
        const proceed = await foundry.applications.api.DialogV2.confirm({
          window: { title: `${game.i18n.localize("CO.dialogs.fullRest.title")} - ${game.i18n.localize("CO.dialogs.fullRest.manaTitle")}` },
          content: game.i18n.localize("CO.dialogs.fullRest.manaContent"),
          rejectClose: false,
          modal: true,
        })
        if (proceed) {
          mp.value = mp.max
          this.parent.update({ "system.resources.mana": mp })
        }
      }

      // Récupération d'un DR
      if (rp.value < rp.max) {
        rp.value += 1
        this.parent.update({ "system.resources.recovery": rp })
      }

      const proceedFullRestRollDice = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CO.dialogs.spendRecoveryPoint.title") },
        content: game.i18n.localize("CO.dialogs.spendRecoveryPoint.content"),
        rejectClose: false,
        modal: true,
      })

      if (proceedFullRestRollDice) {
        // Cas particulier : plus de DR avant la récupération
        const level = Math.round(this.attributes.level / 2) // +1/2 niveau
        let formula
        if (rp.value === 1) {
          formula = `${hd} + ${level}`
        } else {
          formula = `${this.hd.replace("d", "")}+${level}`
        }

        await this._applyRecovery(rp, hp, formula, game.i18n.localize("CO.dialogs.fullRest.title"))
      }

      // Récupération des charges des capacités
      await this.recoverCapacityCharges(isFullRest)
    }
  }

  /**
   * Recharge les charges d'utilisation des capacités lors des récupérations
   * @param {boolean} fullRest Indique s'il s'agit d'une récupération rapide (false) ou longue (true)
   */
  async recoverCapacityCharges(fullRest) {
    const capacities = this.parent.capacities
    if (capacities.length !== 0) {
      // TODO Optimiser pour faire un seul update à la fin
      for (const capacity of capacities) {
        // Une fréquence journalière a besoin d'une récupération complète pour recharger les charges
        if (capacity.system.frequency === SYSTEM.CAPACITY_FREQUENCY.daily.id && fullRest) {
          capacity.system.charges.current = capacity.system.charges.max
          await capacity.update({ "system.charges.current": capacity.system.charges.current })
        }
        // Une fréquence de combat est rechargée à chaque récupération
        if (capacity.system.frequency === SYSTEM.CAPACITY_FREQUENCY.combat.id) {
          capacity.system.charges.current = capacity.system.charges.max
          await capacity.update({ "system.charges.current": capacity.system.charges.current })
        }
      }
    }
  }

  async _applyRecovery(rp, hp, formula, title) {
    const roll = await new Roll(formula).roll()
    const toolTip = new Handlebars.SafeString(await roll.getTooltip())

    rp.value -= 1
    hp.value += roll.total
    hp.value = Math.min(hp.value, hp.max)

    new CoChat(this)
      .withTemplate("systems/co/templates/chat/healing-card.hbs")
      .withData({
        actorId: this.id,
        title: game.i18n.localize(title),
        label: game.i18n.format("CO.dialogs.restHpRecovered", { hp: roll.total }),
        formula: formula,
        total: roll.total,
        toolTip: toolTip,
      })
      .withRoll(roll)
      .create()
    this.parent.update({ "system.resources.recovery": rp, "system.attributes.hp": hp })
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

  async spendDR(nbDices, heal = false) {
    const current = this.resources.recovery.value
    if (current > 0) {
      let newValue = Math.max(current - nbDices, 0)
      await this.parent.update({ "system.resources.recovery.value": newValue })
    }
  }
}

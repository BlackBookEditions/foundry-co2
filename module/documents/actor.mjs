import { SYSTEM } from "../config/system.mjs"
import { Modifier } from "../models/schemas/modifier.mjs"
import { CustomEffectData } from "../models/schemas/custom-effect.mjs"
import { CORoll, COSkillRoll, COAttackRoll } from "./roll.mjs"
import Utils from "../utils.mjs"

/**
 * @class COActor
 * @classdesc
 * @extends {Actor}
 *
 * @function
 */
export default class COActor extends Actor {
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user)

    // Configure the default image
    if (SYSTEM.ACTOR_ICONS[this.type]) {
      const img = SYSTEM.ACTOR_ICONS[this.type]
      this.updateSource({ img })
    }
    // Configure prototype token settings
    if (this.type === "character") {
      const prototypeToken = {}

      Object.assign(prototypeToken, {
        sight: { enabled: true, visionMode: "basic" },
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      })

      this.updateSource({ prototypeToken })
    }

    const sizemodifier = SYSTEM.TOKEN_SIZE[this.system.details.size]
    // Prototype token size
    if (sizemodifier.size !== this.prototypeToken.width || sizemodifier.scale !== this.prototypeToken.texture.scaleX) {
      this.updateSource({ prototypeToken: { width: sizemodifier.size, height: sizemodifier.size, "texture.scaleX": sizemodifier.scale, "texture.scaleY": sizemodifier.scale } })
    }
  }

  getRollData() {
    const rollData = { ...this.system }

    rollData.agi = this.system.abilities.agi.value
    rollData.for = this.system.abilities.for.value
    rollData.con = this.system.abilities.con.value
    rollData.per = this.system.abilities.per.value
    rollData.cha = this.system.abilities.cha.value
    rollData.int = this.system.abilities.int.value
    rollData.vol = this.system.abilities.vol.value
    rollData.def = this.system.combat.def.value
    rollData.ini = this.system.combat.init.value

    if (this.type === "character") {
      rollData.niv = this.system.attributes.level
      rollData.atc = this.system.combat.melee.value
      rollData.atd = this.system.combat.ranged.value
      rollData.atm = this.system.combat.magic.value
    }

    if (this.type === "encounter") {
      rollData.nc = this.system.attributes.nc
      rollData.atm = this.system.magic
    }

    return rollData
  }

  // #region Accesseurs

  /**
   * Retourne  les Items de type equipment
   */
  get equipments() {
    return this.itemTypes.equipment
  }

  /**
   * Retourne  les Items de type feature
   */
  get features() {
    return this.itemTypes.feature
  }

  /**
   * Retourne  les Items de type feature et sous type peuple
   */
  get people() {
    return this.features.filter((i) => i.system.subtype === SYSTEM.FEATURE_SUBTYPE.people.id)
  }

  /**
   * Retourne  les Items de type path
   */
  get paths() {
    return this.itemTypes.path
  }

  /**
   * Retourne  les Items de type capacity
   */
  get capacities() {
    return this.itemTypes.capacity
  }

  /**
   * Retourne  les Items de type profile
   */
  get profiles() {
    return this.itemTypes.profile
  }

  get mainProfile() {
    if (this.profiles.length > 0) return this.profiles[0]
    return undefined
  }

  /**
   * Retourne  un tableau d'objets comprenant les voies et les capacités associées
   */
  get pathGroups() {
    let pathGroups = []
    this.paths.forEach((path) => {
      const capacitesId = path.system.capacities
        .map((uuid) => {
          return uuid ? foundry.utils.parseUuid(uuid).id : null
        })
        .filter((id) => id !== null)

      const capacities = capacitesId.map((id) => this.items.find((i) => i._id === id))

      pathGroups.push({
        path: path,
        items: capacities,
      })
    })
    return pathGroups
  }

  get inventory() {
    return {
      armors: this.armors,
      shields: this.shields,
      weapons: this.weapons,
      consumable: this.consumables,
      misc: this.misc,
    }
  }

  get learnedCapacities() {
    return this.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.learned)
  }

  get capacitiesOffPaths() {
    return this.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.path === null)
  }

  /**
   * Retourne les Items de type equipment et de sous-type armor
   */
  get armors() {
    return this.equipments.filter((item) => item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.armor.id)
  }

  /**
   * Retourne les Items de type equipment et de sous-type shield
   */
  get shields() {
    return this.equipments.filter((item) => item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.shield.id)
  }

  /**
   * Retourne les Items de type equipment et de sous-type weapon
   */
  get weapons() {
    return this.equipments.filter((item) => item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.weapon.id)
  }

  get misc() {
    return this.equipments.filter((item) => item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.misc.id)
  }

  /**
   * Retourne les Items de type equipment et de sous-type consumable
   */
  get consumables() {
    return this.equipments.filter((item) => item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.consumable.id)
  }

  get equippedEquipments() {
    return this.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.equipped)
  }

  /**
   * Retourne les Items équipés de type equipment et de sous-type weapon
   */
  get equippedWeapons() {
    return this.weapons.filter((item) => item.system.equipped)
  }

  /**
   * Retourne les Items équipés de type equipment et de sous-type armor
   */
  get equippedArmors() {
    return this.armors.filter((item) => item.system.equipped)
  }

  get mainArmor() {
    if (this.equippedArmors.length > 0) return this.equippedArmors[0]
    return undefined
  }

  /**
   * Retourne les Items équipés de type equipment et de sous-type shield
   */
  get equippedShields() {
    return this.shields.filter((item) => item.system.equipped)
  }

  get mainShield() {
    if (this.equippedShields.length > 0) return this.equippedShields[0]
    return undefined
  }

  /**
   * Renvoi true si l'acteur est en incapacité de faire quelque chose
   */
  get isIncapacitated() {
    if (this.system.attributes.hp.value === 0) return true
    if (this.hasEffect("immobilized") || this.hasEffect("paralysis") || this.hasEffect("stun") || this.hasEffect("unconscious") || this.hasEffect("dead")) return true
    return false
  }

  /**
   * Retourne Toutes les actions de tous les objets
   */
  get actions() {
    let allActions = []
    this.items.forEach((item) => {
      if (item.actions.length > 0) allActions.push(...item.actions)
    })
    return allActions
  }

  /**
   * Calcule la défense de l'armure et du bouclier équipés
   * Retourne  {Int} la somme des DEF
   */
  get defenseFromArmorAndShield() {
    return this.defenseFromArmor + this.defenseFromShield
  }

  /**
   * Calcule la valeur totale de défense des armures équipées.
   *
   * @returns {number} La valeur totale de défense de la première armure équipée, ou 0 si aucune armure n'est équipée.
   */
  get defenseFromArmor() {
    const armors = this.equippedArmors
    if (armors.length > 0) {
      const armor = armors[0]
      return armor.system.totalDefense
    }
    return 0
  }

  /**
   * Récupère la valeur totale de défense du premier bouclier équipé.
   *
   * @returns {number} La valeur totale de défense du premier bouclier équipé, ou 0 si aucun bouclier n'est équipé.
   */
  get defenseFromShield() {
    const armors = this.equippedShields
    if (armors.length > 0) {
      const armor = armors[0]
      return armor.system.totalDefense
    }
    return 0
  }

  /**
   * Retrieves the overload malus from the first equipped armor.
   *
   * @returns {number} The overload malus value from the first equipped armor, or 0 if no armors are equipped.
   */
  get malusFromArmor() {
    const armors = this.equippedArmors
    if (armors.length > 0) {
      const armor = armors[0]
      return -1 * armor.system.overloadMalus
    }
    return 0
  }

  get isUnlocked() {
    if (this.getFlag(game.system.id, "SheetUnlocked")) return true
    return false
  }

  /**
   * Checks if the actor has a specific effect.
   *
   * @param {string} effectid The ID of the effect to check.
   * @returns {boolean} Returns true if the actor has the effect, otherwise false.
   */
  hasEffect(effectid) {
    return this.statuses.has(effectid)
  }

  /**
   * Checks if the actor can use capacities based on their equipped armor and shields
   *
   * @returns {boolean} Returns true if the actor is trained with the equipped armor and/or shield
   */
  get canUseCapacities() {
    let armorTrained = true
    const armor = this.mainArmor
    if (armor) armorTrained = this.isTrainedWithArmor(armor.id)
    let shieldTrained = true
    const shield = this.mainShield
    if (shield) shieldTrained = this.isTrainedWithShield(shield.id)
    return armorTrained && shieldTrained
  }

  // #endregion

  // #region Méthodes publiques

  /**
   * Retourne Toutes les actions visibles des capacités et des équipements
   * Pour les capacités, ne retourne pas les actions des capacités dont l'armure est trop élevée
   */
  async getVisibleActions() {
    let allActions = []
    for (const item of this.items) {
      if (SYSTEM.ITEM_TYPE.equipment.id === item.type) {
        const itemActions = await item.getVisibleActions(this)
        allActions.push(...itemActions)
      }
      // Pour les capacités, une armure non maîtrisée empêche son utilisation
      if (SYSTEM.ITEM_TYPE.capacity.id === item.type && this.canUseCapacities) {
        const itemActions = await item.getVisibleActions(this)
        allActions.push(...itemActions)
      }
    }
    return allActions
  }

  /**
   * Retourne Toutes les actions visibles et activables des capacités et des équipements
   */
  async getVisibleActivableActions() {
    const actions = await this.getVisibleActions(this)
    return actions.filter((a) => a.properties.activable)
  }

  /**
   * Retourne Toutes les actions visibles, activables et temporaires des capacités et des équipements
   */
  async getVisibleActivableTemporaireActions() {
    const actions = await this.getVisibleActions(this)
    return actions.filter((a) => a.properties.activable && a.properties.temporary)
  }

  /**
   * Retourne Toutes les actions visibles et non activables des capacités et des équipements
   */
  async getVisibleNonActivableActions() {
    const actions = await this.getVisibleActions(this)
    return actions.filter((a) => !a.properties.activable)
  }

  /**
   * Retourne Toutes les actions visibles, non activables et non temporaires des capacités et des équipements
   */
  async getVisibleNonActivableNonTemporaireActions() {
    const actions = await this.getVisibleActions(this)
    return actions.filter((a) => !a.properties.activable && !a.properties.temporary)
  }

  /**
   * Return all skill modifiers
   * @param {string} ability str, dex ...
   * Retourne {Object} Name, value, description
   */
  getSkillBonuses(ability) {
    const modifiersByTarget = this.system.skillModifiers.filter((m) => m.target === ability)
    // Ajout des modifiers qui affecte toutes les cibles
    modifiersByTarget.push(...this.system.skillModifiers.filter((m) => m.target === SYSTEM.MODIFIERS_TARGET.all.id))
    // Si le modifier est d'origine d'un customEffectData il ne faut pas chercher sa source
    let bonuses = []
    for (const modifier of modifiersByTarget) {
      console.log(modifier)
      if (!modifier.parent) {
        const customeffect = this.system.currentEffects.find((e) => e.source === modifier.source)
        if (customeffect) {
          bonuses.push({
            sourceType: "CustomEffectData",
            name: customeffect.nom,
            description: customeffect.nom,
            pathType: "",
            value: modifier.evaluate(this),
            additionalInfos: "",
          })
        }
      } else {
        const sourceInfos = modifier.getSourceInfos(this)
        bonuses.push({
          sourceType: sourceInfos.sourceType,
          name: sourceInfos.name,
          description: sourceInfos.description,
          pathType: sourceInfos.pathType,
          value: modifier.evaluate(this),
          additionalInfos: modifier.additionalInfos,
        })
      }
    }
    return bonuses
  }

  /**
   * Retourne  l'objet correspondant à la clé
   * @param {*} key
   */
  getEmbeddedItemByKey(key) {
    return this.items.find((item) => item.system.key === key)
  }

  /**
   * Renvoi la liste des effets personnalisé actuellement sur l'acteur
   * @returns {Array<CustomEffectData>} Tableau de customEffectData
   */
  getCustomEffects() {
    return this.system.currentEffects
  }

  /**
   * Vérifie si le personnage est entraîné avec une arme
   * @param {*} itemId
   * @returns {boolean}
   */
  isTrainedWithWeapon(itemId) {
    const item = this.weapons.find((item) => item.id === itemId)
    if (!item) return null
    const profile = this.system.profile
    if (!profile) return null
    const training = item.system.martialCategory
    if (profile.system.martialTrainingsWeapons[training]) return true
    return false
  }

  /**
   * Vérifie si le personnage est entraîné avec une armure
   * @param {*} itemId
   * @returns {boolean}
   */
  isTrainedWithArmor(itemId) {
    const item = this.armors.find((item) => item.id === itemId)
    if (!item) return null
    const profile = this.system.profile
    if (!profile) return null
    const training = item.system.martialCategory
    if (profile.system.martialTrainingsArmors[training]) return true
    return false
  }

  /**
   * Vérifie si le personnage est entraîné avec un bouclier
   * @param {*} itemId
   * @returns {boolean}
   */
  isTrainedWithShield(itemId) {
    const item = this.shields.find((item) => item.id === itemId)
    if (!item) return null
    const profile = this.system.profile
    if (!profile) return null
    const training = item.system.martialCategory
    if (profile.system.martialTrainingsShields[training]) return true
    return false
  }

  /**
   * Active ou désactive un effet de statut spécifique CO
   * Assure que les effets de défense partielle et totale ne peuvent pas être actifs simultanément.
   *
   * @param {Object} [params={}] Les paramètres de la fonction.
   * @param {boolean} params.state L'état à définir pour l'effet (true pour activer, false pour désactiver).
   * @param {string} params.effectid L'ID de l'effet à basculer.
   * @returns {Promise<boolean>} Renvoi true si ça a été appliqué et false sinon (immunisé ?)
   *
   * @throws {Error} Si les effets de défense partielle et totale sont tentés d'être activés simultanément.
   */
  async activateCOStatusEffect({ state, effectid } = {}) {
    // On ne peut pas activer à la fois la défense partielle et la défense totale
    if (effectid === "partialDef" && state === true) {
      if (this.hasEffect("fullDef")) {
        return ui.notifications.warn(game.i18n.localize("CO.notif.cantUseAllDef"))
      }
    }
    if (effectid === "fullDef" && state === true) {
      if (this.hasEffect("partialDef")) {
        return ui.notifications.warn(game.i18n.localize("CO.notif.cantUseAllDef"))
      }
    }
    // Imunisé aux altération de mouvement ?
    if ((effectid === "stun" || effectid === "immobilized" || effectid === "paralysis") && state === true) {
      if (this.system.modifiers) {
        const state = this.system.modifiers.filter((m) => m.target === SYSTEM.MODIFIERS_TARGET.movementImpairment.id)
        if (state && state.length > 0) {
          // Immunisé on ne l'applique pas
          ui.notifications.info(`${this.name} ${game.i18n.localize("CO.label.long.movementImpairment")}`)
          return false
        }
      }
    }
    // Imunisé aux poisons ?
    if (effectid === "poison" && state === true) {
      if (this.system.modifiers) {
        const state = this.system.modifiers.filter((m) => m.target === SYSTEM.MODIFIERS_TARGET.poisonimmunity.id)
        if (state && state.length > 0) {
          // Immunisé on ne l'applique pas
          ui.notifications.info(`${this.name} ${game.i18n.localize("CO.label.long.poisonimmunity")}`)
          return false
        }
      }
    }

    let hasEffect = this.statuses.has(effectid)
    if (hasEffect && state === false) return await this.toggleStatusEffect(effectid, state)
    if (!hasEffect && state === true) return await this.toggleStatusEffect(effectid, state)
    return true
  }

  /**
   * Active ou désactive une action
   * @param {*} state true to enable the action, false to disable the action
   * @param {*} source uuid of the embedded item which is the source of the action
   * @param {*} indice indice of the action in the array of actions
   * @param {*} type define if it's an attack or just a damage
   * @param {*} shiftKey true if the shift key is pressed
     @param {string("attack","damage")} type  define if it's an attack or just a damage
   */
  async activateAction({ state, source, indice, type, shiftKey = null } = {}) {
    const item = await fromUuid(source)
    if (!item) return

    if (CONFIG.debug.co?.actions) console.debug(Utils.log(`COActor - activateAction`), state, source, indice, type, item)

    // Si l'arme a la propriété "reloadable", on vérifie si l'arme assez de munitions
    if (item.system.properties.reloadable && item.system.charges.current <= 0) {
      return ui.notifications.warn(game.i18n.localize("CO.notif.warningNoAmmo"))
    }

    // Si la capacité a des charges est ce qu'il lui en reste ?
    if (item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.hasFrequency && !item.system.hasCharges)
      return ui.notifications.warn(game.i18n.localize("CO.notif.warningNoCharge"))

    // TODO Incantation
    // Magie profane (famille des mages) : En revanche, il n’est pas possible d’utiliser un bouclier et une arme ou une arme dans chaque main tout en lançant des sorts de magie profane.
    // Magie divine (famille des mystiques) : respecter les armes autorisées

    // Profil hybride : gestion du lancement de sort avec une armure maitrisée mais trop lourde, ce qui implique un surcoût de mana
    const manaCostFromArmor = item.type === SYSTEM.ITEM_TYPE.capacity.id ? item.system.getManaCostFromArmor(this) : 0

    // Concentration accrue pour les sorts qui nécessitent une action d'attaque
    let manaConcentration = false
    if (item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.isSpell && item.system.isActionTypeAttack && shiftKey) {
      manaConcentration = true
    }

    // Gestion de la brûlure de mana pour les sorts
    let manaBurned = false
    let manaBurnedCost = 0
    // Si l'action consomme du mana, que la capacité est un sort et qu'on l'active, on vérifie que le nombre de PM restants est suffisant
    if (!item.system.actions[indice].properties.noManaCost && state && item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.isSpell) {
      const spellManaCost = item.system.manaCost + manaCostFromArmor - (manaConcentration ? 2 : 0)
      if (item.system.manaCost > 0) {
        if (this.system.resources.mana.value < spellManaCost) {
          const needed = spellManaCost - this.system.resources.mana.value
          const content = `Vous n'avez pas assez de mana : il vous manque ${needed} point(s) de mana. Voulez-vous tout de même lancer le sort en sacrifiant votre énergie vitale ?`
          const proceed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "Brûlure de mana" },
            content: content,
            rejectClose: false,
            modal: true,
          })
          if (!proceed) return
          manaBurned = true
          manaBurnedCost = needed
        }
      }
    }

    let results = []
    let allResolversTrue
    // Action avec une durée : changement de l'état de l'action
    if (item.system.actions[indice].properties.temporary) {
      if (CONFIG.debug.co?.actions) console.debug(Utils.log(`COActor - activateAction - Action avec une durée`), state, source, indice, type, shiftKey, item)

      const newActions = item.system.toObject().actions
      newActions[indice].properties.enabled = state
      await item.update({ "system.actions": newActions })
    }
    // Action instantanée
    else {
      if (CONFIG.debug.co?.actions) console.debug(Utils.log(`COActor - activateAction - Action instantanée`), state, source, indice, type, shiftKey, item)
      const action = foundry.utils.deepClone(item.system.actions[indice])
      // Recherche des resolvers de l'action
      let resolvers = Object.values(action.resolvers).map((r) => foundry.utils.deepClone(r))
      // Résolution de tous les resolvers avant de continuer
      results = await Promise.all(resolvers.map((resolver) => resolver.resolve(this, item, action, type)))

      // Si tous les resolvers ont réussi
      allResolversTrue = results.length > 0 && results.every((result) => result === true)

      if (results.length === 0 || allResolversTrue) {
        // Cas des items consommables
        if (item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.consumable.id) {
          // Diminution de la quantité et destruction si à 0 et destructible
          let quantity = item.system.quantity.current - 1
          if (quantity === 0 && item.system.quantity.destroyIfEmpty) {
            await this.deleteEmbeddedDocuments("Item", [item.id])
          } else {
            await item.update({ "system.quantity.current": quantity })
          }
        }
      }
    }

    // Pas de resolvers ou tous les resolvers ont été résolus avec succès
    if (results.length === 0 || allResolversTrue) {
      // Si c'est un sort et qu'on l'active, il faut consommer les Points de Mana
      if (!item.system.actions[indice].properties.noManaCost && state && item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.isSpell) {
        const spellManaCost = item.system.manaCost + manaCostFromArmor - (manaConcentration ? 2 : 0)

        if (spellManaCost > 0) {
          const newMana = Math.max(this.system.resources.mana.value - spellManaCost, 0)
          await this.update({ "system.resources.mana.value": newMana })

          // Brûlure de mana
          if (manaBurned) {
            const recoveryDice = this.system.hd
            if (recoveryDice) {
              const burnRoll = new Roll(`${manaBurnedCost}${recoveryDice}`)
              await burnRoll.roll()
              // TODO : Notifier la perte de PV
              burnRoll.toMessage()
              const newHP = Math.max(this.system.attributes.hp.value - burnRoll.total, 0)
              await this.update({ "system.attributes.hp.value": newHP })
            }
          }
        }
      }
      // Si c'est une capacité avec une charge il faut la consommer
      if (item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.hasFrequency && item.system.hasCharges) {
        item.system.charges.current = Math.max(item.system.charges.current - 1, 0)
        await item.update({ "system.charges.current": item.system.charges.current })
        if (item.system.charges.current === 0) {
          const newActions = item.system.toObject().actions
          newActions[indice].properties.enabled = false
          await item.update({ "system.actions": newActions })
        }
      }
    }

    return true
  }

  /**
   * Bascule l'état appris d'une capacité pour un acteur.
   * Si l'acteur apprend une capacité, le rang de la voie correspondante est augmenté.
   *
   * @param {string} capacityId L'ID de la capacité à basculer.
   * @param {boolean} state L'état appris souhaité de la capacité.
   * @returns {Promise<void>} Une promesse qui se résout lorsque l'opération est terminée.
   */
  async toggleCapacityLearned(capacityId, state) {
    let capacity = this.items.get(capacityId)
    if (!capacity) return

    // Rang actuel de la voie
    let path = await fromUuid(capacity.system.path)
    if (!path) return
    const currentRank = await path.system.computeRank()

    let newRank
    // Apprentissage d'une capacité
    if (state) {
      // RULE : Pour obtenir une capacité, il faut avoir un niveau minimal
      // Les capacités de rang 6 à 8 sont réservées aux voies de prestige
      newRank = currentRank + 1
      if (this.system.attributes.level < SYSTEM.CAPACITY_MINIMUM_LEVEL[newRank]) return ui.notifications.warn(game.i18n.localize("CO.notif.warningLevelTooLow"))
    }

    // Mise à jour de la capacité et de ses actions
    await this._toggleItemFieldAndActions(capacity, "learned", state)

    if (state) {
      // Mise à jour du rang de la voie correspondante
      await path.update({ "system.rank": currentRank + 1 })

      // Le rang est le coût en mana de la capacité
      await capacity.update({ "system.manaCost": newRank })
    }
  }

  /**
   * Equippe/Déséquippe un equipment du personnage
   * Change le champ equipped de l'equipement
   * @param {*} itemId
   * @param {*} bypassChecks True to ignore the control of the hands
   */
  async toggleEquipmentEquipped(itemId, bypassChecks) {
    // Contrôle usage des mains
    let item = this.items.get(itemId)
    if (item.system.usage.oneHand || item.system.usage.twoHand) {
      if (!this.canEquipItem(item, bypassChecks)) return
    }

    // Mise à jour de l'item et de ses actions
    const currentState = item.system.equipped
    await this._toggleItemFieldAndActions(item, "equipped", !currentState)
  }

  /**
   * Updates the size of the prototype token and active tokens based on the current size.
   *
   * @param {string} currentsize The current size identifier to update the token sizes.
   * @returns {Promise<void>} A promise that resolves when the token sizes have been updated.
   */
  async updateSize(currentsize) {
    const sizemodifier = SYSTEM.TOKEN_SIZE[currentsize]
    // Prototype token size
    if (sizemodifier.size !== this.prototypeToken.width || sizemodifier.scale !== this.prototypeToken.texture.scaleX) {
      await this.update({ prototypeToken: { width: sizemodifier.size, height: sizemodifier.size, "texture.scaleX": sizemodifier.scale, "texture.scaleY": sizemodifier.scale } })
    }
    // Active token sizes
    if (canvas.scene) {
      // Only tokens that are linked to the actor
      const tokens = this.getActiveTokens(true)
      const updates = []
      for (const token of tokens) {
        if (token.width !== sizemodifier.size || sizemodifier.scale !== this.prototypeToken.texture.scaleX)
          updates.push({ _id: token.id, width: sizemodifier.size, height: sizemodifier.size, "texture.scaleX": sizemodifier.scale, "texture.scaleY": sizemodifier.scale })
      }
      await canvas.scene.updateEmbeddedDocuments("Token", updates)
    }
  }

  /**
   * Consomme une unité de munitions pour l'objet donné s'il possède la propriété "reloadable".
   * Met à jour les charges actuelles de l'objet pour refléter le changement.
   *
   * @async
   * @param {Object} item L'objet représentant l'arme ou l'outil.
   * @param {Object} item.system Les données système de l'objet.
   * @param {Object} item.system.properties Les propriétés de l'objet.
   * @param {boolean} item.system.properties.reloadable Indique si l'objet est rechargeable.
   * @param {Object} item.system.charges Les données des charges de l'objet.
   * @param {number} item.system.charges.current Le nombre actuel de charges disponibles.
   * @returns {Promise<void>} Résout lorsque les charges de l'objet ont été mises à jour.
   */
  async consumeAmmunition(item) {
    // Si l'arme a la propriété "reloadable", on consomme une munition
    if (item.system.properties.reloadable) {
      let newCharges = Math.max(0, item.system.charges.current - 1)
      await item.update({ "system.charges.current": newCharges })
    }
  }

  /**
   * Acquire targets based on the specified target type and scope.
   *
   * @param {string} targetType The type of target to acquire. Can be "none", "self", "single", or "multiple".
   * @param {string} targetScope The scope of the target acquisition : allies, enemies, all.
   * @param {string} actionName The name of the action to be performed on the targets.
   * @param {integer} targetNumber The number maximum of targets.
   * @param {Object} [options={}] Additional options for target acquisition.
   * @returns {Array} An array of acquired targets.
   * @throws {Error} Throws an error if any target has an error.
   */
  acquireTargets(targetType, targetScope, targetNumber, actionName, options = {}) {
    if (!canvas.ready) return []
    let targets

    switch (targetType) {
      case "none":
        return []
      case "self":
        targets = this.getActiveTokens(true).map(this.#getTargetFromToken)
        break
      case "single":
        targets = this.#getTargets(actionName, targetScope, targetNumber, true)
        break
      case "multiple":
        targets = this.#getTargets(actionName, targetScope, targetNumber, false)
        break
    }

    // Throw an error if any target had an error
    for (const target of targets) {
      if (target.error) ui.notifications.error(target.error)
    }
    return targets
  }

  // #endregion

  // #region méthodes privées

  /**
   * Toggles the state of a specified field and updates the actions of an item.
   *
   * @param {Object} item The item to update.
   * @param {string} fieldName The name of the field to toggle.
   * @param {boolean} state The new state to set for the field.
   * @returns {Promise<void>} A promise that resolves when the item has been updated.
   *
   * @private
   */
  async _toggleItemFieldAndActions(item, fieldName, state) {
    let updateData = { [`system.${fieldName}`]: state }
    const nbActions = item.actions.length
    if (nbActions > 0) {
      let actions = item.system.toObject().actions
      for (let index = 0; index < nbActions; index++) {
        const action = actions[index]
        // Si c'est une action non activable, l'activer automatiquement
        if (!action.properties.activable) {
          action.properties.enabled = !action.properties.enabled
        } else {
          // Si c'est une action activable mais sans conditions, la rendre visible
          if (!action.hasConditions) {
            action.properties.visible = !action.properties.visible
          }
        }
      }

      foundry.utils.mergeObject(updateData, { "system.actions": actions })
    }
    await item.update(updateData)
  }

  /**
   * Determines if the actor can equip the given item.
   * Check if an item can be equiped, if one Hand or two Hands property is true
   *
   * @param {Object} item The item to be equipped.
   * @param {boolean} bypassChecks Whether to bypass the usual checks.
   * @returns {boolean} Returns true if the item can be equipped, otherwise false.
   */
  canEquipItem(item, bypassChecks) {
    if (!this._hasEnoughFreeHands(item, bypassChecks)) {
      ui.notifications.warn(game.i18n.localize("CO.notif.NotEnoughFreeHands"))
      return false
    }
    return true
  }

  /**
   * Checks if the actor has enough free hands to equip an item.
   *
   * @param {Object} item The item to be equipped.
   * @param {boolean} bypassChecks Whether to bypass the free hands check.
   * @returns {boolean} Returns true if the actor has enough free hands to equip the item, otherwise false.
   */
  _hasEnoughFreeHands(item, bypassChecks) {
    // Si le contrôle de mains libres n'est pas demandé, on renvoi Vrai
    let checkFreehands = game.settings.get("co", "checkFreeHandsBeforeEquip")
    if (!checkFreehands || checkFreehands === "none") return true

    // Si le contrôle est ignoré ponctuellement avec la touche MAJ, on renvoi Vrai
    if (bypassChecks && (checkFreehands === "all" || (checkFreehands === "gm" && game.user.isGM))) return true

    // Si l'objet est équipé, on tente de le déséquiper donc on ne fait pas de contrôle et on renvoi Vrai
    if (item.system.equipped) return true

    // Nombre de mains nécessaire pour l'objet que l'on veux équipper
    let neededHands = item.system.usage.twoHand ? 2 : 1

    // Calcul du nombre de mains déjà utilisées : on récupère les armes ou les boucliers équipés
    let itemsInHands = this.items.filter(
      (item) => (item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.weapon.id || item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.shield.id) && item.system.equipped,
    )
    let usedHands = itemsInHands.reduce((total, item) => total + (item.system.usage.twoHand ? 2 : 1), 0)

    return usedHands + neededHands <= 2
  }

  /**
   * Retrieves an item from the items of the actor using its UUID.
   *
   * @param {string} uuid The UUID of the item to retrieve.
   * @returns {Object|null} The item if found, otherwise null.
   */
  getItemFromUuid(uuid) {
    let { id } = foundry.utils.parseUuid(uuid)
    const item = this.items.get(id)
    if (item) return item
    return null
  }

  /**
   * Checks if there is an item with the specified key in the items array.
   *
   * @param {string} slug The key to search for in the items array.
   * @returns {boolean} Returns true if an item with the specified key exists, otherwise false.
   */
  hasItemWithKey(slug) {
    return this.items.some((item) => item.system.slug === slug)
  }

  /**
   * Retrieves an item from the items array that matches the given slug.
   *
   * @param {string} slug The slug to match against the item's system slug.
   * @returns {Object|undefined} The item with the matching slug, or undefined if no match is found.
   */
  getItemWithKey(slug) {
    return this.items.find((item) => item.system.slug === slug)
  }
  // #endregion

  // #region Méthode d'ajout et suppression des différents types d'item

  /**
   * Create a feature, and the linked modifiers, paths and capacities if they exist
   * @param {*} feature
   */
  async addFeature(feature) {
    let itemData = feature.toObject()
    if (itemData.system.subtype === SYSTEM.FEATURE_SUBTYPE.people.id) {
      if (!foundry.utils.isEmpty(this.people)) {
        return
      }
    }
    itemData = itemData instanceof Array ? itemData : [itemData]
    const newFeature = await this.createEmbeddedDocuments("Item", itemData)

    // TODO Vérifier s'il y a besoin de créer un Modifier
    // Update the source of all modifiers with the id of the new embedded feature created
    let newModifiers = foundry.utils
      .deepClone(newFeature[0].system.modifiers)
      .map((m) => new Modifier({ source: newFeature[0].uuid, type: m.type, subtype: m.subtype, target: m.target, value: m.value }))

    const updateModifiers = { _id: newFeature[0].id, "system.modifiers": newModifiers }

    await this.updateEmbeddedDocuments("Item", [updateModifiers])
    // Create all Paths
    let updatedPathsUuids = []
    for (const path of feature.system.paths) {
      let originalPath = await fromUuid(path)

      // Item is null if the item has been deleted in the compendium or in the world
      // TODO Add a warning message and think about a global rollback
      if (originalPath !== null) {
        const newPathUuid = await this.addPath(originalPath)
        updatedPathsUuids.push(newPathUuid)
      }
    }

    // Update the paths of the feature with ids of created paths
    const updatePaths = { _id: newFeature[0].id, "system.paths": updatedPathsUuids }
    await this.updateEmbeddedDocuments("Item", [updatePaths])

    // Create all Capacities which are linked to the feature
    let updatedCapacitiesUuids = []
    for (const capacity of feature.system.capacities) {
      let capa = await fromUuid(capacity)

      // Item is null if the item has been deleted in the compendium or in the world
      // TODO Add a warning message and think about a global rollback
      if (capa !== null) {
        const newCapacityUuid = await this.addCapacity(capa, null)
        updatedCapacitiesUuids.push(newCapacityUuid)
      }
    }

    // Update the capacities of the feature with ids of created capacities
    const updateCapacities = { _id: newFeature[0].id, "system.capacities": updatedCapacitiesUuids }
    await this.updateEmbeddedDocuments("Item", [updateCapacities])
  }

  /**
   * Create a profile, and the linked modifiers and paths if they exist
   * @param {COItem} profile
   * @returns {Promise<string>} A promise that resolves to the UUID of the newly created profile.
   */
  async addProfile(profile) {
    //
    if (this.profiles.length > 0) {
      return ui.notifications.warn(game.i18n.localize("CO.notif.profilAlreadyExist"))
    }

    let itemData = profile.toObject()
    // C'est le profil principal
    itemData.system.mainProfile = true
    itemData = itemData instanceof Array ? itemData : [itemData]
    const newProfile = await this.createEmbeddedDocuments("Item", itemData)
    if (newProfile[0].system.modifiers.length > 0) {
      // Update the source of all modifiers with the uuid of the new embedded profile created
      const newModifiers = newProfile[0].system.toObject().modifiers

      for (const modifier of newModifiers) {
        modifier.source = newProfile[0].uuid
      }

      await newProfile[0].update({ "system.modifiers": newModifiers })
    }

    // Create all Paths
    let updatedPathsUuids = []
    for (const path of profile.system.paths) {
      let originalPath = await fromUuid(path)

      // Item is null if the item has been deleted in the compendium or in the world
      // TODO Add a warning message and think about a global rollback
      if (originalPath !== null) {
        const newPathUuid = await this.addPath(originalPath, newProfile[0])
        updatedPathsUuids.push(newPathUuid)
      }
    }

    // Update the paths of the profile with ids of created paths
    await newProfile[0].update({ "system.paths": updatedPathsUuids })

    ui.notifications.warn(game.i18n.localize("CO.notif.warningProfileCreated"))
    return newProfile[0].uuid
  }

  /**
   * Adds a new path and its associated capacities to the system.
   *
   * @param {Object} path The path object to be added.
   * @param {Object|null} [profile=null] The profile object related to the path creation, if any.
   * @returns {Promise<string>} The UUID of the newly created path.
   *
   */
  async addPath(path, profile = null) {
    let itemData = path.toObject()
    // If path creation is related to a profile creation
    // Update maxDefenseArmor
    if (profile !== null) {
      itemData.system.maxDefenseArmor = profile.system.maxDefenseArmor
    }

    // Create the path
    const newPath = await this.createEmbeddedDocuments("Item", [itemData])
    let updatedCapacitiesUuids = []
    // Create all capacities
    for (const capacity of path.system.capacities) {
      let capa = await fromUuid(capacity)

      // Item is null if the item has been deleted in the compendium or in the world
      // TODO Add a warning message and think about a global rollback
      if (capa !== null) {
        const newCapacityUuid = await this.addCapacity(capa, newPath[0].uuid)
        updatedCapacitiesUuids.push(newCapacityUuid)
      }
    }
    // Update the array of capacities of the path with ids of created path
    await newPath[0].update({ "system.capacities": updatedCapacitiesUuids })

    return newPath[0].uuid
  }

  /**
   * Add a capacity as an embedded item
   * @param {COItem} capacity
   * @param {UUID} pathUuid Uuid of the Path if the capacity is linked to a path
   * @returns {Promise<string>} A promise that resolves to the UUID of the newly created capacity.
   */
  async addCapacity(capacity, pathUuid) {
    let capacityData = capacity.toObject()
    if (pathUuid !== null) capacityData.system.path = pathUuid
    // Sinon le path n'est plus null mais vaut "", il faut donc le mettre à null
    else capacityData.system.path = null

    // Learned the capacity if the capacity is not linked to a path
    if (pathUuid === null) capacityData.system.learned = true

    const newCapacity = await this.createEmbeddedDocuments("Item", [capacityData])

    // Update the source of all actions and all modifiers of the actions
    if (newCapacity[0].actions.length > 0) {
      const actions = newCapacity[0].toObject().system.actions
      for (const action of actions) {
        action.source = newCapacity[0].uuid
        // Update the source of all modifiers if there are some
        if (action.modifiers.length > 0) {
          for (const modifier of action.modifiers) {
            modifier.source = newCapacity[0].uuid
          }
        }
      }

      await newCapacity[0].update({ "system.actions": actions })
    }

    return newCapacity[0].uuid
  }

  /**
   * Add an equipment as an embedded item
   * @param {COItem} equipment
   * Retourne {number} id of the created path
   */
  async addEquipment(equipment) {
    let equipmentData = equipment.toObject()

    // Cas des objets stackable : on augmente juste la quantité de la quantité de l'objet déposé
    if (this.hasItemWithKey(equipmentData.system.slug)) {
      let item = this.getItemWithKey(equipmentData.system.slug)
      if (item?.system?.properties?.stackable) {
        let quantity = item.system.quantity.current + equipmentData.system.quantity.current
        if (item.system.quantity.max) {
          quantity = Math.min(quantity, item.system.quantity.max)
        }
        await item.update({ "system.quantity.current": quantity })
        return item.uuid
      }
    }

    // Création de l'objet
    const newEquipment = await this.createEmbeddedDocuments("Item", [equipmentData])

    // Update the source of all actions and all modifiers of the actions
    if (newEquipment[0].actions.length > 0) {
      const actions = newEquipment[0].toObject().system.actions
      for (const action of actions) {
        action.source = newEquipment[0].uuid
        // Update the source of all modifiers if there are some
        if (action.modifiers.length > 0) {
          for (const modifier of action.modifiers) {
            modifier.source = newEquipment[0].uuid
          }
        }

        await newEquipment[0].update({ "system.actions": actions })
      }
      return newEquipment[0].uuid
    }
  }

  /**
   * Supprime un item de type Capacity ou Feature
   * @param {*} itemId
   */
  deleteItem(itemId) {
    const item = this.items.find((item) => item.id === itemId)
    switch (item.type) {
      case SYSTEM.ITEM_TYPE.capacity.id:
      case SYSTEM.ITEM_TYPE.feature.id:
        return this.deleteEmbeddedDocuments("Item", [itemId])
      default:
        break
    }
  }

  /**
   * Deletes a feature and its linked paths and capacities.
   *
   * @param {string} featureUuId The UUID of the feature to delete.
   * @returns {Promise<void>} A promise that resolves when the feature and its linked paths and capacities are deleted.
   */
  async deleteFeature(featureUuId) {
    // Delete linked paths
    const feature = await fromUuid(featureUuId)
    if (!feature) return
    const pathsUuids = feature.system.paths
    for (const pathUuid of pathsUuids) {
      this.deletePath(pathUuid)
    }
    // Delete linked capacities
    const capacitiesUuids = feature.system.capacities
    for (const capacityUuid of capacitiesUuids) {
      this.deleteCapacity(capacityUuid)
    }
    this.deleteEmbeddedDocuments("Item", [feature.id])
  }

  /**
   * Deletes a profile and its linked paths.
   *
   * @param {string} profileId The ID of the profile to delete.
   */
  async deleteProfile(profileId) {
    // Delete linked paths
    const pathsUuids = this.items.get(profileId).system.paths
    for (const pathUuid of pathsUuids) {
      this.deletePath(pathUuid)
    }
    this.deleteEmbeddedDocuments("Item", [profileId])
  }

  /**
   * Deletes a path and its linked capacities based on the provided UUID.
   *
   * @param {string} pathUuid The UUID of the path to be deleted.
   * @returns {Promise<void>}  A promise that resolves when the deletion is complete.
   */
  async deletePath(pathUuid) {
    // Delete linked capacities
    const path = await fromUuid(pathUuid)
    if (path) {
      const capacitiesUuId = path.system.capacities
      const capacitiesId = capacitiesUuId.map((capacityUuid) => {
        const { id } = foundry.utils.parseUuid(capacityUuid)
        return id
      })
      this.deleteEmbeddedDocuments("Item", capacitiesId)
      this.deleteEmbeddedDocuments("Item", [path.id])
    }
  }

  /**
   * Supprime une capacité des Embedded items par son UUID.
   *
   * @async
   * @param {string} capacityUuid L'UUID de la capacité à supprimer.
   * @returns {Promise<void>}  Une promesse qui se résout lorsque la capacité est supprimée.
   */
  async deleteCapacity(capacityUuid) {
    const capacity = await fromUuid(capacityUuid)

    if (capacity) {
      this.deleteEmbeddedDocuments("Item", [capacity.id])
    }
  }
  // #endregion

  // #region Rolls

  /**
   * Lance un test de compétence pour l'acteur.
   *
   * @param {string} skillId L'ID de la compétence à lancer.
   * @param {Object} [options] Options pour le test de compétence.
   * @param {string} [options.rollMode] Le mode de lancer de dés à utiliser.
   * @param {string} [options.chatFlavor] Le message de chat.
   * @param {number} [options.bonus=0] Le bonus à ajouter au test.
   * @param {number} [options.malus=0] Le malus à soustraire du test.
   * @param {number} [options.critical=20] Le seuil critique pour le test.
   * @param {number} [options.bonusDice] Le nombre de dés bonus à ajouter au jet.
   * @param {number} [options.malusDice] Le nombre de dés malus à soustraire du jet.
   * @param {number} [options.difficulty] La difficulté du test.
   * @param {boolean} [options.oppositeRoll=false] Si le test est un jet opposé.
   * @param {boolean} [options.useDifficulty] Si la difficulté doit être utilisée : dépend de l'option du système displayDifficulty
   * @param {boolean} [options.showDifficulty] Si la difficulté doit être affichée : dépend de displayDifficulty et du user
   * @param {boolean} [options.withDialog=true] Si une boîte de dialogue doit être affichée ou non.
   * @param {Array} [options.targets] Les cibles du test.
   * @returns {Promise} Le résultat du test de compétence.
   */
  async rollSkill(
    skillId,
    {
      rollMode = undefined,
      chatFlavor = undefined,
      bonus = 0,
      malus = 0,
      critical = 20,
      bonusDice = undefined,
      malusDice = undefined,
      difficulty = undefined,
      oppositeRoll = false,
      useDifficulty = undefined,
      showDifficulty = undefined,
      withDialog = true,
      targets = undefined,
    } = {},
  ) {
    // Gestion de la visibilité du jet
    if (rollMode === undefined) {
      rollMode = game.settings.get("core", "rollMode")
    }

    // Gestion de la difficulté
    const difficultyTooltip = difficulty
    const displayDifficulty = game.settings.get("co", "displayDifficulty")
    if (useDifficulty === undefined) {
      if (displayDifficulty === "none") {
        useDifficulty = false
      } else {
        useDifficulty = true
        if (showDifficulty === undefined) {
          showDifficulty = displayDifficulty === "all" || (displayDifficulty === "gm" && game.user.isGM)
        }
      }
    } else {
      if (showDifficulty === undefined) {
        showDifficulty = displayDifficulty === "all" || (displayDifficulty === "gm" && game.user.isGM)
      }
    }

    // Si la difficulté dépend de la cible unique
    if (oppositeRoll && useDifficulty && targets === undefined) {
      if (difficulty && difficulty.includes("@cible")) {
        targets = this.acquireTargets("single", "all", 1, actionName)
        if (targets.length === 0) {
          difficulty = null
        }
        if (targets.length > 0) {
          // Enlève le target. de la difficulté
          difficulty = difficulty.replace(/@.*\./, "@")
          difficulty = CORoll.replaceFormulaData(difficulty, targets[0].actor.getRollData())
        }
      }

      // Si l'attaque demande un jet opposé contre la cible
      else if (difficulty && difficulty.includes("@oppose")) {
        targets = this.acquireTargets("single", "all", 1, actionName)
        if (targets.length === 0) {
          difficulty = null
        }
      }
    }

    // Encombrement de l'armure pour les jets d'agilité
    if (skillId === "agi") {
      malus = this.malusFromArmor
    }

    // Gestion des dés bonus et malus
    let bonusDices = 0
    let malusDices = 0

    if (bonusDice) bonusDices += bonusDice
    if (malusDice) malusDices += malusDice

    // Prise en compte d'un modifier qui donne un dé bonus
    if (this.system.bonusDiceModifiers) {
      let modifierBonusDice = this.system.bonusDiceModifiers.find((m) => m.target === skillId)
      if (modifierBonusDice) bonusDices += 1
    }
    if (this.system.malusDiceModifiers) {
      let modifierMalusDice = this.system.malusDiceModifiers.find((m) => m.target === skillId)
      if (modifierMalusDice) malusDices += 1
    }

    const totalDices = bonusDices - malusDices

    let formula = "1d20"
    let dice = "standard"
    if (totalDices > 0) {
      formula = "2d20kh"
      dice = "bonus"
    } else if (totalDices < 0) {
      formula = "2d20kl"
      dice = "malus"
    }

    const skillValue = foundry.utils.getProperty(this, `system.abilities.${skillId}`).value
    if (skillValue > 0) formula += `+${skillValue}`
    if (skillValue < 0) formula += `-${skillValue}`

    // Construction du message de chat
    if (!chatFlavor) chatFlavor = `${game.i18n.localize("CO.dialogs.skillCheck")} ${game.i18n.localize(`CO.abilities.long.${skillId}`)}`

    const skillBonuses = this.getSkillBonuses(skillId) // Récupère un tableau d'objets avec {name, description, value}
    const hasSkillBonuses = skillBonuses.length > 0

    const dialogContext = {
      rollMode,
      rollModes: CONFIG.Dice.rollModes,
      dice,
      formula,
      skillValue,
      actor: this,
      skillId,
      title: `${game.i18n.localize("CO.dialogs.skillCheck")} ${game.i18n.localize(`CO.abilities.long.${skillId}`)}`,
      flavor: chatFlavor,
      bonus,
      malus,
      critical,
      difficulty,
      difficultyTooltip,
      useDifficulty,
      showDifficulty,
      skillBonuses,
      hasSkillBonuses,
      totalSkillBonuses: 0,
      targets,
      hasTargets: targets?.length > 0,
    }

    let roll = await COSkillRoll.prompt(dialogContext, { withDialog: withDialog })
    if (!roll) return null

    let result = CORoll.analyseRollResult(roll)

    // Prépare le message de résultat
    const speaker = ChatMessage.getSpeaker({ actor: this, scene: canvas.scene })

    let targetsUuid = targets?.map((target) => target.uuid)

    await roll.toMessage({ style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "skill", system: { targets: targetsUuid, result: result }, speaker }, { rollMode: roll.options.rollMode })
  }

  /**
   * Lance une attaque et potentiellement un jet de dégâts pour un objet donné avec diverses options.
   *
   * @param {Object} item L'objet pour lequel lancer l'attaque.
   * @param {Object} [options] Les options pour le jet d'attaque.
   * @param {string} [options.rollMode="rollMode"] La visibilité du jet.
   * @param {boolean} [options.auto=false] Si le jet est automatique.
   * @param {string} [options.type="attack"] Le type de jet, soit "attack" soit "damage".
   * @param {string} [options.actionName=""] Le nom de l'action.
   * @param {string} [options.chatFlavor=""] Le message de l'action dans le chat.
   * @param {boolean} [options.useComboRolls=game.settings.get("co", "useComboRolls")] Si les jets doivent être combinés.
   * @param {number} [options.skillBonus=0] Le bonus de compétence pour le jet.
   * @param {number} [options.skillMalus=0] Le malus de compétence pour le jet.
   * @param {number} [options.damageBonus=0] Le bonus de dégâts pour le jet.
   * @param {number} [options.damageMalus=0] Le malus de dégâts pour le jet.
   * @param {number} [options.critical=undefined] Le seuil critique pour le jet.
   * @param {boolean} [options.bonusDice=undefined] Si des dés bonus sont utilisés.
   * @param {boolean} [options.malusDice=undefined] Si des dés malus sont utilisés.
   * @param {number} [options.difficulty=undefined] La difficulté du jet.
   * @param {boolean} [options.useDifficulty=undefined] Si la difficulté doit être utilisée.
   * @param {boolean} [options.showDifficulty=undefined] Si la difficulté doit être affichée.
   * @param {boolean} [options.withDialog=true] Si une boîte de dialogue doit être affichée pour le jet.
   * @param {string} [options.skillFormula=undefined] La formule pour le jet de compétence.
   * @param {string} [options.skillFormulaTooltip=""] L'infobulle pour la formule de compétence.
   * @param {string} [options.damageFormula=undefined] La formule pour le jet de dégâts.
   * @param {string} [options.damageFormulaTooltip=""] L'infobulle pour la formule de dégâts.
   * @param {UUID[]} [options.targets=undefined] Les cibles de l'attaque.
   * @returns {Promise<null|Array>} Le résultat du jet, ou null si le jet a été annulé.
   */
  async rollAttack(
    item,
    {
      rollMode = undefined,
      auto = false,
      type = "attack",
      useComboRolls = game.settings.get("co", "useComboRolls"),
      actionName = "",
      chatFlavor = "",
      skillBonus = 0,
      skillMalus = 0,
      damageBonus = 0,
      damageMalus = 0,
      critical = undefined,
      bonusDice = undefined,
      malusDice = undefined,
      difficulty = undefined,
      useDifficulty = undefined,
      showDifficulty = undefined,
      withDialog = true,
      skillFormula = undefined,
      skillFormulaTooltip = "",
      damageFormula = undefined,
      damageFormulaTooltip = "",
      targets = undefined,
    } = {},
  ) {
    // Si l'arme a la propriété "reloadable", on vérifie si l'arme assez de munitions
    if (item.system.properties.reloadable && item.system.charges.current <= 0) {
      return ui.notifications.warn(game.i18n.localize("CO.notif.warningNoAmmo"))
    }

    // Gestion de la visibilité du jet
    if (rollMode === undefined) {
      rollMode = game.settings.get("core", "rollMode")
    }

    // Gestion de la difficulté
    const difficultyTooltip = difficulty
    let oppositeRoll = false
    if (!auto && useDifficulty === undefined) {
      const displayDifficulty = game.settings.get("co", "displayDifficulty")
      if (displayDifficulty === "none") {
        useDifficulty = false
      } else {
        useDifficulty = true
        if (showDifficulty === undefined) {
          showDifficulty = displayDifficulty === "all" || (displayDifficulty === "gm" && game.user.isGM)
        }
      }
    } else {
      if (!auto && showDifficulty === undefined) {
        showDifficulty = displayDifficulty === "all" || (displayDifficulty === "gm" && game.user.isGM)
      }
    }
    // Si la difficulté dépend de la cible unique
    if (!auto && useDifficulty && targets === undefined) {
      if (difficulty && difficulty?.includes("@cible")) {
        targets = this.acquireTargets("single", "all", 1, actionName)
        if (targets.length === 0) {
          difficulty = null
        }
        if (targets.length > 0) {
          // Enlève le target. de la difficulté
          difficulty = difficulty.replace(/@.*\./, "@")
          difficulty = CORoll.replaceFormulaData(difficulty, targets[0].actor.getRollData())
        }
      }

      // Si l'attaque demande un jet opposé contre la cible
      else if (difficulty && difficulty.includes("@oppose")) {
        oppositeRoll = true
        targets = this.acquireTargets("single", "all", 1, actionName)
        if (targets.length === 0) {
          difficulty = null
        }
      }
    }

    // Gestion du critique
    if (critical === undefined || critical === "") {
      critical = this.system.combat.crit.value
    }

    // Gestion des dés bonus et malus
    let bonusDices = 0
    let malusDices = 0

    // Gestion du dé bonus : en fonction de la formule, on déduit le type d'attaque et on cherche dans les modifiers
    if (this.system.hasBonusDiceForAttack(Utils.getAttackTypeFromFormula(skillFormulaTooltip))) bonusDices += 1

    // Maitrise de l'arme : Si le personnage utilise une arme qu’il ne maîtrise pas, il subit un dé malus au test d’attaque.
    if (item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.weapon.id) {
      if (!this.isTrainedWithWeapon(item.id)) malusDices += 1
    }

    if (bonusDice) bonusDices += bonusDice
    if (malusDice) malusDices += malusDice

    const totalDices = bonusDices - malusDices
    let formula = "1d20"
    let dice = "standard"
    if (totalDices > 0) {
      formula = "2d20kh"
      dice = "bonus"
    } else if (totalDices < 0) {
      formula = "2d20kl"
      dice = "malus"
    }

    // Construction du message de chat
    if (chatFlavor === "") chatFlavor = `${item.name} ${actionName}`

    const dialogContext = {
      rollMode,
      rollModes: CONFIG.Dice.rollModes,
      actor: this,
      auto,
      type,
      dice,
      useComboRolls,
      actionName: actionName,
      title: `${item.name} ${actionName}`,
      flavor: chatFlavor,
      skillBonus,
      skillMalus,
      damageBonus,
      damageMalus,
      critical,
      difficulty,
      difficultyTooltip,
      useDifficulty,
      showDifficulty,
      oppositeRoll,
      initialSkillFormula: skillFormula,
      formulaAttack: `${formula} + ${skillFormula}`,
      formulaAttackTooltip: skillFormulaTooltip,
      formulaDamage: damageFormula,
      formulaDamageTooltip: damageFormulaTooltip,
      targets,
      hasTargets: targets?.length > 0,
    }

    let rolls = await COAttackRoll.prompt(dialogContext, { withDialog: withDialog })
    if (!rolls) return null

    let results = rolls.map((roll) => CORoll.analyseRollResult(roll))

    // Prépare le message de résultat
    const speaker = ChatMessage.getSpeaker({ actor: this, scene: canvas.scene })

    let targetsUuid = targets?.map((target) => target.uuid)

    const linkedRoll = rolls.length > 1 ? rolls[1].toJSON() : null

    // Jet d'attaque
    if (type === "attack") {
      // Affichage du jet d'attaque
      await rolls[0].toMessage(
        {
          speaker,
          style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          type: "action",
          system: { subtype: "attack", targets: targetsUuid, result: results[0], linkedRoll },
        },
        { rollMode: rolls[0].options.rollMode },
      )

      // TODO Afficher uniquement si c'est un succès
      // Affichage du jet de dégâts dans le cas d'un jet combiné, si ce n'est pas un jet opposé et que l'attaque est un succès
      if (game.settings.get("co", "useComboRolls") && !rolls[0].options.oppositeRoll && results[0].isSuccess) {
        if (rolls[1])
          await rolls[1].toMessage(
            { style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "action", system: { subtype: "damage", targets: targetsUuid }, speaker },
            { rollMode: rolls[1].options.rollMode },
          )
      }
    }

    // Jet de dégâts
    else if (type === "damage") {
      await rolls[0].toMessage(
        { style: CONST.CHAT_MESSAGE_STYLES.OTHER, type: "action", system: { subtype: "damage", targets: targetsUuid }, speaker },
        { rollMode: rolls[0].options.rollMode },
      )
    }

    // Si l'attaque a lieu avec une arme qui a la propriété "reloadable", on consomme une munition
    if (item.system.properties.reloadable) {
      await this.consumeAmmunition(item)
    }
    return results
  }

  /**
   * Fonction assurant les jet de dé pour le soin
   * @param {COItem} item Item à l'origine du soin (ex : Restauration mineure de prêtre)
   * @param {object} param1 Elements permettant le calcul du soin :
   * @param {string} param1.actionName  action déclencheur
   * @param {string} param1.healFormula formule utilisée pour le soin
   * @param {string}  param1.targetType : indique si on se cible soit-même, ou d'autres personnes etc.
   * @param {Array<COActor>} param1.targets : une liste d'acteurs ciblés
   */
  async rollHeal(item, { actionName = "", healFormula = undefined, targetType = SYSTEM.RESOLVER_TARGET.none.id, targets = [] } = {}) {
    let roll = new Roll(healFormula)
    await roll.roll()
    if (targetType === SYSTEM.RESOLVER_TARGET.self.id) {
      this.applyHealAndDamage(roll.total)
    } else if (targetType === SYSTEM.RESOLVER_TARGET.single.id || targetType === SYSTEM.RESOLVER_TARGET.multiple.id) {
      if (game.user.isGM) Hooks.callAll("applyHealing", targets, this.name, roll.total)
      else {
        const uuidList = targets.map((obj) => obj.uuid)
        game.socket.emit(`system.${SYSTEM.ID}`, {
          action: "heal",
          data: {
            targets: uuidList,
            healAmount: roll.total,
            fromUserId: this.uuid,
          },
        })
      }
    }
  }

  /**
   * Applique les soins sur soi meme
   * Positif les degats péridiques sont traités comme des dégats et devrait être réduit ou amplifié en fonction de résistance/vulnérabilité (voir plus tard).
   * Negatif les degats péridiques sont traités comme des soins et ne devrait pas être affecté par des résistance ou vulnérabilité.
   * @param {integer} healValue heal or damageValue (heal < 0 and damage > 0)
   */
  async applyHealAndDamage(healValue) {
    let hp = this.system.attributes.hp
    if (healValue > 0) {
      // Si ce sont des degat il faut déduire la Résistance
      healValue -= this.system.combat.dr.value
      if (healValue < 0) healValue = 0
    }
    hp.value -= healValue
    if (hp.value > hp.max) hp.value = hp.max
    if (hp.value < 0) {
      hp.value = 0
      if (this.type !== "character") this.toggleStatusEffect("dead", true)
    }
    this.update({ "system.attributes.hp": hp })

    let message = ""
    if (healValue > 0) {
      message = game.i18n.localize("CO.notif.damaged").replace("{actorName}", this.name).replace("{amount}", healValue.toString())
    } else {
      message = game.i18n.localize("CO.notif.healed").replace("{actorName}", this.name).replace("{amount}", Math.abs(healValue).toString())
    }

    await ui.chat.processMessage(message, { actor: this._id, alias: this.name })
  }
  // #endregion

  // #region Méthodes internes
  /**
   * Extracts target information from a given token.
   *
   * @param {Object} token The token object containing actor and name information.
   * @param {Object} token.actor The actor associated with the token.
   * @param {string} token.actor.uuid The unique identifier of the actor.
   * @param {string} token.name The name of the token.
   * @returns {Object} An object containing the token, actor, actor's UUID, and token's name.
   * @private
   */
  #getTargetFromToken(token) {
    return { token, actor: token.actor, uuid: token.actor.uuid, name: token.name }
  }

  #getTargets(actionName, scope, number, single) {
    const tokens = game.user.targets
    let errorAll

    // Too few targets
    if (tokens.size < 1) {
      return []
    }

    // Too many targets
    if ((single && tokens.size > 1) || (!single && tokens.size > number)) {
      errorAll = game.i18n.format("CO.notif.warningIncorrectTargets", {
        number: single ? 1 : number,
        action: actionName,
      })
    }

    // Test each target
    const targets = []
    for (const token of tokens) {
      const t = this.#getTargetFromToken(token)
      if (errorAll) t.error = errorAll
      if (scope === "allies" && t.token.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) targets.push(t)
      else if (scope === "enemies" && t.token.document.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) targets.push(t)
      else if (scope === "all") targets.push(t)
      if (!this.token) continue
      if (token === this.token) {
        t.error = game.i18n.localize("CO.notif.warningCannotTargetSelf")
        continue
      }
    }
    return targets
  }
  // #endregion

  /* -------------------------------------------- */
  /*  Combat Encounters and Turn Order            */
  /* -------------------------------------------- */

  /**
   * On va supprimer les customEffect restant surl'acteur
   * @param {COCombat} combat
   */
  combaEnding(combat) {
    if (this.system.currentEffects) {
      for (let i = this.system.currentEffects.length - 1; i >= 0; i--) {
        this.deleteCustomEffect(this.system.currentEffects[i])
      }
    }
  }

  /**
   * Supprime un customEffet de l'acteur
   * @param {CustomEffectData} customEffect
   */
  async deleteCustomEffect(customEffect) {
    // Supprime le statut
    if (customEffect.statuses.length > 0) {
      for (const status of customEffect.statuses) {
        await this.activateCOStatusEffect({ state: false, effectid: status })
      }
    }
    this.system.currentEffects.splice(this.system.currentEffects.indexOf(customEffect), 1)
    this.update({ "system.currentEffects": this.system.currentEffects })
  }

  /**
   * On applique les effets supplémentaires
   * @param {CustomEffectData} effect : custom effect appliqué sur l'acteur probablement à cause d'un skill
   */
  async applyCustomEffect(effect) {
    // Si j'ai déjà ce debuff je peux pas le cumuler !
    const debuf = this.system.currentEffects.find((c) => c.slug === effect.slug)
    if (debuf) return
    // On doit maintenant déterminer le round de combat
    await this.startApplyingCustomEffect(effect, game.combat.round)
  }

  /**
   * Commence à appliquer l'effet en l'initialisant et en activant les différents status
   * @param {CustomEffectData} effect
   * @param {integer} round
   */
  async startApplyingCustomEffect(effect, round) {
    const newEffect = effect.toObject()
    newEffect.modifiers = effect.modifiers
    // Console.log("newEffect : ", newEffect)
    newEffect.startedAt = round
    if (newEffect.unit === SYSTEM.COMBAT_UNITE.round) {
      newEffect.lastRound = newEffect.startedAt + newEffect.duration
    } else {
      newEffect.lastRound = newEffect.startedAt + Math.round(newEffect.duration / CONFIG.time.roundTime)
    }
    console.log("lastRound:", newEffect.lastRound, "duration :", newEffect.duration, "startedAt", newEffect.startedAt)
    // Applique le statut
    if (newEffect.statuses && newEffect.statuses.length > 0) {
      for (const status of newEffect.statuses) {
        let result = await this.activateCOStatusEffect({ state: true, effectid: status })
        if (result === false) return false // On applique pas l'effet s'il y a une immunité (cas d'un result === false)
      }
    }

    let currentEffects = foundry.utils.deepClone(this.system.currentEffects)
    currentEffects.push(newEffect)
    await this.update({ "system.currentEffects": currentEffects })

    // Si il y a des dommage on les applique dès le premier round
    if (effect.formula) {
      await this.applyDamageOverTime()
    }
    return true
  }

  /**
   * Actions that occur at the beginning of an Actor's turn in Combat.
   * This method is only called for one User who has ownership permission over the Actor.
   */
  async onStartTurn() {
    // Re-prepare data and re-render the actor sheet
    this.reset()
    this._sheet?.render(false)
    console.log(`C'est au tour de ${this.name} de jouer`)
    // Apply damage-over-time before recovery
    await this.applyDamageOverTime()
  }

  /* -------------------------------------------- */

  /**
   * L'actions est déclenché lorsqu'un acteur termine son tour de combat.
   * Cette méthode est uniquement appelée sur l'utilisateur qui a des droits sur l'acteur.
   */
  onEndTurn() {
    // Re-prepare data and re-render the actor sheet
    this.reset()
    this._sheet?.render(false)
    console.log(`Le tour de ${this.name} est terminé`)
    // Retire les custom Effect qui se terminent à la fin du tour
    this.expireEffects(false)
  }

  /* -------------------------------------------- */

  /**
   * Actions déclenchée lorsqu'un acteur quitte le combat tracker.
   */
  onLeaveCombat() {
    // Re-prepare data and re-render the actor sheet
    this.reset()
    this._sheet?.render(false)
    for (let i = this.system.currentEffects.length - 1; i >= 0; i--) {
      this.deleteCustomEffect(this.system.currentEffects[i])
    }
  }

  /* -------------------------------------------- */

  /**
   * Applique les effets de degats/soins qui sont actuellement actif sur l'acteur.
   * Positif les degats péridiques sont traités comme des dégats et devrait être réduit ou amplifié en fonction de résistance/vulnérabilité (voir plus tard).
   * Negatif les degats péridiques sont traités comme des soins et ne devrait pas être affecté par des résistance ou vulnérabilité.
   * @returns {Promise<void>}
   */
  async applyDamageOverTime() {
    for (const effect of this.system.currentEffects) {
      // Ici on devrait tenir compte du type d'energie (feu/glace etc) et d'eventuelle resistance/vulnerabilite à voir plus tard
      if (!effect.a || effect.formula.length === 0) continue
      // Doit on jeter un dé ou c'est une valeur fixe ?
      const diceInclude = effect.formula.match("d[0-9]{1,}")
      let formulResult = effect.formula
      if (diceInclude) {
        const roll = new Roll(formulResult)
        await roll.evaluate()
        formulResult = roll.total
      }
      await this.applyHealAndDamage(formulResult)
    }
  }

  /* -------------------------------------------- */

  /**
   * Expire active effects whose durations have concluded at the end of the Actor's turn.
   * @param {boolean} start       Is it the start of the turn (true) or the end of the turn (false)   *
   */
  expireEffects(start = true) {
    for (let i = this.system.currentEffects.length - 1; i >= 0; i--) {
      if (this.system.currentEffects[i].startedAt + this.system.currentEffects[i].duration <= game.combat.round) {
        this.deleteCustomEffect(this.system.currentEffects[i])
      }
    }
  }

  // #endregion
}

import { SYSTEM } from "../config/system.mjs"
import { Modifier } from "../models/schemas/modifier.mjs"
import { COSkillRoll, COAttackRoll } from "./roll.mjs"
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

  get equippedWeapons() {
    return this.weapons.filter((item) => item.system.equipped)
  }

  /**
   * Retourne les Items équipés de type equipment et de sous-type armor
   */
  get equippedArmors() {
    return this.armors.filter((item) => item.system.equipped)
  }

  /**
   * Retourne les Items équipés de type equipment et de sous-type shield
   */
  get equippedShields() {
    return this.shields.filter((item) => item.system.equipped)
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
   * Accesseur permettant de d'obtenir un des effets actif sur l'acteur. Retourne true ou false
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
    const armor = this.equippedArmors[0]
    if (armor) armorTrained = this.isTrainedWithArmor(armor.id)
    let shieldTrained = true
    const shield = this.equippedShields[0]
    if (shield) shieldTrained = this.isTrainedWithShield(shield.id)
    return armorTrained && shieldTrained
  }

  /**
   * Calcule le coût en mana basé sur l'armure équipée.
   * Le nombre de PM supplémentaires à dépenser pour lancer le sort est égal au bonus de DEF de l’armure portée (ne pas tenir compte d’un éventuel bonus magique de l’armure).
   * @returns {number} Le coût en mana supplémentaire.
   */
  get manaCostFromArmor() {
    const armor = this.equippedArmors[0]
    const profile = this.profiles[0]
    if (profile && armor) {
      const maxDefenseArmor = profile.system.maxDefenseArmor
      const totalDefense = armor.system.defense
      return Math.max(totalDefense - maxDefenseArmor, 0)
    }
    return 0
  }

  // #endregion

  // #region Méthodes publiques

  /**
   * Retourne Toutes les actions visibles des capacités et des équipements
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
    let bonuses = []
    for (const modifier of modifiersByTarget) {
      const sourceInfos = modifier.getSourceInfos(this)
      bonuses.push({ name: sourceInfos.name, value: modifier.evaluate(this), description: sourceInfos.description })
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
   * Active ou désactive un effet de statut
   * @param {*} state true to enable the effect, false to disable the effect
   * @param {*} effectname  id
   * @param {*} indice  indice of the action in the array of actions
     @param {string("attack","damage")} type  define if it's an attack or just a damage
   */
  async activateCOStatusEffect({ state, effectid } = {}) {
    
    //On ne peux pas activer à la fois la defense partielle et la defense totale    
    if(effectid == "partialDef" && state === true)
    {      
        if(this.hasEffect("fullDef"))
        {
          //TODO : envoyer un message au jour pour lui dire qu'il ne peux pas utilsier les deux en meme temps
          return
        }        
    }
    if(effectid == "fullDef" && state === true)
      {        
          if(this.hasEffect("partialDef"))
          {
            //TODO : envoyer un message au jour pour lui dire qu'il ne peux pas utilsier les deux en meme temps
            return
          }
      }
    this.toggleStatusEffect(effectid, state)
  }

  /**
   * Active ou désactive une action
   * @param {*} state true to enable the action, false to disable the action
   * @param {*} source  uuid of the embedded item which is the source of the action
   * @param {*} indice  indice of the action in the array of actions
     @param {string("attack","damage")} type  define if it's an attack or just a damage
   */
  async activateAction({ state, source, indice, type, shiftKey = null } = {}) {
    const item = await fromUuid(source)
    if (!item) return

    if (CONFIG.debug.co?.actions) console.debug(Utils.log(`COActor - activateAction`), state, source, indice, type, item)

    // TODO Incantation
    // Magie profane (famille des mages) : En revanche, il n’est pas possible d’utiliser un bouclier et une arme ou une arme dans chaque main tout en lançant des sorts de magie profane.
    // Magie divine (famille des mystiques) : respecter les armes autorisées

    // Gestion du lancement de sort avec une armure non autorisée
    const manaCostFromArmor = this.manaCostFromArmor

    // Concentration accrue pour les sorts qui nécessitent une action d'attaque
    let manaConcentration = false
    if (item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.isSpell && item.system.isActionTypeAttack && shiftKey) {
      manaConcentration = true
    }

    // Gestion de la brûlure de mana pour les sorts
    let manaBurned = false
    let manaBurnedCost = 0
    // Si l'action consomme du mana, que la capacité un sort et qu'on l'active, on vérifie que le nombre de PM restants est suffisant
    if (!item.system.actions[indice].properties.noManaCost && state && item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.isSpell) {
      const spellManaCost = item.system.manaCost + manaCostFromArmor - (manaConcentration ? 2 : 0)
      if (item.system.manaCost > 0) {
        if (this.system.resources.mana.value < spellManaCost) {
          const needed = spellManaCost - this.system.resources.mana.value
          const content = `Vous n'avez pas assez de mana : il vous manque ${needed} points de mana. Voulez-vous tout de même lancer le sort en sacrifiant votre énergie vitale ?`
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

          // Brülure de mana
          if (manaBurned) {
            const recoveryDice = this.system.hd
            if (recoveryDice) {
              const burnRoll = new Roll(`${manaBurnedCost}${recoveryDice}`)
              await burnRoll.roll()
              // TODO : Notifier la perte de PV
              burnRoll.toMessage()
              await this.update({ "system.attributes.hp.value": this.system.attributes.hp.value - burnRoll.total })
            }
          }
        }
      }
    }

    return true
  }

  /**
   * Apprend/désapprend une capacité du personnage
   * Change le champ learned de la capacit
   * Met à jour le rank de la voie correspondante
   * @param {*} capacityId
   */
  async toggleCapacityLearned(capacityId) {
    let capacity = this.items.get(capacityId)
    if (!capacity) return

    // Rang actuel de la voie
    let path = await fromUuid(capacity.system.path)
    if (!path) return
    const currentRank = await path.system.computeRank()

    // RULE : Pour obtenir une capacité, il faut avoir un niveau minimal
    // Les capacités de rang 6 à 8 sont réservées aux voies de prestige
    const newRank = currentRank + 1
    if (this.system.attributes.level < SYSTEM.CAPACITY_MINIMUM_LEVEL[newRank]) return ui.notifications.warn(game.i18n.localize("CO.notif.warningLevelTooLow"))

    // Mise à jour de la capacité et de ses actions
    await this._toggleItemFieldAndActions(capacity, "learned")

    // Mise à jour du rang de la voie correspondante
    await path.update({ "system.rank": currentRank + 1 })

    // Le rang est le coût en mana de la capacité
    await capacity.update({ "system.manaCost": newRank })
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
    await this._toggleItemFieldAndActions(item, "equipped")
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

  // #endregion

  // #region méthodes privées

  /**
   * Toggle the field of the items and the actions linked
   * @param {*} item    obket à modifier
   * @param {*} fieldName exemple : equipped
   */
  async _toggleItemFieldAndActions(item, fieldName) {
    let fieldValue = item.system[fieldName]

    let updateData = { [`system.${fieldName}`]: !fieldValue }
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

  // #region Méthode d'ajout et suppression d'item

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
    let itemData = profile.toObject()
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
   * @param {string} [options.dice="1d20"] Le type de dé à lancer.
   * @param {number} [options.bonus=0] Le bonus à ajouter au test.
   * @param {number} [options.malus=0] Le malus à soustraire du test.
   * @param {number} [options.critical=20] Le seuil critique pour le test.
   * @param {boolean} [options.superior=false] Si la compétence est supérieure.
   * @param {boolean} [options.weakened=false] Si la compétence est affaiblie.
   * @param {number} [options.difficulty=10] La difficulté du test.
   * @param {boolean} [options.showDifficulty=true] Si la difficulté doit être affichée.
   * @param {boolean} [options.withDialog=true] Si une boîte de dialogue doit être affichée.
   * @returns {Promise} Le résultat du test de compétence.
   */
  async rollSkill(
    skillId,
    { dice = "1d20", bonus = 0, malus = 0, critical = 20, superior = false, weakened = false, difficulty = undefined, showDifficulty = undefined, withDialog = true } = {},
  ) {
    if (showDifficulty === undefined) showDifficulty = game.settings.get("co", "displayDifficulty")

    // Encombrement de l'armure pour les jets d'agilité
    if (skillId === "agi") {
      malus = this.malusFromArmor
    }

    const dialogContext = {
      dice: dice,
      actor: this,
      skillId: skillId,
      label: `${game.i18n.localize("CO.dialogs.skillCheck")} ${game.i18n.localize(`CO.abilities.long.${skillId}`)}`,
      bonus: bonus,
      malus: malus,
      skillValue: foundry.utils.getProperty(this, `system.abilities.${skillId}`).value,
      critical: critical,
      superior: superior ? superior : foundry.utils.getProperty(this, `system.abilities.${skillId}`).superior,
      weakened: weakened,
      difficulty: difficulty,
      showDifficulty: showDifficulty,
      skillBonuses: this.getSkillBonuses(skillId), // Récupère un tableau d'objets avec {name, description, value}
      totalSkillBonuses: 0,
    }

    let roll = await COSkillRoll.prompt(dialogContext, { withDialog: withDialog })
    if (!roll) return null

    // Prépare le message de résultat
    const speaker = ChatMessage.getSpeaker({ actor: this, scene: canvas.scene })
    const messageData = { speaker }

    await roll.toMessage(messageData)
  }

  /**
   * Lance une attaque et potentiellement un jet de dégâts pour un objet donné avec diverses options.
   *
   * @param {Object} item L'objet pour lequel lancer l'attaque.
   * @param {Object} [options] Les options pour le jet d'attaque.
   * @param {boolean} [options.auto=false] Si le jet est automatique.
   * @param {string} [options.type="attack"] Le type de jet, soit "attack" soit "damage".
   * @param {string} [options.actionName=""] Le nom de l'action.
   * @param {string} [options.dice="1d20"] La formule de dés pour le jet.
   * @param {number} [options.bonus=0] Le bonus au jet.
   * @param {number} [options.malus=0] Le malus au jet.
   * @param {number} [options.critical=20] Le seuil critique pour le jet.
   * @param {boolean} [options.bonusDice=undefined] Si des dés bonus sont utilisés.
   * @param {boolean} [options.malusDice=undefined] Si des dés malus sont utilisés.
   * @param {boolean} [options.superior=false] Si le jet est supérieur.
   * @param {boolean} [options.weakened=false] Si le jet est affaibli.
   * @param {number} [options.difficulty=10] La difficulté du jet.
   * @param {boolean} [options.showDifficulty=undefined] Si la difficulté doit être affichée.
   * @param {boolean} [options.withDialog=true] Si une boîte de dialogue doit être affichée pour le jet.
   * @param {string} [options.skillFormula=undefined] La formule pour le jet de compétence.
   * @param {string} [options.skillFormulaTooltip=""] L'infobulle pour la formule de compétence.
   * @param {string} [options.damageFormula=undefined] La formule pour le jet de dégâts.
   * @param {string} [options.damageFormulaTooltip=""] L'infobulle pour la formule de dégâts.
   * @param options.targets
   * @returns {Promise<null|Array>} Le résultat du jet, ou null si le jet a été annulé.
   */
  async rollAttack(
    item,
    {
      auto = false,
      type = "attack",
      actionName = "",
      dice = "1d20",
      bonus = 0,
      malus = 0,
      critical = 20,
      bonusDice = undefined,
      malusDice = undefined,
      superior = false,
      weakened = false,
      difficulty = 10,
      showDifficulty = undefined,
      withDialog = true,
      skillFormula = undefined,
      skillFormulaTooltip = "",
      damageFormula = undefined,
      damageFormulaTooltip = "",
      targets = [],
    } = {},
  ) {
    if (showDifficulty === undefined) showDifficulty = game.settings.get("co", "displayDifficulty")

    // Gestion du dé bonus
    if (this.system.hasBonusDiceForAttack(Utils.getAttackTypeFromFormula(skillFormulaTooltip))) bonusDice = true

    // Maitrise de l'arme : Si le personnage utilise une arme qu’il ne maîtrise pas, il subit un dé malus au test d’attaque.
    if (item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.weapon.id) {
      if (!this.isTrainedWithWeapon(item.id)) malusDice = true
    }

    // Type de dé
    if (bonusDice && malusDice) {
      superior = false
      weakened = false
    }
    if (bonusDice && !malusDice) {
      superior = true
      weakened = false
    }
    if (!bonusDice && malusDice) {
      superior = false
      weakened = true
    }

    const dialogContext = {
      dice,
      actor: this,
      auto,
      type,
      useComboRolls: game.settings.get("co", "useComboRolls"),
      actionName: actionName,
      label: `${item.name} ${actionName}`,
      bonus,
      malus,
      critical,
      superior,
      weakened,
      difficulty,
      showDifficulty,
      formulaAttack: skillFormula,
      formulaAttackTooltip: skillFormulaTooltip,
      formulaDamage: damageFormula,
      formulaDamageTooltip: damageFormulaTooltip,
      targets,
    }

    let rolls = await COAttackRoll.prompt(dialogContext, { withDialog: withDialog })
    if (!rolls) return null

    // Prépare le message de résultat
    const speaker = ChatMessage.getSpeaker({ actor: this, scene: canvas.scene })
    const messageData = { speaker }

    // Jet d'attaque
    if (type === "attack") {
      // Affichage du get d'attaque
      await rolls[0].toMessage(messageData)

      // Affichage du jet de dégâts dans le cas d'un jet combiné
      if (game.settings.get("co", "useComboRolls")) {
        if (rolls[1]) await rolls[1].toMessage(messageData)
      }
    }

    // Jet de dégâts
    else if (type === "damage") {
      await rolls[0].toMessage(messageData)
    }
  }

  // FIXME Finir la méthode
  async rollHeal(item, { actionName = "", healFormula = undefined, targetType = SYSTEM.RESOLVER_TARGET.none.id, targets = [] } = {}) {
    let roll = new Roll(healFormula)
    await roll.roll()
    // TODO Qui est soigné ? Pour le moment soi même :)
    if (targetType == SYSTEM.RESOLVER_TARGET.self.id) {
      let hp = this.system.attributes.hp
      hp.value += roll.total
      if (hp.value > hp.max) hp.value = hp.max
      this.update({ "system.attributes.hp": hp })
    }
    await roll.toMessage()
  }
  // #endregion
}

import { SYSTEM } from "../config/system.mjs"
import { Modifier } from "../models/schemas/modifier.mjs"
import { COSkillRoll, COAttackRoll } from "./roll.mjs"
import PathData from "../models/path.mjs"

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
    await this.updateSize(this.system.details.size)
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
    rollData.niv = this.system.attributes.level

    if (this.type === "character") {
      rollData.mel = this.system.combat.melee.value
      rollData.atc = this.system.combat.melee.value
      rollData.dis = this.system.combat.ranged.value
      rollData.atd = this.system.combat.ranged.value
      rollData.mag = this.system.combat.magic.value
      rollData.atm = this.system.combat.magic.value
    }

    return rollData
  }
  // #region accesseurs

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
      const capacitesId = path.system.capacities.map((uuid) => {
        return foundry.utils.parseUuid(uuid).id
      })
      const capacities = capacitesId.map((id) => this.items.find((i) => i._id === id))

      path.rank = PathData.computeRank(capacities)
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
      misc: this.misc,
    }
  }

  get learnedCapacities() {
    return this.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.learned)
  }

  get capacitiesOffPaths() {
    return this.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.capacity.id && item.system.path === null)
  }

  get equippedEquipments() {
    return this.items.filter((item) => item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.equipped)
  }

  get equippedWeapons() {
    return this.weapons.filter((item) => item.system.equipped)
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
   * Retourne Toutes les actions visibles des capacités et des équipements
   */
  async getVisibleActions() {
    let allActions = []
    for (const item of this.items) {
      if ([SYSTEM.ITEM_TYPE.equipment.id, SYSTEM.ITEM_TYPE.capacity.id].includes(item.type)) {
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

  get isUnlocked() {
    if (this.getFlag(game.system.id, "SheetUnlocked")) return true
    return false
  }

  // #endregion

  // #region méthodes publiques

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
   * Retourne  le malus à l'initiative lié à l'armure et à l'incompétence armes/armures
   *
   * Retourne {int} retourne le malus (négatif) ou 0
   */
  getMalusToInitiative() {
    return 0
    // Return this.getOverloadMalusToInitiative() + this.getIncompetentMalusToInitiative();
  }

  /**
   * Retourne  le malus à l'initiative lié à l'armure
   *
   * Retourne {int} retourne le malus (négatif) ou 0 ; par défaut, retourne 0
   */
  getOverloadMalusToInitiative() {
    return 0
  }

  /**
   * Retourne  le malus à l'initiative lié à l'incompétence armes/armures
   *
   * Retourne {int} retourne le malus (négatif) ou 0 ; par défaut, retourne 0
   */
  getIncompetentMalusToInitiative() {
    return 0
  }

  /**
   * Calcule la défense de l'armure et du bouclier équipés
   * Retourne  {Int} la somme des DEF
   */
  getDefenceFromArmorAndShield() {
    return this.getDefenceFromArmor() + this.getDefenceFromShield()
  }

  /**
   * Calcule la défense de l'armure équipée
   * Retourne  {Int} la valeur de défense
   */
  getDefenceFromArmor() {
    let protections = this.equippedArmors.map((i) => i.system.def)
    return this._addAllValues(protections)
  }

  /**
   * Retourne  {Int} la valeur de défense
   */
  getDefenceFromShield() {
    let protections = this.equippedShields.map((i) => i.system.def)
    return this._addAllValues(protections)
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
   * Active ou désactive une action
   * @param {*} state true to enable the action, false to disable the action
   * @param {*} source  uuid of the embedded item which is the source of the action
   * @param {*} indice  indice of the action in the array of actions
     @param {string("attack","damage")} type  define if it's an attack or just a damage
   */
  async activateAction(state, source, indice, type) {
    const item = await fromUuid(source)
    if (!item) return

    if (CONFIG.debug.co?.actions) console.debug(Utils.log(`COActor - activateAction`), state, source, indice, type, item)

    // Action avec une durée
    if (item.system.actions[indice].properties.temporary) {
      const newActions = item.system.toObject().actions
      newActions[indice].properties.enabled = state
      await item.update({ "system.actions": newActions })
    }
    // Action instantanée
    else {
      if (CONFIG.debug.co?.actions) console.debug(Utils.log(`COActor - activateAction - Action instantanée`), state, source, indice, type, item)
      const action = foundry.utils.deepClone(item.system.actions[indice])
      // Recherche des resolvers de l'action
      let resolvers = Object.values(action.resolvers).map((r) => foundry.utils.deepClone(r))
      for (const resolver of resolvers) {
        let res = resolver.resolve(this, item, action, type)
      }
    }
  }

  // FIXME N'a pas l'air d'être utilisée
  toggleSuperior(ability) {
    return (this.system.abilities[ability].superior = !this.system.abilities[ability].superior)
  }

  /**
   * Apprend/désapprend une capacité du personnage
   * Change le champ learned de la capacit é
   * Met à jour le rank de la voie correspondante
   * @param {*} capacityId
   */
  async toggleCapacityLearned(capacityId) {
    // Mise à jour de la capacité et de ses actions
    await this._toggleItemFieldAndActions(capacityId, "learned")

    /* Mise à jour du rang de la voie correspondante
    let path = await fromUuid(this.items.get(capacityId).system.path)
    if (!path) return
    await path.updateRank()
    */
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
    await this._toggleItemFieldAndActions(itemId, "equipped")
  }

  /**
   * Update the size of Tokens for this Actor.
   * @returns {Promise<void>}
   */
  async updateSize(currentsize) {
    const sizemodifier = SYSTEM.TOKEN_SIZE[currentsize]
    // Prototype token size
    if (sizemodifier.size !== this.prototypeToken.width || sizemodifier.scale !== this.prototypeToken.texture.scaleX) {
      await this.update({ prototypeToken: { width: sizemodifier.size, height: sizemodifier.size, "texture.scaleX": sizemodifier.scale, "texture.scaleY": sizemodifier.scale } })
    }
    // Active token sizes
    if (canvas.scene) {
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
        const newPathUuid = await this.addPath(originalPath)
        updatedPathsUuids.push(newPathUuid)
      }
    }

    // Update the paths of the profile with ids of created paths
    await newProfile[0].update({ "system.paths": updatedPathsUuids })

    return newProfile[0].uuid
  }

  /**
   * Adds a new path and its associated capacities to the system.
   * It also create the capacities linked to the path
   * @param {COItem} path The path object to be added.
   * @returns {Promise<string>} A promise that resolves to the UUID of the newly created path.
   *
   * @throws {Error} Throws an error if the path creation or update fails.
   */
  async addPath(path) {
    let itemData = path.toObject()

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

    // Création de l'objet
    const newEquipment = await this.createEmbeddedDocuments("Item", [equipmentData])

    // Update the source of all actions
    if (newEquipment[0].actions.length > 0) {
      const actions = newEquipment[0].toObject().system.actions
      for (const action of actions) {
        action.source = newEquipment[0].uuid
      }

      const updateActions = { _id: newEquipment[0].id, "system.actions": actions }
      await this.updateEmbeddedDocuments("Item", [updateActions])
    }
    return newEquipment[0].uuid
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

    const dialogContext = {
      dice: dice,
      actor: this,
      skillId: skillId,
      label: `${game.i18n.localize("CO.dialogs.skillCheck")} - ${game.i18n.localize(`CO.abilities.long.${skillId}`)}`,
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

  // Jet d'attaque et jet de dégâts
  async rollAttack(
    item,
    {
      auto = false,
      type = "attack",
      actionName = "",
      dice = "1d20",
      bonus = 0,
      malus = 0,
      skillFormula = undefined,
      skillFormulaTooltip = "",
      damageFormula = undefined,
      damageFormulaTooltip = "",
      critical = 20,
      difficulty = 10,
      showDifficulty = true,
      withDialog = true,
    } = {},
  ) {
    const dialogContext = {
      auto: auto,
      type: type,
      useComboRolls: game.settings.get("co", "useComboRolls"),
      actionName: actionName,
      label: `${item.name} - ${actionName}`,
      dice: dice,
      actor: this,
      formulaAttack: skillFormula,
      formulaAttackTooltip: skillFormulaTooltip,
      formulaDamage: damageFormula,
      formulaDamageTooltip: damageFormulaTooltip,
      critical: critical,
      difficulty: difficulty,
      showDifficulty: showDifficulty,
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
        await rolls[1].toMessage(messageData)
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
    await roll.toMessage()
  }

  // #endregion

  // #region méthodes privées

  /**
   * Calcul la somme d'un tableau de valeurs positives ou négatives
   *
   * @param {*} array Un tableau de valeurs
   * Retourne {int} 0 ou la somme des valeurs
   */
  _addAllValues(array) {
    return array.length > 0 ? array.reduce((acc, curr) => acc + curr, 0) : 0
  }

  /**
   * Toggle the field of the items and the actions linked
   * @param {*} itemId    identifiant unique de l'objet
   * @param {*} fieldName exemple : equipped
   */
  async _toggleItemFieldAndActions(itemId, fieldName) {
    let item = this.items.get(itemId)
    let fieldValue = item.system[fieldName]
    console.log(`_toggleItemFieldAndActions - fieldValue : ${fieldValue} fieldName : ${fieldName} itemId : ${itemId}`)
    // await this.updateEmbeddedDocuments("Item", [{ _id: itemId, [`system.${fieldName}`]: !fieldValue }])
    // await item.update({ [`system.${fieldName}`]: !fieldValue })
    let updateData = { [`system.${fieldName}`]: !fieldValue }
    const nbActions = item.actions.length
    if (nbActions > 0) {
      //item.toggleActions()
      let actions = item.system.toObject().actions
      for (let index = 0; index < nbActions; index++) {
        const action = actions[index]
        // Si c'est une action non activable, l'activer automatiquement
        if (!action.properties.activable) {
          action.properties.enabled = !action.properties.enabled
        } else {
          // Vérifier si les conditions sont remplies
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

  getItemFromUuid(uuid) {
    let { id } = foundry.utils.parseUuid(uuid)
    const item = this.items.get(id)
    if (item) return item
    return null
  }
  // #endregion
}

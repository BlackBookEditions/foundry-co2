import COItem from "../documents/item.mjs"

export default class Macros {
  /**
   * Attempt to create a macro from the dropped data. Will use an existing macro if one exists.
   * @param {object} dropData     The dropped data
   * @param {number} slot         The hotbar slot to use
   */
  static async createCOMacro(dropData, slot) {
    const macroData = { type: "script", scope: "actor" }
    switch (dropData.type) {
      case "Item":
        const itemData = await Item.implementation.fromDropData(dropData)
        if (!itemData) return ui.notifications.warn(game.i18n.localize("CO.macro.unownedWarn"))
        foundry.utils.mergeObject(macroData, {
          name: itemData.name,
          img: itemData.img,
          command: `if (event.ctrlKey) {game.system.api.macros.openSheet("${itemData.uuid}","${itemData.name}")} else { game.system.api.macros.sendToChat("${itemData.uuid}","${itemData.name}", null) }`,
          flags: { "co.itemMacro": true },
        })
        break
      case "co.action":
        foundry.utils.mergeObject(macroData, {
          name: `${dropData.name} - ${dropData.actionName}`,
          img: dropData.img,
          command: `if (event.ctrlKey) {game.system.api.macros.openSheet("${dropData.source}")} else { game.system.api.macros.sendToChat("${dropData.source}","${dropData.name}","${dropData.indice}") }`,
          flags: { "co.actionMacro": true },
        })
        break
      case "co.ability":
        foundry.utils.mergeObject(macroData, {
          name: `Jet de caractéristique (${game.i18n.localize(`CO.abilities.long.${dropData.rollTarget}`)})`,
          img: "icons/svg/dice-target.svg",
          command: `game.system.api.macros.rollSkill("${dropData.rollTarget}", {})`,
          flags: { "co.abilityMacro": true },
        })
        break
      default:
        return
    }

    // Assign the macro to the hotbar
    let macro = game.macros.find((m) => m.name === macroData.name && m.command === macroData.command && m.author.isSelf)
    if (!macro) {
      macro = await Macro.create(macroData)
      game.user.assignHotbarMacro(macro, slot)
    }
  }

  /**
   * Send to Chat an Item or an action
   * @param {string} itemUuid        Uuid of the item on the selected actor to trigger.
   * @param {string} itemName        Name of the item on the selected actor to trigger.
   * @param {int} indice             Indice of the action to display, null if it's the item
   * @returns {Promise<ChatMessage|object>}  Roll result.
   */
  static async sendToChat(itemUuid, itemName, indice) {
    const { item, actor } = await Macros.getMacroTarget(itemUuid, itemName, "Item")
    if (item instanceof COItem) {
      if (indice === null) {
        await actor.sendItemToChat({ chatType: "item", itemId: item.id, indice })
        /*if (item.type === SYSTEM.ITEM_TYPE.capacity.id && !item.system.learned) return ui.notifications.warn(game.i18n.format("CO.macro.capacityNotLearned", { name: itemName }))
        if (item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.properties.equipable && !item.system.equipped)
          return ui.notifications.warn(game.i18n.format("CO.macro.itemNotEquipped", { name: itemName }))
        */
      } else {
        await actor.sendItemToChat({ chatType: "action", itemId: item.id, indice })

        /*if (item.type === SYSTEM.ITEM_TYPE.capacity.id && !item.system.learned) return ui.notifications.warn(game.i18n.format("CO.macro.capacityNotLearned", { name: itemName }))
        if (item.type === SYSTEM.ITEM_TYPE.equipment.id && item.system.properties.equipable && !item.system.equipped)
          return ui.notifications.warn(game.i18n.format("CO.macro.itemNotEquipped", { name: itemName }))
        */
      }
    }
  }

  static async openSheet(itemUuid, itemName) {
    const { item, actor } = await Macros.getMacroTarget(itemUuid, itemName, "Item")
    if (item instanceof COItem) {
      item.sheet.render(true)
    }
  }

  static async rollSkill(rollTarget, options = {}) {
    let actor
    const speaker = ChatMessage.getSpeaker()
    if (speaker.token) actor = game.actors.tokens[speaker.token]
    actor ??= game.actors.get(speaker.actor)
    if (!actor) return ui.notifications.warn(game.i18n.localize("CO.macro.noActorSelected"))
    if (actor) {
      await actor.rollSkill(rollTarget, options)
    }
  }

  /**
   * Find a document of the specified name and type on an assigned or selected actor.
   * @param {UUID} itemUuid
   * @param {string} name          Document name to locate.
   * @param {string} documentType  Type of embedded document (e.g. "Item").
   * @returns {Document}           Document if found, otherwise nothing.
   */
  static async getMacroTarget(itemUuid, name, documentType) {
    let actor
    const speaker = ChatMessage.getSpeaker()
    if (speaker.token) actor = game.actors.tokens[speaker.token]
    actor ??= game.actors.get(speaker.actor)
    if (!actor) return ui.notifications.warn(game.i18n.localize("CO.macro.noActorSelected"))

    const item = await fromUuid(itemUuid)
    if (item) return { item, actor }

    const collection = documentType === "Item" ? actor.items : actor.effects
    const nameKeyPath = documentType === "Item" ? "name" : "label"

    // Find item in collection
    const documents = collection.filter((i) => foundry.utils.getProperty(i, nameKeyPath) === name)
    const type = game.i18n.localize(`DOCUMENT.${documentType}`)
    if (documents.length === 0) {
      return ui.notifications.warn(game.i18n.format("CO.macro.missingTargetWarn", { actor: actor.name, type, name }))
    }
    if (documents.length > 1) {
      ui.notifications.warn(game.i18n.format("CO.macro.multipleTargetsWarn", { actor: actor.name, type, name }))
    }
    return { item: documents[0], actor }
  }
}

import COItem from "../documents/item.mjs"
import CoChat from "../chat.mjs"
import { SYSTEM } from "../config/system.mjs"

/**
 * Attempt to create a macro from the dropped data. Will use an existing macro if one exists.
 * @param {object} dropData     The dropped data
 * @param {number} slot         The hotbar slot to use
 */
export async function createCOMacro(dropData, slot) {
  const macroData = { type: "script", scope: "actor" }
  switch (dropData.type) {
    case "Item":
      const itemData = await Item.implementation.fromDropData(dropData)
      if (!itemData) return ui.notifications.warn(game.i18n.localize("CO.macro.unownedWarn"))
      foundry.utils.mergeObject(macroData, {
        name: itemData.name,
        img: itemData.img,
        command: `game.system.api.macros.sendToChat("${itemData.id}","${itemData.name}", null)`,
        flags: { "co.itemMacro": true },
      })
      break
    case "co.action":
      foundry.utils.mergeObject(macroData, {
        name: `${dropData.name} - ${dropData.actionName}`,
        img: dropData.img,
        command: `game.system.api.macros.sendToChat("${dropData.source}","${dropData.name}","${dropData.indice}")`,
        flags: { "co.actionMacro": true },
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

export default class Macros {
  /**
   * Send to Chat an Item or an action
   * @param {string} itemId          Id of the item on the selected actor to trigger.
   * @param {string} itemName        Name of the item on the selected actor to trigger.
   * @param {int} indice               Indice of the action to display, null if it's the item
   * @returns {Promise<ChatMessage|object>}  Roll result.
   */
  static async sendToChat(itemId, itemName, indice) {
    const { item, actor } = Macros.getMacroTarget(itemId, itemName, "Item")
    if (item instanceof COItem) {
      if (indice === null) {
        let itemChatData = item.getChatData(null)
        if (item.type === SYSTEM.ITEM_TYPE.CAPACITY && !item.system.learned) return ui.notifications.warn(game.i18n.format("CO.macro.capacityNotLearned", { name: itemName }))
        if (item.type === SYSTEM.ITEM_TYPE.EQUIPMENT && !item.system.equipped) return ui.notifications.warn(game.i18n.format("CO.macro.itemNotEquipped", { name: itemName }))
        new CoChat(actor)
          .withTemplate("systems/co/templates/chat/item-card.hbs")
          .withData({
            actorId: actor.id,
            id: itemChatData.id,
            name: itemChatData.name,
            img: itemChatData.img,
            description: itemChatData.description,
            actions: itemChatData.actions,
          })
          .withWhisper(ChatMessage.getWhisperRecipients("GM").map((u) => u.id))
          .create()
      } else {
        let itemChatData = item.getChatData(indice)
        if (item.type === SYSTEM.ITEM_TYPE.CAPACITY && !item.system.learned) return ui.notifications.warn(game.i18n.format("CO.macro.capacityNotLearned", { name: itemName }))
        if (item.type === SYSTEM.ITEM_TYPE.EQUIPMENT && !item.system.equipped) return ui.notifications.warn(game.i18n.format("CO.macro.itemNotEquipped", { name: itemName }))
        new CoChat(actor)
          .withTemplate("systems/co/templates/chat/item-card.hbs")
          .withData({
            actorId: actor.id,
            id: itemChatData.id,
            name: itemChatData.name,
            img: itemChatData.img,
            description: itemChatData.description,
            actions: itemChatData.actions,
          })
          .withWhisper(ChatMessage.getWhisperRecipients("GM").map((u) => u.id))
          .create()
      }
    }
  }

  /**
   * Find a document of the specified name and type on an assigned or selected actor.
   * @param {int} id
   * @param {string} name          Document name to locate.
   * @param {string} documentType  Type of embedded document (e.g. "Item").
   * @returns {Document}           Document if found, otherwise nothing.
   */
  static getMacroTarget(id, name, documentType) {
    let actor
    const speaker = ChatMessage.getSpeaker()
    if (speaker.token) actor = game.actors.tokens[speaker.token]
    actor ??= game.actors.get(speaker.actor)
    if (!actor) return ui.notifications.warn(game.i18n.localize("CO.macro.noActorSelected"))

    const item = actor.items.get(id)
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

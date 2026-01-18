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
        // Récupère l'item et l'acteur pour le nom de la macro
        const actionItem = await fromUuid(dropData.source)
        const actionActorName = actionItem?.parent?.name ?? ""

        // Génère la commande selon le type d'action
        let actionCommand
        const isAttackType = ["melee", "ranged", "magical", "spell"].includes(dropData.actionType)

        if (dropData.isTemporary) {
          // Actions temporaires (activables/désactivables)
          actionCommand = `// Clic: Activer/Désactiver | Ctrl+Clic: Chat | Shift+Clic: Fiche
if (event.shiftKey) { game.system.api.macros.openSheet("${dropData.source}") } else if (event.ctrlKey) { game.system.api.macros.sendToChat("${dropData.source}","${dropData.name}","${dropData.indice}") } else { game.system.api.macros.useAction("${dropData.source}","${dropData.indice}") }`
        } else if (isAttackType && !dropData.isAutoAttack && dropData.hasDamage) {
          // Actions d'attaque avec dommages
          actionCommand = `// Clic: Attaque | Alt+Clic: Dommages | Ctrl+Clic: Chat | Shift+Clic: Fiche
if (event.shiftKey) { game.system.api.macros.openSheet("${dropData.source}") } else if (event.ctrlKey) { game.system.api.macros.sendToChat("${dropData.source}","${dropData.name}","${dropData.indice}") } else if (event.altKey) { game.system.api.macros.useAction("${dropData.source}","${dropData.indice}","damage") } else { game.system.api.macros.useAction("${dropData.source}","${dropData.indice}","attack") }`
        } else if (isAttackType && !dropData.isAutoAttack) {
          // Actions d'attaque sans dommages
          actionCommand = `// Clic: Attaque | Ctrl+Clic: Chat | Shift+Clic: Fiche
if (event.shiftKey) { game.system.api.macros.openSheet("${dropData.source}") } else if (event.ctrlKey) { game.system.api.macros.sendToChat("${dropData.source}","${dropData.name}","${dropData.indice}") } else { game.system.api.macros.useAction("${dropData.source}","${dropData.indice}","attack") }`
        } else {
          // Autres actions (soin, buff, debuff, consommable, attaque auto)
          actionCommand = `// Clic: Utiliser | Ctrl+Clic: Chat | Shift+Clic: Fiche
if (event.shiftKey) { game.system.api.macros.openSheet("${dropData.source}") } else if (event.ctrlKey) { game.system.api.macros.sendToChat("${dropData.source}","${dropData.name}","${dropData.indice}") } else { game.system.api.macros.useAction("${dropData.source}","${dropData.indice}","${dropData.actionType}") }`
        }

        foundry.utils.mergeObject(macroData, {
          name: `${dropData.name} - ${dropData.actionName} (${actionActorName})`,
          img: dropData.img,
          command: actionCommand,
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
      case "co.attack":
        const attackData = await Item.implementation.fromDropData(dropData)
        if (!attackData) return ui.notifications.warn(game.i18n.localize("CO.macro.unownedWarn"))

        // Génère la commande selon les capacités de l'attaque
        let attackCommand
        if (dropData.isAutoAttack) {
          // Attaque automatique
          attackCommand = `// Clic: Utiliser | Ctrl+Clic: Chat | Shift+Clic: Fiche
if (event.shiftKey) { game.system.api.macros.openSheet("${attackData.uuid}","${attackData.name}") } else if (event.ctrlKey) { game.system.api.macros.sendToChat("${attackData.uuid}","${attackData.name}", null) } else { game.system.api.macros.useAction("${attackData.uuid}","0","auto") }`
        } else if (dropData.hasDamage) {
          // Attaque avec dommages
          attackCommand = `// Clic: Attaque | Alt+Clic: Dommages | Ctrl+Clic: Chat | Shift+Clic: Fiche
if (event.shiftKey) { game.system.api.macros.openSheet("${attackData.uuid}","${attackData.name}") } else if (event.ctrlKey) { game.system.api.macros.sendToChat("${attackData.uuid}","${attackData.name}", null) } else if (event.altKey) { game.system.api.macros.useAction("${attackData.uuid}","0","damage") } else { game.system.api.macros.useAction("${attackData.uuid}","0","attack") }`
        } else {
          // Attaque sans dommages
          attackCommand = `// Clic: Attaque | Ctrl+Clic: Chat | Shift+Clic: Fiche
if (event.shiftKey) { game.system.api.macros.openSheet("${attackData.uuid}","${attackData.name}") } else if (event.ctrlKey) { game.system.api.macros.sendToChat("${attackData.uuid}","${attackData.name}", null) } else { game.system.api.macros.useAction("${attackData.uuid}","0","attack") }`
        }

        const attackActorName = attackData.parent?.name ?? ""
        foundry.utils.mergeObject(macroData, {
          name: `Attaque - ${attackData.name} (${attackActorName})`,
          img: attackData.img,
          command: attackCommand,
          flags: { "co.attackMacro": true },
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

  /**
   * Use an action from a macro
   * @param {string} source   Uuid of the item containing the action
   * @param {int} indice      Indice of the action to use
   * @param {string} type     Type of action: "attack" or "damage"
   */
  static async useAction(source, indice, type = "attack") {
    // Récupère l'item depuis l'UUID
    const item = await fromUuid(source)
    if (!item) return ui.notifications.warn(game.i18n.localize("CO.macro.unownedWarn"))

    // Récupère l'acteur depuis l'item si c'est un item embarqué, sinon depuis le speaker
    let actor = item.parent
    if (!actor) {
      const speaker = ChatMessage.getSpeaker()
      if (speaker.token) actor = game.actors.tokens[speaker.token]
      actor ??= game.actors.get(speaker.actor)
    }
    if (!actor) return ui.notifications.warn(game.i18n.localize("CO.macro.noActorSelected"))

    await actor.activateAction({ state: true, source, indice, type })
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
    // Essaie d'abord de récupérer l'item depuis l'UUID
    const item = await fromUuid(itemUuid)
    if (item) {
      // Récupère l'acteur depuis l'item si c'est un item embarqué
      let actor = item.parent
      if (!actor) {
        const speaker = ChatMessage.getSpeaker()
        if (speaker.token) actor = game.actors.tokens[speaker.token]
        actor ??= game.actors.get(speaker.actor)
      }
      if (!actor) return ui.notifications.warn(game.i18n.localize("CO.macro.noActorSelected"))
      return { item, actor }
    }

    // Fallback : cherche l'item par nom sur l'acteur sélectionné
    let actor
    const speaker = ChatMessage.getSpeaker()
    if (speaker.token) actor = game.actors.tokens[speaker.token]
    actor ??= game.actors.get(speaker.actor)
    if (!actor) return ui.notifications.warn(game.i18n.localize("CO.macro.noActorSelected"))

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

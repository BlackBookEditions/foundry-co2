const { HandlebarsApplicationMixin } = foundry.applications.api

/**
 * Application window displaying a summary table of all connected player characters.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export default class COPartySheet extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  constructor(options = {}) {
    super(options)
    Hooks.on("updateActor", () => this.render(false))
    Hooks.on("renderPlayers", () => this.render(false))
  }

  static DEFAULT_OPTIONS = {
    id: "co-party-sheet",
    classes: ["co", "party-sheet"],
    position: { width: 1100, height: "auto" },
    window: {
      title: "CO.party.title",
      resizable: true,
    },
    actions: {
      openSheet: COPartySheet.#onOpenSheet,
      rollAbilityAll: COPartySheet.#onRollAbilityAll,
      rollAbility: COPartySheet.#onRollAbility,
    },
  }

  static PARTS = {
    party: {
      template: "systems/co2/templates/party/party-sheet.hbs",
    },
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    context.members = game.users
      .filter((u) => !u.isGM && u.hasPlayerOwner && u.active && u.character && u.character.type === "character")
      .map((u) => {
        const c = u.character
        return {
          userId: u.id,
          userName: u.name,
          userColor: u.color,
          actor: c,
          name: c.name,
          img: c.img,
          abilities: c.system.abilities,
          combat: c.system.combat,
          hp: c.system.attributes.hp,
          fortune: c.system.resources.fortune,
          recovery: c.system.resources.recovery,
          mana: c.system.resources.mana,
        }
      })
    return context
  }

  static async #createCheckMessage(ability, whisper) {
    const label = game.i18n.localize(`CO.abilities.short.${ability}`)
    const vowels = "aeiouyàâéèêëïîôùûüAEIOUYÀÂÉÈÊËÏÎÔÙÛÜ"
    const preposition = vowels.includes(label.charAt(0)) ? "d'" : "de "
    const title = `Test ${preposition}${label}`

    const rollOptions = whisper ? "secret" : undefined
    const content = await foundry.applications.handlebars.renderTemplate("systems/co2/templates/chat/check-card.hbs", { title, ability, rollOptions })

    const messageData = {
      content,
      speaker: ChatMessage.getSpeaker(),
      type: "check",
    }
    if (whisper) messageData.whisper = whisper

    await ChatMessage.create(messageData)
  }

  static #onRollAbilityAll(event, target) {
    COPartySheet.#createCheckMessage(target.dataset.ability)
  }

  static #onRollAbility(event, target) {
    const userId = target.dataset.userId
    COPartySheet.#createCheckMessage(target.dataset.ability, [userId])
  }

  static #onOpenSheet(event, target) {
    const actorId = target.dataset.actorId
    const actor = game.actors.get(actorId)
    actor?.sheet?.render(true)
  }
}

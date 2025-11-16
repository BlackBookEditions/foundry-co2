export default class COChatMessage extends ChatMessage {
  /** @inheritDoc */
  async renderHTML({ canDelete, canClose = false, ...rest } = {}) {
    const html = await super.renderHTML({ canDelete, canClose, ...rest })
    this._enrichChatCard(html)
    return html
  }

  /**
   * Get the Actor which is the author of a chat card.
   * @returns {Actor|void}
   */
  getAssociatedActor() {
    if (this.speaker.scene && this.speaker.token) {
      const scene = game.scenes.get(this.speaker.scene)
      const token = scene?.tokens.get(this.speaker.token)
      if (token) return token.actor
    }
    return game.actors.get(this.speaker.actor)
  }

  _enrichChatCard(html) {
    const actor = this.getAssociatedActor()

    let img
    let nameText
    if (this.isContentVisible) {
      img = actor?.img ?? this.author.avatar
      nameText = this.alias
    } else {
      img = this.author.avatar
      nameText = this.author.name
    }

    const avatar = document.createElement("a")
    avatar.classList.add("avatar")
    if (actor) avatar.dataset.uuid = actor.uuid
    const avatarImg = document.createElement("img")
    Object.assign(avatarImg, { src: img, alt: nameText })
    avatar.append(avatarImg)

    const name = document.createElement("span")
    name.classList.add("name-stacked")
    const title = document.createElement("span")
    title.classList.add("title")
    title.append(nameText)
    name.append(title)

    const sender = html.querySelector(".message-sender")
    sender?.replaceChildren(avatar, name)
    // Html.querySelector(".whisper-to")?.remove()
  }

  /**
   * Met à jour le message après l'utilisation d'un point de chance
   *
   * @param {Object} options The options object
   * @param {string} options.existingMessageId The ID of the existing message to update
   * @param {Array} options.rolls The array of roll objects to add to the message
   * @param {*} options.result The result value to store in the message's system data
   * @returns {Promise<void>} A promise that resolves when the message update is complete
   * @private
   * @static
   * @async
   */
  static async _handleQueryUpdateMessageAfterLuck({ existingMessageId, rolls, result } = {}) {
    const message = game.messages.get(existingMessageId)
    if (!message) return
    await message.update({ rolls: rolls, "system.result": result })
  }
}

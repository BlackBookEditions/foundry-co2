export default class CoChat {
  /**
   * Creates an instance of a chat
   *
   * @param {Object} actor The actor associated with the chat module. The emitter of the chat message
   * @property {Object} actor - The actor associated with the chat module.
   * @property {Object|null} chat - The chat instance.
   * @property {Object|null} content - The content of the chat.
   * @property {Object|null} template - The template for the chat.
   * @property {Object|null} data - The data associated with the chat.
   * @property {Object|null} flags - The flags for the chat.
   * @property {Object|null} roll - The roll associated with the chat.
   * @property {Object|null} whisper - The whisper settings for the chat.
   */
  constructor(actor) {
    this.actor = actor
    this.chat = null
    this.content = null
    this.template = null
    this.data = null
    this.flags = null
    this.roll = null
    this.whisper = null
  }

  /**
   * Sets the specified message content
   * @param {*} content
   * @returns {CoChat} the instance
   */
  withContent(content) {
    this.content = content
    return this
  }

  /**
   * Sets the specified template used to create the message content
   * @param {*} template The path of the file template to set
   * @returns {CoChat} the instance
   */
  withTemplate(template) {
    this.template = template
    return this
  }

  /**
   * Sets the specified data used to create the message content
   * @param {*} data The data of the file template to set
   * @returns {CoChat} the instance
   */
  withData(data) {
    this.data = data
    return this
  }

  /**
   * Sets the flags parameter
   * @param {*} flags
   * @returns {CoChat} the instance
   */
  withFlags(flags) {
    this.flags = flags
    return this
  }

  /**
   * Indicates if the chat is a roll.
   * @param {Roll} roll The roll.
   * @returns {CoChat} the instance.
   */
  withRoll(roll) {
    this.roll = roll
    return this
  }

  /**
   * Indicates if the chat is a whisper
   * @param {Array} whisper The array of user id to whisper.
   * @returns {CoChat} the instance.
   */
  withWhisper(whisper) {
    this.whisper = whisper
    return this
  }

  /**
   * Creates the chat message
   * @returns {CoChat} this instance
   */
  async create() {
    // Retrieve the message content
    if (!this.content && this.template && this.data) {
      this.content = await this._createContent()
    }

    // Exit if message content can't be created
    if (!this.content) {
      return null
    }

    let speaker = ChatMessage.getSpeaker({ actor: this.actor.id })

    // Create the chat data
    const data = {
      user: game.user.id,
      speaker: {
        actor: this.actor.id,
        alias: this.actor.name,
        scene: null,
        token: null,
      },
      content: this.content,
    }

    // Set the roll parameter if necessary
    if (this.roll) {
      data.roll = this.roll
    }

    // Set the flags parameter if necessary
    if (this.flags) {
      d.flags = this.flags
    }

    // If the whisper has not been defined, set the whisper and blind parameters according to the player roll mode settings
    if (this.whisper === null) {
      switch (game.settings.get("core", "rollMode")) {
        case "gmroll":
          data.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id)
          break
        case "blindroll":
          data.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id)
          data.blind = true
          break
        case "selfroll":
          data.whisper = [game.user.id]
          break
      }
    } else data.whisper = this.whisper

    // Create the chat
    this.chat = await ChatMessage.create(data)
    return this
  }

  /**
   * Creates the message content from the registered template
   * @returns {CoChat} the message content or null i an error occurs
   * @private
   */
  async _createContent() {
    // Update the data to provide to the template
    const data = foundry.utils.duplicate(this.data)
    data.owner = this.actor.id

    // Call the template renderer.
    return await renderTemplate(this.template, data)
  }
}

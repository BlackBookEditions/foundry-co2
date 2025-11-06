export class CoEditAbilitiesDialog extends foundry.applications.api.DialogV2 {
  /** Override */
  static DEFAULT_OPTIONS = {
    classes: ["co", "edit-abilities-dialog"],
    position: {
      width: 1000,
      height: 415,
    },
    actions: {
      toggleSuperior: CoEditAbilitiesDialog.#onToggleSuperior,
    },
  }

  static DISTRIBUTION_MODES = {
    polyvalent: [2, 2, 2, 1, 1, 0, -1],
    expert: [3, 2, 1, 1, 0, 0, -1],
    specialist: [4, 2, 1, 0, 0, -1, -1],
    libre: [],
  }

  constructor({ actor }) {
    super()
    this.actor = actor
    this.mode = "libre"
    this.assignedIds = {}

    // Bind methods once pour optimiser les performances
    this.boundHandlers = {
      onChangeAbilityBase: this._onChangeAbilityBase.bind(this),
      onChangeAbilityBonus: this._onChangeAbilityBonus.bind(this),
      onChangeDistributionMode: this._onChangeDistributionMode.bind(this),
      onDragValue: this._onDragValue.bind(this),
      onDropValue: this._onDropValue.bind(this),
      onDragOver: (ev) => ev.preventDefault(),
    }
  }

  /**
   * Initialise les options de la boîte de dialogue.
   * @param {object} [options={}]
   * @returns {object}
   */
  _initializeApplicationOptions(options) {
    options.buttons = [
      {
        label: game.i18n.localize("CO.ui.close"),
        icon: "fas fa-solid fa-xmark",
        action: () => this.close(),
      },
    ]
    options = super._initializeApplicationOptions(options)
    options.window.title = game.i18n.localize("CO.dialogs.editYourAbilities.title")
    return options
  }

  /**
   * Construit le HTML à partir du template Handlebars.
   * @param {object} context
   * @param {object} options
   * @returns {Promise<string>}
   */
  _renderHTML(context, options) {
    const assigned = Object.values(this.assignedIds)

    const values = this.constructor.DISTRIBUTION_MODES[this.mode].map((val, index) => ({
      id: `v${index}`,
      value: val,
      used: assigned.includes(`v${index}`),
    }))
    const abilities = this.actor.system.abilities
    return foundry.applications.handlebars.renderTemplate("systems/co2/templates/dialogs/edit-abilities-dialog.hbs", {
      actor: this.actor,
      abilities,
      mode: this.mode,
      values,
    })
  }

  /**
   * Injecte le HTML rendu dans le DOM et attache les listeners.
   * @param {string} result
   * @param {HTMLElement} content
   * @param {object} options
   */
  _replaceHTML(result, content, options) {
    content.innerHTML = result

    // Attacher les event listeners avec DOM vanilla et handlers optimisés
    content.querySelectorAll("input.ability-base").forEach((el) => {
      el.addEventListener("change", this.boundHandlers.onChangeAbilityBase)
    })

    content.querySelectorAll("input.ability-bonus").forEach((el) => {
      el.addEventListener("change", this.boundHandlers.onChangeAbilityBonus)
    })

    const distributionMode = content.querySelector("#distribution-mode")
    if (distributionMode) {
      distributionMode.addEventListener("change", this.boundHandlers.onChangeDistributionMode)
    }

    // Drag sources
    content.querySelectorAll(".draggable-value").forEach((el) => {
      el.addEventListener("dragstart", this.boundHandlers.onDragValue)
    })

    // Drop targets
    content.querySelectorAll(".dropzone").forEach((el) => {
      el.addEventListener("dragover", this.boundHandlers.onDragOver)
      el.addEventListener("drop", this.boundHandlers.onDropValue)
    })
  }

  async _onChangeAbilityBase(event) {
    const ability = event.currentTarget.dataset.ability
    const raw = event.currentTarget.value
    const value = raw === "" ? null : Number(raw)
    const { actor } = this
    await actor.update({ [`system.abilities.${ability}.base`]: value })
    this.render(true, { focus: true })
  }

  async _onChangeAbilityBonus(event) {
    const ability = event.currentTarget.dataset.ability
    const raw = event.currentTarget.value
    try{
    const value = raw === "" ? null : parseInt(raw)
    const { actor } = this
    await actor.update({ [`system.abilities.${ability}.bonuses.sheet`]: value })
    }catch(e){
          throw new Co2Error("Erreur en voulant parser du texte en entier sur le hook _onChangeAbilityBonus du edit-abilities-dialog.mjs", e, event )      
          } 
    this.render(true, { focus: true })
  }

  static async #onToggleSuperior(event, target) {
    event.preventDefault()
    const ability = target.dataset.ability
    const { actor } = this
    const value = !actor.system.abilities[ability].superior
    await actor.update({ [`system.abilities.${ability}.superior`]: value })
    this.render(true)
  }

  _onDragValue(event) {
    const value = event.currentTarget.dataset.value
    const id = event.currentTarget.dataset.id
    const payload = JSON.stringify({ id, value })
    event.dataTransfer.setData("application/x-co-value", payload)
  }

  async _onDropValue(event) {
    event.preventDefault()
    const ability = event.currentTarget.dataset.ability

    const raw = event.dataTransfer.getData("application/x-co-value")
    if (!raw) return

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      return ui.notifications.warn("Format de valeur incorrect.")
    }

    const { id, value } = parsed
    if (!id) {
      console.warn("ID manquant dans l’objet drag-drop :", parsed)
    }

    // Trouver si cette valeur est déjà utilisée dans une autre caractéristique
    const previousEntry = Object.entries(this.assignedIds).find(([key, assignedId]) => assignedId === id)

    if (previousEntry) {
      const [previousAbility] = previousEntry

      // Réinitialise l’ancienne case
      await this.actor.update({ [`system.abilities.${previousAbility}.base`]: null })

      // Supprime l'ancien lien
      delete this.assignedIds[previousAbility]
    }

    await this.actor.update({ [`system.abilities.${ability}.base`]: Number(value) })
    this.assignedIds[ability] = id
    this.render(true)
  }

  async _onChangeDistributionMode(event) {
    this.mode = event.target.value
    this.assignedIds = {}

    // Réinitialiser les caractéristiques si mode ≠ libre
    if (this.mode !== "libre") {
      const abilities = this.actor.system.abilities
      const resetUpdates = Object.keys(abilities).reduce((updates, id) => {
        updates[`system.abilities.${id}.base`] = null
        return updates
      }, {})

      await this.actor.update(resetUpdates)
    }

    this.render(true)
  }
}

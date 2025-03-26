/**
 * Propriétés de baseCombat
 * _id: new fields.DocumentIdField(),
      type: new fields.DocumentTypeField(this, {initial: CONST.BASE_DOCUMENT_TYPE}),
      system: new fields.TypeDataField(this),
      scene: new fields.ForeignDocumentField(documents.BaseScene),
      combatants: new fields.EmbeddedCollectionField(documents.BaseCombatant),
      active: new fields.BooleanField(),
      round: new fields.NumberField({required: true, nullable: false, integer: true, min: 0, initial: 0,
        label: "COMBAT.Round"}),
      turn: new fields.NumberField({required: true, integer: true, min: 0, initial: null, label: "COMBAT.Turn"}),
      sort: new fields.IntegerSortField(),
      flags: new fields.ObjectField(),
      _stats: new fields.DocumentStatsField()

  PRpriétés de BaseCombatant
  _id: new fields.DocumentIdField(),
      type: new fields.DocumentTypeField(this, {initial: CONST.BASE_DOCUMENT_TYPE}),
      system: new fields.TypeDataField(this),
      actorId: new fields.ForeignDocumentField(documents.BaseActor, {label: "COMBAT.CombatantActor", idOnly: true}),
      tokenId: new fields.ForeignDocumentField(documents.BaseToken, {label: "COMBAT.CombatantToken", idOnly: true}),
      sceneId: new fields.ForeignDocumentField(documents.BaseScene, {label: "COMBAT.CombatantScene", idOnly: true}),
      name: new fields.StringField({label: "COMBAT.CombatantName", textSearch: true}),
      img: new fields.FilePathField({categories: ["IMAGE"], label: "COMBAT.CombatantImage"}),
      initiative: new fields.NumberField({label: "COMBAT.CombatantInitiative"}),
      hidden: new fields.BooleanField({label: "COMBAT.CombatantHidden"}),
      defeated: new fields.BooleanField({label: "COMBAT.CombatantDefeated"}),
      flags: new fields.ObjectField(),
      _stats: new fields.DocumentStatsField()

      accesseur de Combatant : 
      actor : permet d'obtenir l'actor lié au combattant
 */

export default class CombatCO extends Combat {
  /* -------------------------------------------- */
  /*  Document Methods                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async previousRound() {
    if (!game.user.isGM) {
      ui.notifications.warn("COMBAT.WarningCannotChangeRound", { localize: true })
      return this
    }
    return super.previousRound()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async nextRound() {
    if (!game.user.isGM) {
      ui.notifications.warn("COMBAT.WarningCannotChangeRound", { localize: true })
      return this
    }
    return super.nextRound()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId)
    for (const c of this.combatants) {
      if (c.actor) {
        c.actor.reset()
        c.actor._sheet?.render(false)
      }
    }
  }

  /** @override */
  async _onStartTurn(combatant) {
    await super._onStartTurn(combatant)
    return combatant.actor.onStartTurn(this.turn, this.round)
  }

  /** @override */
  async _onStartRound() {
    await super._onStartRound()
    if (this.turns.length < 2) return

    // Identify the first combatant to act in the round
    const firstCombatant = this.turns[0]
    const firstActor = firstCombatant?.actor

    // Identify the last non-incapacitated combatant to act in the round
    let lastCombatant
    for (let i = this.turns.length - 1; i > 0; i--) {
      if (this.turns[i].actor?.isIncapacitated !== true) {
        lastCombatant = this.turns[i]
        break
      }
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onEndTurn(combatant) {
    await super._onEndTurn(combatant)
    await combatant.actor.onEndTurn(this.turn, this.round)
    combatant.updateResource()
    this.debounceSetup()
  }

  /**
   * Define how the array of Combatants is sorted in the displayed list of the tracker.
   * This method can be overridden by a system or module which needs to display combatants in an alternative order.
   * The default sorting rules sort in descending order of initiative using combatant IDs for tiebreakers.
   * @param {Combatant} a     Some combatant
   * @param {Combatant} b     Some other combatant
   * @protected
   */
  _sortCombatants(a, b) {
    const ia = Number.isNumeric(a.initiative) ? a.initiative : -Infinity
    const ib = Number.isNumeric(b.initiative) ? b.initiative : -Infinity
    if (ia === ib) {
      let blevel = b.actor.system.currentLevel
      let alevel = a.actor.system.currentLevel
      if (blevel > alevel) return 1
      if (blevel < alevel) return -1
      if (blevel === alevel) {
        return b.actor.type === "encounter" ? -1 : 1
      }
    }
    return ib - ia || (a.id > b.id ? 1 : -1)
  }
}

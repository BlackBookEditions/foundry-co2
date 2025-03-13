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
  /**
   * Begin the combat encounter, advancing to round 1 and turn 1
   * @returns {Promise<Combat>}
   */
  async startCombat() {
    await super.startCombat()
    return this
  }

  /* -------------------------------------------- */

  /**
   * Advance the combat to the next turn
   * @returns {Promise<Combat>}
   */
  async nextTurn() {
    await super.nextTurn()
    return this
  }

  /* -------------------------------------------- */

  /**
   * Rewind the combat to the previous turn
   * @returns {Promise<Combat>}
   */
  async previousTurn() {
    await super.previousTurn()
    return this
  }

  /**
   * Advance the combat to the next round
   * @returns {Promise<Combat>}
   */
  async nextRound() {
    await super.nextRound()
  }

  /**
   * Rewind the combat to the previous round
   * @returns {Promise<Combat>}
   */
  async previousRound() {
    await super.previousRound()
  }

  /* -------------------------------------------- */

  /**
   * Display a dialog querying the GM whether they wish to end the combat encounter and empty the tracker
   * @returns {Promise<Combat>}
   */
  async endCombat() {
    await super.endCombat()
    return this
  }

  /**
   * Return the Array of combatants sorted into initiative order, breaking ties alphabetically by name.
   * @returns {Combatant[]}
   */
  setupTurns() {
    this.turns ||= []
    // Determine the turn order and the current turn
    const turns = this.combatants.contents.sort(this._sortCombatants)
    if (this.turn !== null) this.turn = Math.clamp(this.turn, 0, turns.length - 1)

    // Update state tracking
    let c = turns[this.turn]
    this.current = this._getCurrentState(c)

    // One-time initialization of the previous state
    if (!this.previous) this.previous = this.current

    // Return the array of prepared turns
    return (this.turns = turns)
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
      let blevel = 1
      let alevel = 1
      if (b.actor.type === "encounter") blevel = b.actor.system.attributes.nc
      else blevel = b.actor.system.attributes.level
      if (a.actor.type === "encounter") alevel = a.actor.system.attributes.nc
      else alevel = a.actor.system.attributes.level

      console.log(blevel, alevel)
      if (blevel > alevel) return 1
      if (blevel < alevel) return -1
      if (blevel === alevel) {
        return b.actor.type === "encounter" ? -1 : 1
      }
    }
    return ib - ia || (a.id > b.id ? 1 : -1)
  }
}

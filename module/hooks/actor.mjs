/**
 * Hook callback function that executes when an actor is created.
 * Updates all action UUIDs for the actor if the user is a GM and specific conditions are met.
 *
 * @param {Actor} document The actor document being created
 * @param {Object} options Creation options
 * @param {string} userId The ID of the user creating the actor
 * @returns {void}
 */
export function createActor(document, options, userId) {
  if (options?.fromCompendium || (!options?.strict && !options?.renderSheet)) {
    if (game.user.isGM) document.system.updateAllActionsUuid()
  }
}

/**
 * Hook function called when an actor is updated.
 * Handles automatic status effects based on HP changes:
 * - For characters: applies unconscious status and spends 1 DR when HP reaches 0
 * - For encounters: applies dead status when HP reaches 0
 *
 * @param {Actor} actor The actor being updated
 * @param {object} updateData The data being updated on the actor
 * @param {object} options Additional options for the update operation
 * @param {string} userId The ID of the user performing the update
 * @returns {void}
 */
export function updateActor(actor, updateData, options, userId) {
  if (document.type === "character" && changed?.system?.attributes?.hp?.value === 0 && !document.statuses.has("unconscious")) {
    // Si déjà affaibli le statut est supprimé
    if (document.statuses.has("weakened")) {
      document.toggleStatusEffect("weakened", { active: false })
      document.unsetFlag("co2", "statuses.weakenedFromOneHP")
    }
    document.toggleStatusEffect("unconscious", { active: true })
    document.setFlag("co2", "statuses.unconsciousFromZeroHP", true)
    document.system.spendDR(1)
  }

  // Une rencontre est morte à 0 PV
  if (document.type === "encounter" && changed?.system?.attributes?.hp?.value === 0 && !document.statuses.has("dead")) {
    document.toggleStatusEffect("dead", { active: true })
  }
}

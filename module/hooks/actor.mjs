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
  if (!game.user.isActiveGM) return

  if (actor.type === "character" && updateData?.system?.attributes?.hp?.value === 0 && !actor.statuses.has("unconscious")) {
    // Si déjà affaibli le statut est supprimé
    if (actor.statuses.has("weakened")) {
      actor.toggleStatusEffect("weakened", { active: false })
      actor.unsetFlag("co2", "statuses.weakenedFromOneHP")
    }
    actor.toggleStatusEffect("unconscious", { active: true })
    actor.setFlag("co2", "statuses.unconsciousFromZeroHP", true)
    actor.system.spendDR(1)
  }

  // Une rencontre est morte à 0 PV
  if (actor.type === "encounter" && updateData?.system?.attributes?.hp?.value === 0 && !actor.statuses.has("dead")) {
    actor.toggleStatusEffect("dead", { active: true })
  }
}

/**
 * Hook callback function `co2.companionMasterDeleted`, émis quand un Compagnon
 * (Rencontre) perd son maitre (`EncounterData.deleteMaster()`/`toggleCompanion(false)`).
 * Retire le compagnon délié du tableau `system.companions` de son ancien maitre.
 *
 * @param {string} masterUuid UUID de l'ancien maitre (Personnage)
 * @param {string} companionUuid UUID de la Rencontre-Compagnon déliée
 * @returns {void}
 */
export function companionMasterDeleted(masterUuid, companionUuid) {
  if (!game.user.isActiveGM) return
  const master = fromUuidSync(masterUuid)
  if (!master || master.type !== "character") return
  const companions = master.system.companions.filter((uuid) => uuid !== companionUuid)
  if (companions.length !== master.system.companions.length) {
    master.update({ "system.companions": companions })
  }
}

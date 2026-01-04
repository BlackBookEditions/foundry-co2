/**
 * Deletes all effects from actors in a combat when the combat is deleted.
 * This function is triggered when a combat encounter is removed from the game.
 * Only executes if the current user is a Game Master.
 *
 * @param {Combat} combat The combat instance being deleted
 * @param {object} options Additional options passed during the deletion process
 * @param {string} userId The ID of the user who triggered the combat deletion
 * @returns {void}
 */
export function deleteCombat(combat, options, userId) {
  if (game.user.isGM) {
    combat.combatants.forEach((combatant) => {
      const actor = combatant.actor
      if (actor) {
        actor.deleteEffects()
      }
    })
  }
}

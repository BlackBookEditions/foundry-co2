import Macros from "../helpers/macros.mjs"
import Utils from "../helpers/utils.mjs"

/**
 * Handles the deletion or creation of a combat macro when dropping an item on the hotbar.
 *
 * @param {Object} bar The hotbar object where the item is being dropped
 * @param {Object} data The data object containing information about the dropped item
 * @param {string} data.type The type of the dropped item (e.g., "Item", "co.action", "co.ability")
 * @param {number} slot The slot number on the hotbar where the item is being dropped
 * @returns {boolean} Returns false if the item type matches the specified types and a macro is created
 */
export function hotbarDrop(bar, data, slot) {
  if (["Item", "co.action", "co.ability"].includes(data.type)) {
    if (CONFIG.debug.co2?.hooks) console.debug(Utils.log(`HotbarDrop`), bar, data, slot)
    Macros.createCOMacro(data, slot)
    return false
  }
  return true
}

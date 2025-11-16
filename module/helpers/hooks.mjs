import { SYSTEM } from "../config/system.mjs"
import { CORoll } from "../documents/roll.mjs"
import Hitpoints from "./hitpoints.mjs"
import Macros from "./macros.mjs"
import { Resolver } from "../models/schemas/resolver.mjs"
import Utils from "./utils.mjs"

/**
 * Registers various hooks for the game system.
 *
 * Hooks:
 * - `renderChatMessage`: Customizes the chat message rendering, including the display of damage buttons and difficulty.
 * - `hotbarDrop`: Handles the dropping of items or actions onto the hotbar.
 *
 * @module system/hooks
 *
 * @function registerHooks
 *
 * @listens Hooks#renderChatMessage
 * @param {Object} message The chat message object.
 * @param {Object} html The HTML content of the chat message.
 * @param {Object} data Additional data related to the chat message.
 *
 * @listens Hooks#hotbarDrop
 * @param {Object} bar The hotbar object.
 * @param {Object} data The data being dropped onto the hotbar.
 * @param {number} slot The slot number where the data is being dropped.
 */
export function registerHooks() {
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (["Item", "co.action", "co.ability"].includes(data.type)) {
      if (CONFIG.debug.co2?.hooks) console.debug(Utils.log(`HotbarDrop`), bar, data, slot)
      Macros.createCOMacro(data, slot)
      return false
    }
  })

}

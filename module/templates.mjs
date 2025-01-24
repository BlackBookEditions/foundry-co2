import { SYSTEM } from "./config/system.mjs"

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @returns {Promise}
 */
export default function preloadHandlebarsTemplates() {
  // Define template paths to load
  const templatePaths = [
    // ACTOR
    `systems/${SYSTEM.ID}/templates/actors/character-sheet.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/character-bio.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/character-details.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/character-effects.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/character-features.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/character-main.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/character-sidebar.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/inventory/character-inventory.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/inventory/character-inventory-item.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/paths/character-paths.hbs`,
    `systems/${SYSTEM.ID}/templates/actors/parts/paths/character-capacities.hbs`,

    // ENCOUNTER
    `systems/${SYSTEM.ID}/templates/encounter/encounter-sheet.hbs`,
    `systems/${SYSTEM.ID}/templates/encounter/parts/encounter-data.hbs`,
    `systems/${SYSTEM.ID}/templates/encounter/parts/encounter-loot.hbs`,
    `systems/${SYSTEM.ID}/templates/encounter/parts/encounter-main.hbs`,
    `systems/${SYSTEM.ID}/templates/encounter/parts/encounter-notes.hbs`,
    `systems/${SYSTEM.ID}/templates/encounter/parts/encounter-sidebar.hbs`,

    // ITEM
    `systems/${SYSTEM.ID}/templates/items/item-sheet.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/attack-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/capacity-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/equipment-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/feature-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/path-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/profile-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/actions/action-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/actions/conditions-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/actions/resolvers-partial.hbs`,
    `systems/${SYSTEM.ID}/templates/items/parts/actions/modifiers-partial.hbs`,
  ]

  // Load the template parts
  return loadTemplates(templatePaths)
}

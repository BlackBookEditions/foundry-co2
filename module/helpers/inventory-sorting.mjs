/**
 * Tri d'affichage de l'inventaire : onglet Inventaire des personnages et onglet Butin des rencontres.
 * Seul l'affichage change : le champ `sort` des objets, donc l'ordre manuel, n'est jamais modifié.
 */

/**
 * Tris disponibles, dans l'ordre des boutons du sélecteur de tri.
 * @type {Object<string, {id: string, icon: string, tooltip: string}>}
 */
export const INVENTORY_SORTINGS = {
  default: { id: "default", icon: "fa-grip-lines", tooltip: "CO.ui.sortInventoryByDefault" },
  byNameAsc: { id: "byNameAsc", icon: "fa-arrow-down-a-z", tooltip: "CO.ui.sortInventoryByNameAsc" },
  byNameDesc: { id: "byNameDesc", icon: "fa-arrow-down-z-a", tooltip: "CO.ui.sortInventoryByNameDesc" },
}

/**
 * Retourne le tri correspondant à un identifiant. Un identifiant inconnu donne le tri par défaut.
 * @param {string} id L'identifiant du tri
 * @returns {{id: string, icon: string, tooltip: string}} Le tri
 */
export function getInventorySorting(id) {
  return Object.hasOwn(INVENTORY_SORTINGS, id) ? INVENTORY_SORTINGS[id] : INVENTORY_SORTINGS.default
}

/**
 * Trie par nom, sur place, les objets de chaque catégorie de l'inventaire, les contenants et le contenu de chaque contenant.
 * Le tri par défaut ne touche à rien : l'ordre manuel est conservé.
 * La comparaison ignore la casse et les accents, et range les nombres dans l'ordre numérique (Potion 2 avant Potion 10).
 * @param {object} lists Les listes à trier
 * @param {Array<{items: Array<{name: string}>}>} [lists.inventory] Les catégories de l'inventaire
 * @param {Array<{name: string, contents: Array<{name: string}>}>} [lists.containers] Les contenants
 * @param {string} id L'identifiant du tri
 * @param {string} [lang] La langue utilisée pour comparer les noms, par défaut celle de l'environnement
 */
export function applyInventorySorting(lists, id, lang) {
  const sorting = getInventorySorting(id)
  if (sorting === INVENTORY_SORTINGS.default) return
  const { inventory = [], containers = [] } = lists ?? {}
  const collator = new Intl.Collator(lang, { sensitivity: "base", numeric: true })
  const direction = sorting === INVENTORY_SORTINGS.byNameDesc ? -1 : 1
  const byName = (a, b) => direction * collator.compare(a.name ?? "", b.name ?? "")
  for (const group of inventory) group.items?.sort(byName)
  containers.sort(byName)
  for (const container of containers) container.contents?.sort(byName)
}

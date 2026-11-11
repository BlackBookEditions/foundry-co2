import test from "node:test"
import assert from "node:assert/strict"
import { INVENTORY_SORTINGS, getInventorySorting, applyInventorySorting } from "../module/helpers/inventory-sorting.mjs"

const names = (items) => items.map((item) => item.name)
const items = (...list) => list.map((name) => ({ name }))

/** Inventaire d'essai, dans son ordre manuel. */
const lists = () => ({
  inventory: [
    { category: "weapon", items: items("Épée longue", "dague", "Arc court", "Epieu") },
    { category: "consumable", items: items("Potion 10", "Potion 2", "Antidote") },
    { category: "misc", items: [] },
  ],
  containers: [
    { name: "Sac à dos", contents: items("Torche", "Corde", "briquet") },
    { name: "Bourse", contents: [] },
  ],
})

test("le sélecteur propose l'ordre manuel, de A à Z, puis de Z à A", () => {
  assert.deepEqual(Object.keys(INVENTORY_SORTINGS), ["default", "byNameAsc", "byNameDesc"])
})

test("un tri inconnu vaut le tri par défaut", () => {
  for (const id of [undefined, null, "", "byRank", "toString"]) {
    assert.equal(getInventorySorting(id), INVENTORY_SORTINGS.default)
  }
})

test("chaque tri porte son identifiant, son icône et son info-bulle", () => {
  for (const [id, sorting] of Object.entries(INVENTORY_SORTINGS)) {
    assert.equal(sorting.id, id)
    assert.match(sorting.icon, /^fa-(grip-lines|arrow-down-a-z|arrow-down-z-a)$/)
    assert.match(sorting.tooltip, /^CO\.ui\.sortInventoryBy/)
  }
})

test("le tri par défaut conserve l'ordre manuel", () => {
  for (const id of ["default", undefined, "byRank"]) {
    const sorted = lists()
    applyInventorySorting(sorted, id, "fr")
    assert.deepEqual(sorted, lists())
  }
})

test("de A à Z : catégories, contenants et contenus sont triés par nom, sans tenir compte de la casse ni des accents", () => {
  const sorted = lists()
  applyInventorySorting(sorted, "byNameAsc", "fr")
  assert.deepEqual(names(sorted.inventory[0].items), ["Arc court", "dague", "Épée longue", "Epieu"])
  assert.deepEqual(names(sorted.inventory[1].items), ["Antidote", "Potion 2", "Potion 10"])
  assert.deepEqual(names(sorted.inventory[2].items), [])
  assert.deepEqual(names(sorted.containers), ["Bourse", "Sac à dos"])
  assert.deepEqual(names(sorted.containers[1].contents), ["briquet", "Corde", "Torche"])
})

test("de Z à A : l'ordre est inversé", () => {
  const sorted = lists()
  applyInventorySorting(sorted, "byNameDesc", "fr")
  assert.deepEqual(names(sorted.inventory[0].items), ["Epieu", "Épée longue", "dague", "Arc court"])
  assert.deepEqual(names(sorted.inventory[1].items), ["Potion 10", "Potion 2", "Antidote"])
  assert.deepEqual(names(sorted.containers), ["Sac à dos", "Bourse"])
  assert.deepEqual(names(sorted.containers[0].contents), ["Torche", "Corde", "briquet"])
})

test("les catégories restent à leur place et les objets ne sont pas modifiés", () => {
  const sorted = lists()
  const dague = sorted.inventory[0].items[1]
  applyInventorySorting(sorted, "byNameAsc", "fr")
  assert.deepEqual(
    sorted.inventory.map((group) => group.category),
    ["weapon", "consumable", "misc"],
  )
  assert.equal(sorted.inventory[0].items[1], dague)
  assert.deepEqual(dague, { name: "dague" })
})

test("des listes absentes, un nom manquant ou une langue non précisée ne provoquent pas d'erreur", () => {
  assert.doesNotThrow(() => applyInventorySorting(undefined, "byNameAsc"))
  assert.doesNotThrow(() => applyInventorySorting({}, "byNameAsc"))
  const sorted = { inventory: [{ items: [{ name: "b" }, {}, { name: "a" }] }, {}], containers: [{ name: "z" }, { name: "y" }] }
  applyInventorySorting(sorted, "byNameAsc")
  assert.deepEqual(names(sorted.inventory[0].items), [undefined, "a", "b"])
  assert.deepEqual(names(sorted.containers), ["y", "z"])
})

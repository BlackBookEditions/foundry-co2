import test from "node:test"
import assert from "node:assert/strict"

import { computeProfileHp } from "../module/helpers/hp-rules.mjs"

const total = (params) => {
  const { base, prestige } = computeProfileHp(params)
  return base + prestige
}

test("sans voie de prestige, la vigueur suit 2 fois la famille puis 1 fois par niveau", () => {
  assert.deepEqual(computeProfileHp({ level: 1, pvFromFamily: 5 }), { base: 10, prestige: 0 })
  assert.deepEqual(computeProfileHp({ level: 9, pvFromFamily: 5 }), { base: 50, prestige: 0 })
})

test("une voie de prestige de même vigueur que la famille ne change pas le total (issue #99)", () => {
  // Barbare (combattant, 5) niveau 9 + voie du lycanthrope (5) rang 1 : 50 PV et non 55
  assert.equal(total({ level: 9, pvFromFamily: 5, pvPrestige: 5, learnedPrestige: 1 }), 50)
  assert.deepEqual(computeProfileHp({ level: 9, pvFromFamily: 5, pvPrestige: 5, learnedPrestige: 1 }), { base: 45, prestige: 5 })
})

test("la vigueur de la voie remplace celle de la famille, dans un sens comme dans l'autre", () => {
  // Combattant (5) avec le familier fantastique (4) : -1 par capacité
  assert.equal(total({ level: 9, pvFromFamily: 5, pvPrestige: 4, learnedPrestige: 2 }), 48)
  // Mage (3) avec le lycanthrope (5) : +2 par capacité
  assert.equal(total({ level: 9, pvFromFamily: 3, pvPrestige: 5, learnedPrestige: 1 }), 32)
})

test("une voie à vigueur nulle conserve la vigueur du profil, quel que soit le nombre de capacités apprises", () => {
  assert.deepEqual(computeProfileHp({ level: 9, pvFromFamily: 4, pvPrestige: 0, learnedPrestige: 3 }), { base: 40, prestige: 0 })
})

test("le nombre de niveaux du profil ne devient jamais négatif", () => {
  assert.deepEqual(computeProfileHp({ level: 2, pvFromFamily: 4, pvPrestige: 5, learnedPrestige: 6 }), { base: 8, prestige: 30 })
})

import test from "node:test"
import assert from "node:assert/strict"
import { GRIPS, VERSATILE_STATES, usesHands, isVersatile, handsNeeded, versatileState, computeGrip, matchesGrip } from "../module/helpers/weapon-grip.mjs"

const none = { oneHand: false, twoHand: false }
const oneHand = { oneHand: true, twoHand: false }
const twoHands = { oneHand: false, twoHand: true }
const versatile = { oneHand: true, twoHand: true }
const versatilePreferOne = { oneHand: true, twoHand: true, preferOneHand: true }

test("usesHands et isVersatile suivent les cases d'usage", () => {
  assert.equal(usesHands(none), false)
  assert.equal(usesHands(oneHand), true)
  assert.equal(usesHands(twoHands), true)
  assert.equal(usesHands(undefined), false)
  assert.equal(isVersatile(versatile), true)
  assert.equal(isVersatile(oneHand), false)
  assert.equal(isVersatile(twoHands), false)
})

test("handsNeeded : une arme polyvalente n'exige qu'une main", () => {
  assert.equal(handsNeeded(none), 0)
  assert.equal(handsNeeded(oneHand), 1)
  assert.equal(handsNeeded(twoHands), 2)
  assert.equal(handsNeeded(versatile), 1)
})

test("computeGrip : les objets non polyvalents gardent leur prise fixe", () => {
  assert.equal(computeGrip(none, false), null)
  assert.equal(computeGrip(oneHand, false), GRIPS.oneHand)
  assert.equal(computeGrip(twoHands, true), GRIPS.twoHands)
})

test("computeGrip : une arme polyvalente s'adapte à l'autre main", () => {
  assert.equal(computeGrip(versatile, false), GRIPS.twoHands)
  assert.equal(computeGrip(versatile, true), GRIPS.oneHand)
  assert.equal(computeGrip(versatilePreferOne, false), GRIPS.oneHand)
  assert.equal(computeGrip(versatilePreferOne, true), GRIPS.oneHand)
})

test("versatileState explique la prise en main, l'autre main occupée primant sur la préférence", () => {
  assert.equal(versatileState(oneHand, false), null)
  assert.equal(versatileState(versatile, false), VERSATILE_STATES.twoHands)
  assert.equal(versatileState(versatile, true), VERSATILE_STATES.oneHandBusy)
  assert.equal(versatileState(versatilePreferOne, false), VERSATILE_STATES.oneHandPreferred)
  assert.equal(versatileState(versatilePreferOne, true), VERSATILE_STATES.oneHandBusy)
})

test("matchesGrip ne regarde que les conditions de prise en main", () => {
  const equipped = { predicate: "isEquipped" }
  const one = { predicate: "isWieldedOneHand" }
  const two = { predicate: "isWieldedTwoHands" }
  assert.equal(matchesGrip([], GRIPS.oneHand), true)
  assert.equal(matchesGrip(undefined, GRIPS.oneHand), true)
  assert.equal(matchesGrip([equipped], GRIPS.twoHands), true)
  assert.equal(matchesGrip([equipped, one], GRIPS.oneHand), true)
  assert.equal(matchesGrip([equipped, one], GRIPS.twoHands), false)
  assert.equal(matchesGrip([two], GRIPS.twoHands), true)
  assert.equal(matchesGrip([two], null), false)
})

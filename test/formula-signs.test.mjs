import test from "node:test"
import assert from "node:assert/strict"
import { cleanFormulaSigns } from "../module/helpers/formula-signs.mjs"

test("une valeur négative ajoutée devient une soustraction", () => {
  assert.equal(cleanFormulaSigns("1d12 + -1"), "1d12 - 1")
  assert.equal(cleanFormulaSigns("1d12+-1"), "1d12 - 1")
  assert.equal(cleanFormulaSigns("1d20 + -1 + 2"), "1d20 - 1 + 2")
  assert.equal(cleanFormulaSigns("1d6 + -1d4"), "1d6 - 1d4")
})

test("les autres suites de signes sont simplifiées", () => {
  assert.equal(cleanFormulaSigns("1d8 - -2"), "1d8 + 2")
  assert.equal(cleanFormulaSigns("1d8 - +2"), "1d8 - 2")
  assert.equal(cleanFormulaSigns("1d8 + +2"), "1d8 + 2")
  assert.equal(cleanFormulaSigns("1d8 + - -2"), "1d8 + 2")
})

test("les formules sans suite de signes ne changent pas", () => {
  assert.equal(cleanFormulaSigns("1d12 + 3"), "1d12 + 3")
  assert.equal(cleanFormulaSigns("-1 + 1d6"), "-1 + 1d6")
  assert.equal(cleanFormulaSigns("2 * -1"), "2 * -1")
  assert.equal(cleanFormulaSigns("(1d3+1)+1d4°"), "(1d3+1)+1d4°")
  assert.equal(cleanFormulaSigns("2d20kh + 5"), "2d20kh + 5")
})

test("une valeur qui n'est pas une chaîne est rendue telle quelle", () => {
  assert.equal(cleanFormulaSigns(undefined), undefined)
  assert.equal(cleanFormulaSigns(null), null)
  assert.equal(cleanFormulaSigns(3), 3)
})

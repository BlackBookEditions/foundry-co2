import test from "node:test"
import assert from "node:assert/strict"
import { runInNewContext } from "node:vm"
import { resolveCompanionFormula } from "../module/helpers/companion-formula.mjs"

const resolve = (formula, options = {}) =>
  resolveCompanionFormula({
    formula,
    active: true,
    masterData: { niv: 6, atm: 8, for: -2, combat: { init: { value: 4 } }, attributes: { hp: { value: 23 } } },
    companionData: { rank: 3 },
    evaluate: (expression) => runInNewContext(expression, { max: Math.max }),
    ...options,
  })

test("vide ou désactivée, une formule laisse la base intacte", () => {
  for (const formula of [undefined, "", "  "]) assert.equal(resolve(formula), undefined)
  for (const formula of ["6", "0", "@master.niv"]) assert.equal(resolve(formula, { active: false }), undefined)
})

test("constantes et arithmétique sans maître, y compris zéro", () => {
  for (const [formula, value] of [
    ["0", 0],
    [" 0 ", 0],
    ["6", 6],
    ["2 * (3 + 1)", 8],
  ]) {
    assert.equal(resolve(formula, { masterData: undefined }), value)
  }
})

test("les variables du maître sont résolues, y compris négatifs et fonctions", () => {
  assert.equal(resolve("5 * @master.niv"), 30)
  assert.equal(resolve("@master.atm + @master.niv"), 14)
  assert.equal(resolve("2 - @master.for"), 4)
  assert.equal(resolve("max(@master.niv, 3)"), 6)
  assert.equal(resolve("@master.init + @master.hp"), 27)
  assert.equal(resolve("@master.combat.init.value"), 4)
})

test("le rang mémorisé du compagnon est résolu", () => {
  assert.equal(resolve("13 + @companion.rank"), 16)
  assert.equal(resolve("@companion.rank * 2", { companionData: { rank: 5 } }), 10)
  assert.equal(resolve("13 + @companion.rank", { companionData: { rank: 8 } }), 21)
})

test("donnée absente, résultat non numérique, infini et syntaxe invalide sont des erreurs", () => {
  for (const formula of ["@master.inconnu", "@master.combat", "@companion.inconnu", "2 +", "1 / 0", "true", "1d6"]) {
    assert.throws(() => resolve(formula))
  }
  assert.throws(() => resolve("@master.niv", { masterData: undefined }))
})

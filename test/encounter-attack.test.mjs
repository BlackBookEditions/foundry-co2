import test from "node:test"
import assert from "node:assert/strict"
import { runInNewContext } from "node:vm"
import { prepareEncounterAttack } from "../module/helpers/encounter-attack.mjs"

const prepare = (formula, resolvedFormula, combatValue = 8, combatKey = "melee") =>
  prepareEncounterAttack({
    formula,
    resolvedFormula,
    combatValue,
    combatKey,
    evaluate: (expression) => {
      // L'adaptateur Foundry n'évalue que les jets déterministes.
      try {
        return runInNewContext(expression)
      } catch {
        return undefined
      }
    },
  })

test("une attaque fixe reçoit le score de la rencontre dans sa formule", () => {
  assert.equal(prepare("0", "0").formula, "8")
  assert.equal(prepare("5", "5").display, "+13")
  assert.equal(prepare("5", "5", -2).formula, "3")
})

test("@atc et @atd incluent déjà la base, les bonus et les malus", () => {
  assert.equal(prepare("@atc", "8").formula, "8")
  assert.equal(prepare("@atc + 2", "8 + 2").formula, "10")
  assert.equal(prepare("@atc", "-2", -2).formula, "-2")
  assert.equal(prepare("@atd + 2", "8 + 2", 8, "ranged").formula, "10")
})

test("les chemins complets sont reconnus mais pas les variables ressemblantes", () => {
  assert.equal(prepare("@combat.melee.value", "8").formula, "8")
  assert.equal(prepare("@combat.ranged.value", "8", 8, "ranged").formula, "8")
  assert.equal(prepare("@atcExtra", "3").formula, "11")
  assert.equal(prepare("@master.atc", "3").formula, "11")
  assert.equal(prepare("@combat.melee.base", "6").formula, "14")
})

test("les opérations explicites sur un score sont respectées", () => {
  assert.equal(prepare("2 * @atc", "2 * 8").formula, "16")
  assert.equal(prepare("@atc - @atc", "8 - 8").formula, "0")
})

test("la magie conserve @atm (VOL + NC) augmenté de combat.magic.value", () => {
  assert.equal(prepare("@atm", "7", 3, "magic").formula, "10")
  assert.equal(prepare("@atm", "7", -2, "magic").formula, "5")
  assert.equal(prepare("0", "0", 6, "magic").formula, "6")
  assert.equal(prepare("@combat.magic.value", "3", 3, "magic").formula, "3")
  assert.equal(prepare("@atm + @combat.magic.value", "7 + 3", 3, "magic").formula, "10")
})

test("un aperçu avec dés ou cible reste une expression", () => {
  assert.equal(prepare("1d4", "1d4", 2).formula, "(1d4) + (2)")
  let evaluated = false
  const result = prepareEncounterAttack({
    formula: "@cible.def",
    combatKey: "melee",
    combatValue: 2,
    evaluate: () => {
      evaluated = true
      return 0
    },
  })
  assert.equal(evaluated, false)
  assert.equal(result.display, "(@cible.def) + (2)")
})

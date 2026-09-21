/**
 * Prépare le score d'une attaque de rencontre, commun à la fiche et au jet.
 * @atm reste VOL + NC : seuls les chemins combat.magic.value incluent déjà
 * l'ajustement magique de la rencontre.
 */
export function prepareEncounterAttack({ formula, resolvedFormula, combatKey, combatValue = 0, evaluate }) {
  const references = new Set(String(formula).match(/@[a-zA-Z_][a-zA-Z0-9_.]*/g) ?? [])
  const aliases = { melee: "@atc", ranged: "@atd" }
  const includesScore = references.has(`@combat.${combatKey}.value`) || (aliases[combatKey] && references.has(aliases[combatKey]))
  const adjustment = includesScore ? 0 : combatValue
  const original = String(resolvedFormula ?? formula).trim() || "0"
  const expression = adjustment === 0 ? original : `(${original}) + (${adjustment})`
  // Ne jamais lancer de dés ni substituer une cible absente pour un aperçu.
  const value = expression.includes("@") ? undefined : evaluate(expression)
  const numeric = typeof value === "number" && Number.isFinite(value)
  return {
    formula: numeric ? String(value) : expression,
    display: numeric ? (value > 0 ? `+${value}` : String(value)) : expression,
    adjustment,
    resolvedFormula: original,
  }
}

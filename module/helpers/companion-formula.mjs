/** Une formule absente/inactive ne remplace pas la base. Une erreur non plus. */
export function resolveCompanionFormula({ formula, active, masterData, companionData, evaluate }) {
  const expression = String(formula ?? "").trim()
  if (!active || !expression) return undefined
  const get = (path) => path.split(".").reduce((value, key) => value?.[key], masterData)
  const getCompanion = (path) => path.split(".").reduce((value, key) => value?.[key], companionData)
  const processed = expression
    .replace(/@master\.([a-zA-Z_][a-zA-Z0-9_.]*)/g, (match, key) => {
      let value = get(key)
      if (value === undefined && !key.includes(".")) value = get(`combat.${key}.value`) ?? get(`attributes.${key}.value`)
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Valeur indisponible : ${match}`)
      return `(${value})`
    })
    .replace(/@companion\.([a-zA-Z_][a-zA-Z0-9_.]*)/g, (match, key) => {
      const value = getCompanion(key)
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Valeur indisponible : ${match}`)
      return `(${value})`
    })
  const value = evaluate(processed)
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Résultat invalide : ${expression}`)
  return value
}

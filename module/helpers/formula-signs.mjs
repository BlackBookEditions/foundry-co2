/**
 * Simplifie les signes consécutifs d'une formule de dés, pour l'affichage.
 *
 * Une formule comme « 1d12 + @for » devient « 1d12 + -1 » une fois les valeurs de l'acteur remplacées
 * quand la caractéristique est négative : Foundry la lance correctement, mais l'affiche telle quelle.
 * Les suites de signes sont ramenées à un seul : « + - » et « - + » donnent « - », « - - » et « + + » donnent « + ».
 * Les autres opérateurs ne sont pas touchés (« 2 * -1 » reste tel quel).
 *
 * Fonction pure, sans dépendance à Foundry, pour être testable en dehors du jeu.
 *
 * @param {string} formula La formule à simplifier.
 * @returns {string} La formule simplifiée, ou la valeur reçue telle quelle si ce n'est pas une chaîne.
 */
export function cleanFormulaSigns(formula) {
  if (typeof formula !== "string") return formula
  let previous
  let result = formula
  do {
    previous = result
    result = result.replace(/\s*([+-])\s*([+-])\s*/g, (match, first, second) => (first === second ? " + " : " - "))
  } while (result !== previous)
  return result.trim()
}

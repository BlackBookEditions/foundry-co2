/**
 * Prise en main des objets tenus en main, et en particulier des armes polyvalentes.
 *
 * Une arme est polyvalente quand ses deux cases d'usage, « Une main » et « Deux mains », sont cochées
 * (Épée bâtarde, Épieu, Lance…). Sa prise en main n'est jamais enregistrée : elle est déduite de ce que
 * porte le personnage. Tenue à deux mains si l'autre main est libre, à une main si elle est occupée
 * (bouclier, seconde arme, objet tenu), ou si le joueur a choisi de la tenir à une main (usage.preferOneHand).
 *
 * Fonctions pures, sans dépendance à Foundry, pour être testables en dehors du jeu.
 */

/** Prises en main possibles. */
export const GRIPS = Object.freeze({
  oneHand: "oneHand",
  twoHands: "twoHands",
})

/**
 * États d'une arme polyvalente, qui expliquent sa prise en main.
 * - twoHands : tenue à deux mains, l'autre main est libre
 * - oneHandPreferred : tenue à une main par choix du joueur
 * - oneHandBusy : tenue à une main car l'autre main est occupée
 */
export const VERSATILE_STATES = Object.freeze({
  twoHands: "twoHands",
  oneHandPreferred: "oneHandPreferred",
  oneHandBusy: "oneHandBusy",
})

/**
 * L'objet se tient-il en main ?
 * @param {{oneHand?: boolean, twoHand?: boolean}} usage Les cases d'usage de l'objet.
 * @returns {boolean}
 */
export function usesHands(usage) {
  return Boolean(usage?.oneHand || usage?.twoHand)
}

/**
 * L'objet est-il polyvalent, c'est-à-dire utilisable à une ou deux mains ?
 * @param {{oneHand?: boolean, twoHand?: boolean}} usage Les cases d'usage de l'objet.
 * @returns {boolean}
 */
export function isVersatile(usage) {
  return Boolean(usage?.oneHand && usage?.twoHand)
}

/**
 * Nombre minimal de mains que l'objet occupe une fois équipé : une arme polyvalente s'adapte et n'en exige qu'une.
 * @param {{oneHand?: boolean, twoHand?: boolean}} usage Les cases d'usage de l'objet.
 * @returns {number} 0, 1 ou 2.
 */
export function handsNeeded(usage) {
  if (!usesHands(usage)) return 0
  if (isVersatile(usage)) return 1
  return usage.twoHand ? 2 : 1
}

/**
 * État d'une arme polyvalente selon la préférence du joueur et l'occupation de l'autre main.
 * @param {{oneHand?: boolean, twoHand?: boolean, preferOneHand?: boolean}} usage Les cases d'usage de l'objet.
 * @param {boolean} otherHandBusy Vrai si un autre objet tenu en main est équipé.
 * @returns {string|null} Une valeur de VERSATILE_STATES, ou null si l'objet n'est pas polyvalent.
 */
export function versatileState(usage, otherHandBusy) {
  if (!isVersatile(usage)) return null
  if (otherHandBusy) return VERSATILE_STATES.oneHandBusy
  if (usage.preferOneHand) return VERSATILE_STATES.oneHandPreferred
  return VERSATILE_STATES.twoHands
}

/**
 * Prise en main de l'objet.
 * @param {{oneHand?: boolean, twoHand?: boolean, preferOneHand?: boolean}} usage Les cases d'usage de l'objet.
 * @param {boolean} otherHandBusy Vrai si un autre objet tenu en main est équipé.
 * @returns {string|null} Une valeur de GRIPS, ou null si l'objet ne se tient pas en main.
 */
export function computeGrip(usage, otherHandBusy) {
  if (!usesHands(usage)) return null
  if (!isVersatile(usage)) return usage.twoHand ? GRIPS.twoHands : GRIPS.oneHand
  return versatileState(usage, otherHandBusy) === VERSATILE_STATES.twoHands ? GRIPS.twoHands : GRIPS.oneHand
}

/** Prédicats de condition d'action liés à la prise en main, et la prise en main que chacun exige. */
export const GRIP_PREDICATES = Object.freeze({
  isWieldedOneHand: GRIPS.oneHand,
  isWieldedTwoHands: GRIPS.twoHands,
})

/**
 * Les conditions de prise en main d'une action sont-elles remplies ? Les autres conditions sont ignorées.
 * @param {Array<{predicate: string}>} conditions Les conditions de l'action.
 * @param {string|null} grip La prise en main actuelle de l'objet (valeur de GRIPS).
 * @returns {boolean} Vrai si l'action n'a pas de condition de prise en main, ou si elles correspondent toutes à grip.
 */
export function matchesGrip(conditions, grip) {
  return (conditions ?? []).every((condition) => !(condition.predicate in GRIP_PREDICATES) || GRIP_PREDICATES[condition.predicate] === grip)
}

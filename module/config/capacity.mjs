export const CAPACITY_ACTION_TYPE = {
  none: {
    id: "none",
    label: "CO.capacity.action.type.none",
  },
  l: {
    id: "l",
    label: "CO.capacity.action.type.l",
  },
  a: {
    id: "a",
    label: "CO.capacity.action.type.a",
  },
  m: {
    id: "m",
    label: "CO.capacity.action.type.m",
  },
  f: {
    id: "f",
    label: "CO.capacity.action.type.f",
  },
}
/**
 * Fréquence indiquant tous les combien de temps on peux utiliser une capacité.
 * None : pas de limite
 * daily : 1 fois par jour, necessite une récupération complète pour être réutilisée
 * combat: une fois par combat, nécessite une récupération rapide pour être réutilisée
 **/

export const CAPACITY_FREQUENCY = {
  none: {
    id: "none",
    label: "CO.capacity.frequency.none",
  },
  daily: {
    id: "daily",
    label: "CO.capacity.frequency.daily",
  },
  combat: {
    id: "combat",
    label: "CO.capacity.frequency.combat",
  },
}

// Pour obtenir une capacité, il faut avoir un niveau minimal
// Rang : Niveau minimal
export const CAPACITY_MINIMUM_LEVEL = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
  8: 13,
}

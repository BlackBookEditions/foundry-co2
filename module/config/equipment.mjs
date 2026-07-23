export const EQUIPMENT_SUBTYPES = {
  armor: {
    id: "armor",
    label: "CO.equipment.subtypes.armor",
  },
  shield: {
    id: "shield",
    label: "CO.equipment.subtypes.shield",
  },
  weapon: {
    id: "weapon",
    label: "CO.equipment.subtypes.weapon",
  },
  consumable: {
    id: "consumable",
    label: "CO.equipment.subtypes.consumable",
  },
  misc: {
    id: "misc",
    label: "CO.equipment.subtypes.misc",
  },
}

// COF2 Livre de Règles, Page 193
export const EQUIPMENT_RARITY = {
  common: {
    id: "common",
    label: "CO.rarity.common",
  },
  precious: {
    id: "precious",
    label: "CO.rarity.precious",
  },
  exotic: {
    id: "exotic",
    label: "CO.rarity.exotic",
  },
  rare: {
    id: "rare",
    label: "CO.rarity.rare",
  },
  veryRare: {
    id: "veryRare",
    label: "CO.rarity.veryRare",
  },
  unique: {
    id: "unique",
    label: "CO.rarity.unique",
  },
}

export const EQUIPMENT_DAMAGETYPE = {
  slashing: {
    id: "slashing",
    label: "CO.damage.slashing",
  },
  impact: {
    id: "bludgeoning",
    label: "CO.damage.bludgeoning",
  },
  piercing: {
    id: "piercing",
    label: "CO.damage.piercing",
  },
  magic: {
    id: "magic",
    label: "CO.damage.magic",
  },
}

/**
 * Devises par défaut du système (hypothèse fantasy COF2 : or/argent/cuivre).
 * Un module de contenu d'univers peut REMPLACER l'ensemble à son hook
 * `init` via `game.system.CONST.CURRENCY = {...}`, AVANT que le schéma `wealth` des acteurs (character/
 * encounter) ne soit figé : `defineSchema` est paresseux (appelé au plus tôt à setup/ready, donc après
 * tous les init de modules). Le data path de la richesse est `system.wealth.<id>.value`.
 * Contrat : chaque entrée = { id, label } ; `label` est une clé i18n localisée à l'affichage par le
 * helper Handlebars `getCurrencyLabel` — un module fournit ses propres clés dans son namespace.
 */
export const EQUIPMENT_CURRENCIES = {
  gp: {
    id: "gp",
    label: "CO.currency.gp",
  },
  sp: {
    id: "sp",
    label: "CO.currency.sp",
  },
  cp: {
    id: "cp",
    label: "CO.currency.cp",
  },
}

/**
 * Tags d'équipement, alimentés par un module de contenu (cf. cof2-base).
 * Les tags existants — DM temporaires, DM temporaires possibles, arme légère — sont propres à COF2 et
 * ne sont portés que par les compendiums de cof2-base, c'est donc lui qui les déclare.
 *
 * Cet objet alimente le picker de tags de la feuille d'équipement (via `context.equipmentTagChoices`).
 * Le champ `tags` du modèle n'impose plus `choices` : un équipement portant un tag non déclaré dans le monde
 * courant (module désactivé, compilation CLI des packs, timing d'init) est conservé sans échec de validation.
 *
 * Non figé afin qu'un module puisse le compléter au hook init.
 */
export const EQUIPMENT_TAGS = {}

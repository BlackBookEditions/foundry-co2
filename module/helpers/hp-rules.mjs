/**
 * Calcule la vigueur d'un personnage à profil unique, hors bonus de Constitution.
 *
 * Au niveau 1 le personnage obtient 2 fois la vigueur de sa famille, puis 1 fois par niveau supplémentaire.
 * Une voie de prestige octroie sa propre vigueur, utilisée à la place de celle de la famille au niveau où
 * une de ses capacités est choisie : chaque capacité de prestige apprise retire donc un niveau « profil »
 * et ajoute la vigueur de la voie.
 *
 * Limite connue : l'encadré « Grand méchant loup » (voie du lycanthrope) permet de transférer plusieurs capacités
 * d'une ancienne voie de prestige par niveau. Le comptage par capacité apprise surestime alors la substitution.
 *
 * @param {object} params
 * @param {number} params.level Niveau du personnage.
 * @param {number} params.pvFromFamily Vigueur par niveau de la famille du profil.
 * @param {number} [params.pvPrestige=0] Vigueur par niveau de la voie de prestige (0 : identique à la famille).
 * @param {number} [params.learnedPrestige=0] Nombre de capacités de la voie de prestige apprises.
 * @returns {{base: number, prestige: number}} Vigueur issue du profil et vigueur issue de la voie de prestige.
 */
export function computeProfileHp({ level, pvFromFamily, pvPrestige = 0, learnedPrestige = 0 }) {
  const nbPrestige = pvPrestige > 0 ? learnedPrestige : 0
  const profileLevels = Math.max(0, level - 1 - nbPrestige)

  return {
    base: 2 * pvFromFamily + profileLevels * pvFromFamily,
    prestige: nbPrestige * pvPrestige,
  }
}

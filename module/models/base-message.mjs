export default class BaseMessageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      targets: new fields.ArrayField(new fields.DocumentUUIDField({ type: "Actor" })),
    }
  }

  // Est-ce que l'actor du user courant est ciblé par le message
  get isActorTargeted() {
    // Si c'est un MJ, on considère que tous les acteurs sont ciblés
    if (game.user.isGM) return true
    const actor = game.user.character
    if (!actor) return false
    const { id } = foundry.utils.parseUuid(actor.uuid)
    // Extraire tous les ids des cibles
    const targets = this.targets.map((target) => {
      const { id } = foundry.utils.parseUuid(target)
      return id
    })
    return targets.includes(id)
  }
}

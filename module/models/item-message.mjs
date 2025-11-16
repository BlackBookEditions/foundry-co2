import BaseMessageData from "./base-message.mjs"

export default class ItemMessageData extends BaseMessageData {
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      customItem: new fields.StringField({ required: true, nullable: false, initial: "" }),
    })
  }

  async addListeners(html) {
    // Clic sur les boutons d'action
    html.querySelectorAll(".toggle-action").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const shiftKey = !!event.shiftKey
        const dataset = event.currentTarget.dataset
        const actorId = dataset.actorId
        const actorUuid = dataset.actorUuid
        const action = dataset.action
        const type = dataset.type
        const source = dataset.source
        const indice = dataset.indice
        let actor = game.actors.get(actorId)
        if (actor.type === "encounter") actor = await fromUuid(actorUuid)
        let activation
        if (action === "activate") {
          activation = await actor.activateAction({ state: true, source, indice, type, shiftKey })
        } else if (action === "unactivate") {
          activation = await actor.activateAction({ state: false, source, indice, type })
        }
      })
    })
  }
}

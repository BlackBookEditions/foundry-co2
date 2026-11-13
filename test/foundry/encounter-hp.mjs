/**
 * Vérification d'intégration à exécuter comme MJ dans un monde de test CO2.
 * await (await import('/systems/co2/test/foundry/encounter-hp.mjs')).checkEncounterHP()
 */
export async function checkEncounterHP() {
  const actors = []
  let scene
  const checks = []
  const equal = (actual, expected, label) => {
    if (actual !== expected) throw new Error(`${label} : ${actual} au lieu de ${expected}`)
    checks.push(label)
  }
  const waitForDead = async (actor) => {
    // L'ajout à 0 PV passe par un hook asynchrone non attendu par Actor.update.
    for (let attempt = 0; attempt < 100; attempt++) {
      if (actor.statuses.has("dead")) return
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    throw new Error("Mort n'a pas été appliqué à 0 PV")
  }
  try {
    const actor = await Actor.create({
      name: "__test_encounter_hp",
      type: "encounter",
      system: { attributes: { hp: { base: 10, value: 5 } } },
    })
    actors.push(actor)
    scene = await Scene.create({ name: "__test_encounter_hp" })
    const tokens = await scene.createEmbeddedDocuments("Token", [
      { name: actor.name, actorId: actor.id, actorLink: true },
      { name: actor.name, actorId: actor.id, actorLink: false },
    ])
    for (const [label, target] of [["sans token", actor], ["token lié", tokens[0].actor], ["token indépendant", tokens[1].actor]]) {
      await target.update({ "system.attributes.hp.value": 0 })
      await waitForDead(target)
      await target.update({ name: target.name })
      equal(target.statuses.has("dead"), true, `${label} : une autre modification conserve Mort`)
      await target.update({ "system.attributes.hp.value": 1 })
      equal(target.statuses.has("dead"), false, `${label} : saisir 1 PV retire Mort`)
      equal(target.system.attributes.hp.value, 1, `${label} : la vigueur vaut 1`)
      await target.applyDamage({ damage: 1, ignoreDR: true })
      equal(target.statuses.has("dead"), true, `${label} : les dégâts à 0 PV réappliquent Mort`)
      await target.applyHeal({ heal: 1 })
      equal(target.statuses.has("dead"), false, `${label} : soigner 1 PV retire Mort`)
      equal(target.system.attributes.hp.value, 1, `${label} : le soin restaure la vigueur`)
      await target.toggleStatusEffect("dead", { active: true })
      await target.update({ "system.attributes.hp.value": 2 })
      equal(target.statuses.has("dead"), false, `${label} : une vigueur positive retire aussi Mort posé manuellement`)
      equal(target.system.attributes.hp.value, 2, `${label} : la vigueur vaut 2`)
    }
    return checks
  } finally {
    await scene?.delete()
    for (const actor of actors) await actor.delete()
  }
}

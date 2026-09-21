/**
 * Vérification d'intégration à exécuter comme MJ dans un monde de test CO2.
 * Crée ses propres documents et les supprime à la fin.
 * await (await import('/systems/co2/test/foundry/companion.mjs')).checkCompanions()
 */
export async function checkCompanions() {
  const { COAttackRoll } = await import("../../module/documents/roll.mjs")
  const originalPrompt = COAttackRoll.prompt
  const actors = []
  const checks = []
  let dialog
  const equal = (actual, expected, label) => {
    if (actual !== expected) throw new Error(`${label} : ${JSON.stringify(actual)} au lieu de ${JSON.stringify(expected)}`)
    checks.push(label)
  }
  const createActor = async (data) => {
    const actor = await Actor.create(data)
    actors.push(actor)
    return actor
  }
  try {
    const master = await createActor({ name: "__test_companion_master", type: "character" })
    await master.update({ "system.combat.magic.bonuses.sheet": 6 })
    const masterMagic = master.getRollData().atm
    const companion = await createActor({
      name: "__test_companion",
      type: "encounter",
      system: {
        companion: { isCompanion: true, master: master.uuid },
        abilities: { agi: { base: 3, formula: "@master.atm" }, vol: { base: 2 } },
        attributes: { nc: 3, hp: { base: 12, value: 10, formula: "2 * @master.atm" } },
        combat: {
          melee: { base: 1, formula: "@master.atm", bonuses: { sheet: 2 } },
          ranged: { base: 0, formula: "@master.atm", bonuses: { sheet: -2 } },
          magic: { base: 0, formula: "@master.atm" },
        },
      },
    })
    equal(companion.system.abilities.agi.base, 3, "la base saisie reste disponible")
    equal(companion.system.abilities.agi.value, masterMagic, "la caractéristique utilise le maître")
    equal(companion.system.attributes.hp.max, 2 * masterMagic, "les PV utilisent le maître")
    equal(companion.getRollData().atm, 5, "@atm reste VOL + NC")
    equal(companion.system.combat.magic.value, masterMagic, "l'ajustement magique du compagnon reste distinct")

    const [attack] = await companion.createEmbeddedDocuments("Item", [
      {
        name: "__test_attack",
        type: "attack",
        system: {
          subtype: "melee",
          actions: [
            {
              type: "melee",
              indice: 0,
              label: "Test",
              properties: { visible: true },
              resolvers: [{ type: "attack", skill: { formula: "0" }, dmg: { formula: "1" } }],
            },
          ],
        },
      },
    ])
    const attackCase = async (subtype, formula, expected) => {
      const actions = attack.toObject().system.actions
      actions[0].type = subtype === "magic" ? "magical" : subtype
      actions[0].resolvers[0].skill.formula = formula
      await attack.update({ "system.subtype": subtype, "system.actions": actions })
      equal(attack.system.displayValues.attack, expected > 0 ? `+${expected}` : String(expected), `${subtype} ${formula} : fiche`)
      COAttackRoll.prompt = async (context) => {
        dialog = context
        return null
      }
      const action = attack.system.actions[0]
      await action.resolvers[0].attack(companion, attack, action, "attack")
      equal(dialog.formulaAttack, `1d20 + ${expected}`, `${subtype} ${formula} : dialogue`)
      equal(dialog.initialSkillFormula, String(expected), `${subtype} ${formula} : changement de dé`)
      equal(dialog.skillBonus, 0, `${subtype} ${formula} : bonus ponctuel libre`)
      equal(dialog.skillMalus, 0, `${subtype} ${formula} : malus ponctuel libre`)
    }
    await attackCase("melee", "0", masterMagic + 2)
    await attackCase("melee", "@atc", masterMagic + 2)
    await attackCase("melee", "@atc + 2", masterMagic + 4)
    await attackCase("melee", "@combat.melee.value", masterMagic + 2)
    await attackCase("ranged", "@atd", masterMagic - 2)
    await attackCase("magic", "0", masterMagic)
    await attackCase("magic", "@atm", 5 + masterMagic)

    // Ouvrir le vrai dialogue, changer le dé, puis lancer le jet.
    const pendingRolls = originalPrompt.call(COAttackRoll, dialog, { withDialog: true })
    let formulaInput
    for (let attempt = 0; attempt < 100; attempt++) {
      formulaInput = document.querySelector('.attack-roll input[name="formulaAttack"]')
      if (formulaInput) break
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    equal(formulaInput?.value, `1d20 + ${5 + masterMagic}`, "le dialogue rendu affiche le score effectif")
    const dialogElement = formulaInput.closest(".application")
    const bonusDie = dialogElement.querySelector('input[name="dice"][value="bonus"]')
    bonusDie.checked = true
    bonusDie.dispatchEvent(new Event("change", { bubbles: true }))
    equal(formulaInput.value, `2d20kh+${5 + masterMagic}`, "changer le dé conserve le score")
    dialogElement.querySelector('button[data-action="ok"]').click()
    const rolls = await pendingRolls
    equal(rolls[0].total - rolls[0].dice[0].total, 5 + masterMagic, "le jet réel reçoit le score une fois")

    await companion.sheet.render(true)
    const rendered = companion.sheet.element.querySelector(".attack-button")
    equal(rendered?.textContent.includes(`+${5 + masterMagic}`), true, "le bouton rendu affiche la valeur effective")
    await companion.sheet.close()

    await companion.update({ "system.abilities.agi.formula": "0" })
    equal(companion.system.abilities.agi.value, 0, "un zéro saisi est conservé")
    await companion.update({ "system.abilities.agi.formula": "" })
    equal(companion.system.abilities.agi.value, 3, "vider la formule restaure la base")
    await companion.update({ "system.abilities.agi.formula": "@master.inconnu" })
    equal(companion.system.abilities.agi.value, 3, "une formule invalide conserve la base")
    equal(companion.system.companionFormulaErrors.length, 1, "une formule invalide est signalée")
    await companion.system.toggleCompanion(false)
    equal(companion.system.combat.melee.value, 3, "désactiver restaure la base et ses bonus")
    equal(companion.system.attributes.hp.max, 12, "désactiver restaure les PV de base")
    equal(companion.system.companionFormulaErrors.length, 0, "les formules désactivées sont ignorées")

    return checks
  } finally {
    COAttackRoll.prompt = originalPrompt
    for (const actor of actors.reverse()) {
      await actor.sheet.close()
      await actor.delete()
    }
  }
}

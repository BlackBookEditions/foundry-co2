/** Niveau minimal requis par rang. */
const RANK_MIN_LEVEL = Object.freeze({ 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11, 8: 13 })

/**
 * Coût d’un rang en PC.
 * @param {number} r Rang (1..8).
 * @returns {number} Coût en points de capacité.
 */
const costOf = (r) => (Number(r) <= 2 ? 1 : 2)

/** Nombre max de voies de profil “ouvertes” (rang 1). */
const OPEN_MAX_PROFILE_PATHS = 5

/** Template du message de chat pour le level up */
const CHAT_LVLUP_TEMPLATE = "systems/co/templates/chat/levelup-card.hbs"

/** Libellés et icônes pour le choix de PC orphelin.*/
const ORPHAN_LABELS = Object.freeze({
  fortune: "CO.dialogs.orphanPointPC",
  recovery: "CO.dialogs.orphanPointDR",
  hp: "CO.dialogs.orphanPointPV",
  mp: "CO.dialogs.orphanPointPM",
})
const ORPHAN_ICONS = Object.freeze({
  fortune: "fa-solid fa-clover",
  recovery: "fa-solid fa-mug-saucer",
  hp: "fa-solid fa-heart",
  mp: "fa-solid fa-wand-magic-sparkles",
})

/**
 * Fenêtre de passage de niveau (LevelUp)
 * Compatible Foundry V13 — ApplicationV2 / DialogV2 + Handlebars namespacé.
 */
export class COLevelUpDialog extends foundry.applications.api.DialogV2 {
  static DEFAULT_OPTIONS = {
    classes: ["co", "levelup-dialog"],
    position: { width: 900, height: 660 },
    window: { contentClasses: ["levelup-content"], resizable: true },
    actions: {
      cancel: COLevelUpDialog.#onCancel,
      togglePick: COLevelUpDialog.#onTogglePick,
      toggleForget: COLevelUpDialog.#onToggleForget,
      pickOrphan: COLevelUpDialog.#onPickOrphan,
      toggleOrphan: COLevelUpDialog.#onPickOrphan,
      reset: COLevelUpDialog.#onResetAction,
      confirm: COLevelUpDialog.#onConfirmAction,
    },
  }

  /**
   * Crée la fenêtre de passage de niveau pour un acteur.
   * @param {object} [options] Options de la boîte de dialogue.
   * @param {Actor}  [options.actor] Acteur cible du passage de niveau.
   */
  constructor(options = {}) {
    super(options)
    /** @type {Actor} */
    this.actor = options.actor

    this.levelup = this.levelup || {
      picks: [],
      forgets: [],
      bonusPC: 0,
      orphan: null,
      staged: {
        prestige: null,
        profile: null,
      },
    }
  }

  /** Bouton/Action: fermer la boîte de dialogue.
   * @param {Event} event
   * @param {HTMLElement} _target
   */
  static #onCancel(event, _target) {
    event?.preventDefault?.()
    return this.close()
  }

  /**
   * Ouverture pratique depuis la feuille d’acteur.
   * @param {Actor} actor
   */
  static async show(actor) {
    const dlg = new COLevelUpDialog({
      actor,
      window: {
        title: `Passage de niveau — ${actor?.name ?? ""}`,
        contentClasses: ["levelup-content", "character-content"],
        resizable: true,
      },
      position: { width: 900, height: 660 },
      buttons: [{ action: "cancel", label: game.i18n?.localize("CO.ui.close") || "Fermer" }],
    })
    return dlg.render(true)
  }

  /**
   * Rendu HTML via Handlebars.
   * @param {object} _context
   * @param {object} _options
   * @returns {Promise<Element>}
   */
  async _renderHTML(_context, _options) {
    const actor = this.actor
    const level = Number(actor?.system?.attributes?.level ?? 1)
    const nextLevel = level + 1

    // --- État courant ---
    const pickIds = new Set(this.levelup?.picks ?? [])
    const forgetIds = new Set(this.levelup?.forgets ?? [])
    const orphanChoice = this.levelup?.orphan ?? null

    // INT détermine le quota d’oubli (1 de base, 2 si INT >= 2)
    const intVal = Number(actor?.system?.abilities?.int?.value ?? 0)
    const forgetQuota = intVal >= 2 ? 2 : 1

    // PC de base ce niveau
    const basePC = 2 + (this.levelup?.bonusPC ?? 0)

    // Éléments potentiellement “stagés” par DnD
    const stagedPrestige = this.levelup?.staged?.prestige ?? null
    const stagedProfile = this.levelup?.staged?.profile ?? null

    // Helper: normaliser subtype => 'people' | 'prestige' | ...
    const subtypeOf = (d) => {
      const s = d?.system?.subtype
      return typeof s === "string" ? s : s?.id
    }

    // Profils de l’acteur + éventuel profil déposé
    const actorProfiles = this.actor.items.filter((i) => i.type === "profile")
    const profiles = stagedProfile ? [...actorProfiles, stagedProfile] : actorProfiles
    const profilePathIds = new Map()
    for (const p of profiles) {
      const ids = new Set()
      for (const uuid of p.system?.paths ?? []) {
        const parsed = foundry.utils.parseUuid(uuid) || {}
        const id = parsed.id || uuid
        if (id) ids.add(id)
      }
      profilePathIds.set(p.id, ids)
    }

    // Rassembler initialement les voies depuis l’acteur
    let allPaths = this.actor.paths ?? []

    // Ajouter les voies du profil et prestige “stagé” (drop)
    if (stagedProfile) {
      const uuids = stagedProfile.system?.paths ?? []
      const docs = await Promise.all(uuids.map((u) => fromUuid(u)))
      allPaths = allPaths.concat(docs.filter(Boolean))
    }

    if (stagedPrestige) {
      allPaths = allPaths.concat([stagedPrestige])
    }

    // Partition des voies (people / prestige / par profil)
    const referenced = new Set()
    for (const ids of profilePathIds.values()) ids.forEach((id) => referenced.add(id))

    const peopleExplicit = allPaths.find((pa) => subtypeOf(pa) === "people") ?? null
    const peopleFallback = allPaths.find((pa) => !referenced.has(pa.id) && subtypeOf(pa) !== "prestige") ?? null
    const peoplePath = peopleExplicit ?? peopleFallback ?? null
    const prestigePath = allPaths.find((pa) => subtypeOf(pa) === "prestige") ?? null

    const profileGroups = profiles.map((p) => ({
      profile: { id: p.id, name: p.name, img: p.img, slug: p.system?.slug },
      paths: allPaths.filter((pa) => profilePathIds.get(p.id)?.has(pa.id)),
    }))

    const capsByPath = {}
    const learnedNow = new Set()

    /**
     * Résout les capacités d’une voie (UUID → Item) et alimente `capsByPath`.
     * Ajoute aussi les IDs appris actuellement dans `learnedNow`.
     * @param {Item} path Document voie (people/profil/prestige).
     * @returns {Promise<void>}
     */
    const resolvePathCaps = async (path) => {
      const raw = await Promise.all(
        (path.system?.capacities ?? []).map(async (uuid) => {
          const doc = await fromUuid(uuid)
          if (!doc) return null
          const learned = !!doc.system?.learned
          if (learned) learnedNow.add(doc.id)

          // Récupérer et nettoyer la description HTML -> texte
          const rawDesc = foundry.utils.getProperty(doc, "system.description") ?? foundry.utils.getProperty(doc, "system.description.value") ?? ""
          // Description en texte (le système stocke en clair)
          const desc = String(doc.system?.description ?? doc.system?.description?.value ?? "")

          return {
            id: doc.id,
            name: doc.name,
            img: doc.img,
            learned,
            rank: Number(doc.system?.rank ?? 0),
            desc,
            slug: doc.system?.slug ?? doc.slug ?? null,
            pathId: path.id,
            pathName: path.name,
          }
        }),
      )
      capsByPath[path.id] = raw.filter(Boolean)
    }

    // Préparer toutes les voies à résoudre
    const toPrepare = new Set()
    if (peoplePath) toPrepare.add(peoplePath)
    if (prestigePath) toPrepare.add(prestigePath)
    profileGroups.forEach((g) => g.paths.forEach((p) => toPrepare.add(p)))
    await Promise.all(Array.from(toPrepare).map(resolvePathCaps))

    // Index à plat pour retrouver coût/rang au besoin
    const flatById = {}
    Object.values(capsByPath).forEach((arr) => {
      ;(arr || []).forEach((c) => {
        flatById[c.id] = { rank: Number(c.rank), learned: !!c.learned }
      })
    })

    // Rassembler l’ensemble des pathIds de profil (tous profils confondus)
    const profilePathIdSet = new Set()
    profileGroups.forEach((g) => {
      ;(g.paths || []).forEach((p) => profilePathIdSet.add(p.id))
    })

    // PathId -> voie de profil déjà “ouverte” *prospectivement* (après oublis + picks R1)
    const isPathOpenProspective = new Map()
    for (const pid of profilePathIdSet) {
      const caps = capsByPath[pid] || []
      const hasEffective = caps.some((c) => c.learned && !forgetIds.has(c.id))
      const hasPickedR1 = caps.some((c) => Number(c.rank) === 1 && pickIds.has(c.id))
      isPathOpenProspective.set(pid, hasEffective || hasPickedR1)
    }

    // Nombre de voies de profil déjà ouvertes (prospectivement)
    const openCount = [...isPathOpenProspective.values()].filter(Boolean).length
    const openSlotsLeft = Math.max(0, OPEN_MAX_PROFILE_PATHS - openCount)

    // === Budget (doit se faire APRÈS la résolution des caps) ===
    const spent = Array.from(pickIds).reduce((n, id) => n + (flatById[id] ? costOf(flatById[id].rank) : 0), 0)
    const refunds = Array.from(forgetIds).reduce((n, id) => n + (flatById[id] ? costOf(flatById[id].rank) : 0), 0)

    // Budget avant dépense éventuelle de l’orphelin
    const remainingBeforeOrphan = Math.max(0, basePC + refunds - spent)

    // Budget visible avec orphelin (si déjà choisi)
    const orphanCost = orphanChoice ? 1 : 0
    const remaining = Math.max(0, remainingBeforeOrphan - orphanCost)

    /**
     * Calcule l’éligibilité d’apprentissage/oubli pour toutes les capacités d’une voie.
     * @param {Item}  path
     * @param {boolean} isPeople
     * @param {boolean} isProfile
     */
    const computeEligibilityForPath = (path, isPeople, isProfile) => {
      const caps = capsByPath[path.id] || []
      const byRank = new Map(caps.map((c) => [Number(c.rank), c.id]))

      const ranksInPath = caps.map((x) => Number(x.rank)).filter(Number.isFinite)
      const minRankInPath = ranksInPath.length ? Math.min(...ranksInPath) : 1

      const learnedProspective = new Set(Array.from(learnedNow).filter((id) => !forgetIds.has(id)))
      const learnedProsCaps = caps.filter((x) => learnedProspective.has(x.id))
      const topLearned = learnedProsCaps.length ? learnedProsCaps.reduce((hi, x) => (x.rank > hi.rank ? x : hi)) : null

      const res = caps.map((c) => {
        const isForgetting = forgetIds.has(c.id)
        const effectiveLearned = c.learned && !isForgetting

        // Oubliabilité
        let forgettable = false
        if (effectiveLearned && topLearned && topLearned.id === c.id) {
          forgettable = !(isPeople && Number(c.rank) === 1)
        }

        // Apprenabilité
        let canLearn = false
        let reason = null

        if (!effectiveLearned) {
          // Niveau requis
          const gateLevel = nextLevel >= (RANK_MIN_LEVEL[c.rank] ?? 99)

          // Prérequis: le rang précédent doit être appris (ou sélectionné) sauf si c’est le 1er rang de la voie
          const prevRank = Number(c.rank) - 1
          const prevOk =
            Number(c.rank) === minRankInPath
              ? true
              : (() => {
                  const prevId = byRank.get(prevRank)
                  return !!prevId && (learnedProspective.has(prevId) || pickIds.has(prevId))
                })()

          // Coût en PC
          const cost = costOf(c.rank)
          const gatePC = remaining >= cost || pickIds.has(c.id)

          // Plafond d’ouverture de nouvelles voies de profil
          let gateOpen = true
          if (isProfile && Number(c.rank) === 1) {
            const alreadyOpen = isPathOpenProspective.get(path.id) || false
            const alreadyPickedThisR1 = pickIds.has(c.id)
            gateOpen = alreadyOpen || alreadyPickedThisR1 || openSlotsLeft > 0
          }

          canLearn = gateLevel && prevOk && gatePC && gateOpen
          if (!gateLevel) reason = "level"
          else if (!prevOk) reason = "prereq"
          else if (!gatePC) reason = "pc"
          else if (!gateOpen) reason = "openlimit"
        }

        return {
          id: c.id,
          name: c.name,
          img: c.img,
          rank: Number(c.rank),
          learned: c.learned,
          effectiveLearned,
          selected: pickIds.has(c.id),
          canLearn,
          reason,
          forgettable,
          forgetting: isForgetting,
          desc: c.desc,
          slug: c.slug ?? null,
          pathId: c.pathId ?? path.id,
          pathName: c.pathName ?? path.name,
        }
      })

      capsByPath[path.id] = res
    }

    if (peoplePath) computeEligibilityForPath(peoplePath, true, false)
    if (prestigePath) computeEligibilityForPath(prestigePath, false, false)
    profileGroups.forEach((g) => g.paths.forEach((p) => computeEligibilityForPath(p, false, true)))

    // Existe-t-il au moins UNE capa apprenable dont le coût est STRICTEMENT < au budget restant ?
    const hasAffordableLearnable = Object.values(capsByPath).some((arr) => (arr || []).some((c) => c.canLearn && costOf(c.rank) < remaining))

    // Verrouillage des boutons orphelins :
    // actifs SI (aucune capa abordable) ET (il reste >=1 PC avant orphelin OU un choix est déjà sélectionné)
    const orphanEnabled = !hasAffordableLearnable && (remainingBeforeOrphan >= 1 || Boolean(orphanChoice))
    this._orphanEnabled = orphanEnabled

    const actorHasPrestige = (this.actor.paths ?? []).some((p) => subtypeOf(p) === "prestige")
    const canDropPrestige = !actorHasPrestige && !stagedPrestige
    const showProfileDrop = actorProfiles.length + (stagedProfile ? 1 : 0) < 2

    // ———————————————————————————————————————————————
    // Récapitulatif (picks, forgets, profil/voie ajoutés)
    // ———————————————————————————————————————————————

    // Index global des capacités
    const capIndex = new Map()
    for (const arr of Object.values(capsByPath)) {
      for (const c of arr) capIndex.set(c.id, c)
    }
    this._capIndex = capIndex

    const findPathIdForCap = (capId) => {
      const cap = this._capIndex.get(capId)
      if (cap?.pathId) return cap.pathId
      for (const [pid, arr] of Object.entries(capsByPath)) {
        if ((arr || []).some((x) => x.id === capId)) return pid
      }
      return null
    }

    // Construire un index pathId -> {id,name,img}
    const pathById = new Map()
    if (peoplePath) pathById.set(peoplePath.id, { id: peoplePath.id, name: peoplePath.name, img: peoplePath.img })
    if (prestigePath) pathById.set(prestigePath.id, { id: prestigePath.id, name: prestigePath.name, img: prestigePath.img })
    for (const grp of profileGroups || []) {
      for (const p of grp.paths || []) {
        pathById.set(p.id, { id: p.id, name: p.name, img: p.img })
      }
    }

    const summaryPicks = [...pickIds]
      .map((id) => {
        const cap = this._capIndex.get(id)
        if (!cap) return null
        const pid = findPathIdForCap(id)
        const pMeta = pid ? pathById.get(pid) : null
        return {
          id: cap.id,
          name: cap.name,
          img: cap.img,
          rank: cap.rank,
          pathId: pid,
          pathName: pMeta?.name ?? "",
          desc: cap.desc ?? "",
        }
      })
      .filter(Boolean)

    const summaryForgets = [...forgetIds]
      .map((id) => {
        const cap = this._capIndex.get(id)
        if (!cap) return null
        const pid = findPathIdForCap(id)
        const pMeta = pid ? pathById.get(pid) : null
        return {
          id: cap.id,
          name: cap.name,
          img: cap.img,
          rank: cap.rank,
          pathId: pid,
          pathName: pMeta?.name ?? "",
          desc: cap.desc ?? "",
        }
      })
      .filter(Boolean)

    // Normaliser les infos "profil ajouté" et "voie de prestige ajoutée"
    const summaryAddedProfile = stagedProfile ? { id: stagedProfile.id, name: stagedProfile.name, img: stagedProfile.img } : null
    const summaryAddedPrestige = stagedPrestige ? { id: stagedPrestige.id, name: stagedPrestige.name, img: stagedPrestige.img } : null

    // Capacités sélectionnées
    const selected = []
    for (const id of pickIds) {
      const c = capIndex.get(id)
      if (!c) continue
      selected.push({
        id: c.id,
        name: c.name,
        img: c.img,
        rank: c.rank,
        pathName: c.pathName,
        pathId: c.pathId,
      })
    }

    // Orphelin: labels et icônes
    const orphanSummary = orphanChoice
      ? {
          choice: orphanChoice,
          key: orphanChoice,
          label: game.i18n?.localize?.(ORPHAN_LABEL_KEYS[orphanChoice] ?? "") || ORPHAN_LABEL_KEYS[orphanChoice] || orphanChoice,
          icon: ORPHAN_ICONS[orphanChoice] ?? "fa-solid fa-circle-plus",
        }
      : null

    const summary = {
      picks: summaryPicks,
      forgets: summaryForgets,
      addedProfile: summaryAddedProfile,
      addedPrestige: summaryAddedPrestige,
      selected,
      orphan: orphanSummary,
    }

    // Mémorise le récap pour réutilisation
    this._lastSummary = summary

    // Contexte Handlebars
    const view = {
      actor,
      level,
      nextLevel,
      cssClass: "co dialog levelup",
      capacityBudgetSpent: spent + (orphanChoice ? 1 : 0),
      capacityBudgetTotal: basePC + refunds,
      forgetCount: this.levelup.forgets.length,
      forgetQuota,
      peoplePath,
      profileGroups,
      prestigePath,
      capsByPath,
      canDropPrestige,
      showProfileDrop,
      openSlotsLeft,
      orphanEnabled,
      orphanChoice,
      summary,
    }

    // Rendu Handlebars
    const htmlString = await foundry.applications.handlebars.renderTemplate("systems/co/templates/dialogs/levelup-dialog.hbs", view)

    const tpl = document.createElement("template")
    tpl.innerHTML = htmlString.trim()
    const rootEl = tpl.content.firstElementChild ?? tpl.content

    // Autoriser dragover uniquement sur les zones
    const allow = (ev) => {
      ev.preventDefault()
      ev.stopPropagation?.()
    }

    rootEl.addEventListener(
      "dragover",
      (ev) => {
        if (ev.target?.closest?.("[data-drop]")) allow(ev)
      },
      true,
    )

    // Router le drop vers la bonne zone
    rootEl.addEventListener(
      "drop",
      (ev) => {
        const zone = ev.target?.closest?.("[data-drop]")
        if (!zone) return
        allow(ev)
        const kind = zone.dataset.drop
        if (kind === "prestige") this.#onDropPrestige(ev)
        else if (kind === "profile") this.#onDropProfile(ev)
      },
      true,
    )

    return rootEl
  }

  /**
   * Active les écouteurs d’événements sur le contenu rendu.
   * @override
   * @param {HTMLElement} content Racine du contenu HTML de la fenêtre.
   */
  activateListeners(content) {
    super.activateListeners(content)
  }

  // =====================================================================
  // Handlers d’interaction
  // =====================================================================

  /**
   * Toggle d’une capacité à apprendre.
   * Annule le choix orphelin si on “récupère” des PC.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static #onTogglePick(event, target) {
    event?.preventDefault?.()
    const id = target?.dataset?.id
    if (!id) return

    const picks = new Set(this.levelup?.picks ?? [])

    if (picks.has(id)) {
      // On dé-sélectionne => on regagne des PC => annuler l’orphelin si présent
      picks.delete(id)
      this.levelup.picks = Array.from(picks)
      if (this.levelup?.orphan) this.levelup.orphan = null
      return this.render()
    }

    // Sélection
    picks.add(id)
    this.levelup.picks = Array.from(picks)
    return this.render()
  }

  /**
   * Toggle d’une capacité “à oublier” (icône crâne).
   * Respecte le quota d’oubli (1 ou 2 selon INT).
   * Annule le choix orphelin lorsqu’on gagne des PC avec un oubli.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static #onToggleForget(event, target) {
    event?.preventDefault?.()
    const id = target?.dataset?.id
    if (!id) return

    const actor = this.actor
    const intVal = Number(actor?.system?.abilities?.int?.value ?? 0)
    const quota = intVal >= 2 ? 2 : 1

    const forgets = new Set(this.levelup?.forgets ?? [])

    if (forgets.has(id)) {
      // On annule l’oubli
      forgets.delete(id)
      this.levelup.forgets = Array.from(forgets)
      return this.render()
    }

    // Ajout d’un oubli
    if (forgets.size >= quota) {
      ui.notifications?.warn?.(game.i18n?.localize?.("CO.ui.tooManyForgets") || "Trop de capacités à oublier")
      return
    }
    forgets.add(id)
    this.levelup.forgets = Array.from(forgets)

    // On (re)gagne des PC -> annuler le choix orphelin si présent
    if (this.levelup?.orphan) this.levelup.orphan = null

    return this.render()
  }

  /**
   * Sélectionne/désélectionne une option de PC orphelin.
   * @param {Event} event Évènement click/bouton.
   * @param {HTMLElement} target Bouton cliqué contenant `data-choice`.
   */
  static #onPickOrphan(event, target) {
    event?.preventDefault?.()
    const kind = target?.dataset?.choice || target?.dataset?.orphan
    if (!kind) return
    if (!this._orphanEnabled) {
      ui.notifications?.warn?.("Tu peux encore apprendre une capacité à 1 PC.")
      return
    }
    this.levelup.orphan = this.levelup?.orphan === kind ? null : kind
    this.render()
  }

  /**
   * Action bouton "Réinitialiser" : renvoie à l'état initial.
   * @param {Event} event
   * @param {HTMLElement} _target
   */
  static #onResetAction(event, _target) {
    event?.preventDefault?.()
    return this.onReset?.()
  }

  /**
   * Action bouton "Valider" : applique les changements sur l'acteur.
   * @param {Event} event
   * @param {HTMLElement} _target
   */
  static #onConfirmAction(event, _target) {
    event?.preventDefault?.()
    return this.onConfirm?.()
  }

  /**
   * Récupère le document déposé (Item) depuis l’événement de drop.
   * Supporte compendium, répertoire et UUID brut.
   * @param {DragEvent} ev
   * @returns {Promise<ClientDocument|null>}
   */
  async #getDroppedDocument(ev) {
    try {
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev)
      const uuid = data?.uuid || data?.data?.uuid
      if (uuid) return await fromUuid(uuid)
      if (data?.type === "Item" && data?.pack && data?.id) {
        return await fromUuid(`Compendium.${data.pack}.Item.${data.id}`)
      }
      if (data?.type === "Item" && data?.id) {
        return await fromUuid(`Item.${data.id}`)
      }
    } catch {}

    // Fallback: payload brut des DataTransfer
    const dt = ev.dataTransfer
    if (!dt) return null

    let raw = dt.getData("text/plain") || dt.getData("text/uri-list") || dt.getData("text")
    if (!raw) return null

    let parsed = null
    try {
      parsed = JSON.parse(raw)
    } catch {}

    let uuid = parsed?.uuid || parsed?.data?.uuid || null
    if (!uuid && parsed?.type === "Item" && parsed?.pack && parsed?.id) uuid = `Compendium.${parsed.pack}.Item.${parsed.id}`
    if (!uuid && parsed?.type === "Item" && parsed?.id) uuid = `Item.${parsed.id}`
    if (!uuid) uuid = raw.split("\n")[0]?.trim()

    if (!uuid) return null
    try {
      return await fromUuid(uuid)
    } catch {
      return null
    }
  }

  /**
   * Drop d’une voie de prestige dans la zone [data-drop="prestige"].
   * @param {DragEvent} ev
   */
  async #onDropPrestige(ev) {
    const doc = await this.#getDroppedDocument(ev)
    if (!doc || doc.documentName !== "Item") {
      ui.notifications?.warn?.("Dépose un objet valide.")
      return
    }

    // Doit être une voie (type "path")
    const isPath = doc.type === "path" || doc.type === game.system.CONST?.ITEM_TYPE?.path?.id
    if (!isPath) {
      ui.notifications?.warn?.("Dépose une voie ici.")
      return
    }

    // Doit être une voie de prestige
    const subtype = typeof doc.system?.subtype === "string" ? doc.system.subtype : doc.system?.subtype?.id
    if (subtype !== "prestige") {
      ui.notifications?.warn?.("Dépose une voie de prestige.")
      return
    }

    // Déjà présente sur l’acteur ou déjà “stagée” ?
    const hasOnActor = (this.actor.paths ?? []).some((p) => {
      const s = typeof p.system?.subtype === "string" ? p.system.subtype : p.system?.subtype?.id
      return s === "prestige"
    })
    if (hasOnActor || this.levelup?.staged?.prestige) {
      ui.notifications?.warn?.("Une voie de prestige est déjà présente.")
      return
    }

    this.levelup.staged = this.levelup.staged || {}
    this.levelup.staged.prestige = doc
    return this.render()
  }

  /**
   * Drop d’un 2e profil dans la zone [data-drop="profile"].
   * Refuse le même profil que celui déjà présent.
   * @param {DragEvent} ev
   */
  async #onDropProfile(ev) {
    const doc = await this.#getDroppedDocument(ev)
    if (!doc) return

    if (doc.type !== "profile") {
      ui.notifications?.warn?.("Dépose un profil.")
      return
    }

    // Slug du profil déposé (fallback name)
    const dropSlug = (doc.system?.slug ?? doc.slug ?? doc.name ?? "").toString().trim().toLowerCase()
    if (!dropSlug.length) {
      ui.notifications?.warn?.("Profil déposé non identifiable.")
      return
    }

    // Profils déjà présents + profil “stagé”
    const actorProfiles = this.actor.items.filter((i) => i.type === "profile")
    const staged = this.levelup?.staged?.profile ?? null

    const existingIds = [...actorProfiles.map((p) => p.id), staged?.id].filter(Boolean)
    const existingSlugs = [...actorProfiles.map((p) => p.system?.slug), staged?.system?.slug].filter(Boolean).map((s) => s.toString().trim().toLowerCase())

    // Refus si même id OU même slug
    if (existingIds.includes(doc.id) || existingSlugs.includes(dropSlug)) {
      ui.notifications?.warn?.("Ce profil est déjà présent sur le personnage.")
      return
    }

    // On “stage” le profil puis on rerend
    this.levelup.staged ??= {}
    this.levelup.staged.profile = doc
    return this.render(true)
  }

  /**
   * Remet l'UI du level-up à l'état initial (comme si on rouvrait la fenêtre).
   * Ne modifie pas l'acteur.
   */
  onReset() {
    this.levelup = {
      picks: [],
      forgets: [],
      bonusPC: 0,
      orphan: null,
      staged: { prestige: null, profile: null },
    }
    this.render(true)
  }

  /**
   *  Retourne la liste des userIds qui recevront le whisper (MJ + propriétaires de l'acteur).
   * @param {Actor} actor
   */
  #collectWhisperIds(actor) {
    const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id)
    const ownerIds = game.users.filter((u) => actor.testUserPermission?.(u, "OWNER")).map((u) => u.id)
    return Array.from(new Set([...gmIds, ...ownerIds]))
  }

  /** Construit le contexte pour le template HBS et poste le message de chat en whisper. */
  async #postChatCard() {
    const actor = this.actor
    const newLevel = Number(foundry.utils.getProperty(actor, "system.attributes.level") ?? 0)
    const oldLevel = Math.max(0, newLevel - 1)

    // Cibles du message : MJ + propriétaires du PJ
    const whisper = this.#collectWhisperIds(actor)

    const summary = this._lastSummary ?? {
      picks: [],
      forgets: [],
      addedProfile: null,
      addedPrestige: null,
      orphan: null,
    }

    // Contexte envoyé au template
    const data = {
      actorId: actor.id,
      actorName: actor.name,
      level: oldLevel,
      nextLevel: newLevel,
      summary,
    }

    // Rendu HBS
    const html = await foundry.applications.handlebars.renderTemplate(CHAT_LVLUP_TEMPLATE, data)

    // Création du message
    // Installe un hook V13 pour initialiser les tooltips sur le rendu du message
    const activateOnce = (message, htmlEl /* HTMLElement */, data) => {
      try {
        foundry.applications?.api?.TooltipManager?.activateTooltips?.(htmlEl)
      } catch (e) {
        ui?.tooltip?.activate?.(htmlEl)
      } finally {
        Hooks.off("renderChatMessageHTML", activateOnce)
      }
    }
    Hooks.on("renderChatMessageHTML", activateOnce)

    // Crée le message + whisper
    const speaker = ChatMessage.getSpeaker({ actor })
    await ChatMessage.create({ content: html, whisper, speaker })
  }

  /**
   * Tente de retrouver sur l'acteur la capacité correspondante à un "cap" (doc source) via son slug.
   * @param {Actor} actor
   * @param {Object} capObj
   * @returns {Item|null}
   */
  #findActorCapacityBySlug(actor, capObj) {
    const slug = capObj?.slug ?? capObj?.system?.slug ?? capObj?.doc?.system?.slug ?? capObj?.doc?.system?.identifier ?? null
    if (!slug) return null
    const list = actor.items.filter((i) => i.type === "capacity" && i.system?.slug === slug)
    if (list.length > 1) {
      const rk = Number(capObj?.rank ?? capObj?.doc?.system?.rank ?? 0)
      const better = list.find((i) => Number(i.system?.rank ?? 0) === rk)
      if (better) return better
    }
    return list[0] ?? null
  }

  /** Valide : applique profil/voie droppés, oublis, apprentissages, message de chat. */
  async onConfirm() {
    const actor = this.actor
    const picks = Array.from(new Set(this.levelup?.picks ?? []))
    const forgets = Array.from(new Set(this.levelup?.forgets ?? []))
    const orphan = this.levelup?.orphan ?? null

    // Éléments droppés (staged)
    const stagedProfile = this.levelup?.staged?.profile ?? null
    const stagedPrestige = this.levelup?.staged?.prestige ?? null

    if (stagedProfile) {
      try {
        await actor.addProfile(stagedProfile)
      } catch (e) {
        console.error(e)
        ui.notifications?.error?.("Impossible d'ajouter le profil (voir console).")
        return
      }
    }

    if (stagedPrestige) {
      try {
        await actor.addPath(stagedPrestige)
      } catch (e) {
        console.error(e)
        ui.notifications?.error?.("Impossible d'ajouter la voie de prestige (voir console).")
        return
      }
    }

    // Monter le personnage d’un niveau (+1)
    try {
      const currentLevel = Number(actor?.system?.attributes?.level ?? 0)
      await actor.update({ "system.attributes.level": currentLevel + 1 })
    } catch (e) {
      console.error(e)
      ui.notifications?.error?.("Impossible de monter de niveau (voir console).")
      return
    }

    // Oublis
    for (const capId of forgets) {
      try {
        await actor.toggleCapacityLearned(capId, false)
      } catch (e) {
        console.warn("Échec d'oubli pour", capId, e)
      }
    }

    // Apprentissages
    for (const capId of picks) {
      let targetId = capId
      const already = actor.items.get(capId)

      if (!already && this._capIndex?.get) {
        const capObj = this._capIndex.get(capId)
        const onActor = this.#findActorCapacityBySlug?.(actor, capObj)
        if (onActor) targetId = onActor.id
      }

      try {
        await actor.toggleCapacityLearned(targetId, true)
      } catch (e) {
        console.warn("Échec d'apprentissage pour", capId, "->", targetId, e)
      }
    }

    // PC orphelin — appliquer le gain choisi (PC/DR/PV/PM)
    if (orphan) {
      const gainMap = {
        fortune: { path: "system.resources.fortune.bonuses.effects", delta: 1 },
        recovery: { path: "system.resources.recovery.bonuses.effects", delta: 1 },
        hp: { path: "system.attributes.hp.bonuses.effects", delta: 2 },
        mp: { path: "system.resources.mana.bonuses.effects", delta: 2 },
      }

      const conf = gainMap[orphan]
      if (conf) {
        try {
          const cur = Number(foundry.utils.getProperty(actor, conf.path) ?? 0)
          await actor.update({ [conf.path]: cur + conf.delta })
        } catch (e) {
          console.error(e)
          ui.notifications?.error?.("Impossible d'appliquer le gain orphelin (voir console).")
          return
        }
      }
    }

    // Message de chat récapitulatif
    try {
      await this.#postChatCard()
    } catch (e) {
      console.warn("Échec envoi récap chat via template", e)
    }
    this.close()
  }
}

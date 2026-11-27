/**
 * Intégration du module Automated Animations (AA).
 *
 * Le système appelle lui-même l'API publique d'AA (`AutomatedAnimations.playAnimation`) au lieu de laisser son
 * gestionnaire générique lire les cartes de tchat :
 * - cartes d'attaque, de dommages seuls, de soin et de sauvegarde : une seule animation par action, avec le touché et
 *   le raté par cible ;
 * - actions sans jet (buff, débuff, protection, transformation…) et capacités sans action publiées dans le tchat ;
 * - fin des animations persistantes d'AA (entrée « aura », ou « sur le jeton » persistante) quand l'effet qui les
 *   justifie disparaît : effet temporaire d'une cible qui expire ou est supprimé, action à durée désactivée, objet
 *   supprimé.
 *
 * AA pose ses animations persistantes avec `.origin(item.uuid)` : c'est l'uuid de l'objet source, celui que co2
 * enregistre dans `source` de ses effets temporaires. Il suffit donc de `Sequencer.EffectManager.endEffects` sur cette
 * origine et sur le jeton concerné.
 */

import { SYSTEM } from "../config/system.mjs"

const AA_ID = "autoanimations"

/** Types de messages co2 animés par le système, que le gestionnaire générique d'AA ne doit plus traiter. */
const ANIMATED_MESSAGE_TYPES = new Set(["action", "heal", "save"])

/** Résolveurs qui produisent une carte de tchat : leur animation part de la carte, pas de l'activation. */
const CARD_RESOLVERS = new Set(["attack", "auto", "heal", "save"])

/** Sources des effets temporaires d'un acteur avant sa mise à jour, par uuid d'acteur. */
const previousEffectSources = new Map()

/** Objets dont une action à durée était active avant leur mise à jour, par uuid d'objet. */
const previouslyEnabledItems = new Set()

/**
 * Un module d'animation déclaré dans `SYSTEM.ANIMATION_MODULES` est-il actif ? Il transmet alors déjà les actions à
 * Automated Animations et le système s'efface.
 * @returns {boolean}
 */
function hasAnimationModule() {
  return SYSTEM.ANIMATION_MODULES.some((id) => game.modules.get(id)?.active)
}

/**
 * Branche l'intégration si Automated Animations est actif, si le réglage le permet et si aucun module d'animation de
 * `SYSTEM.ANIMATION_MODULES` ne joue déjà ce rôle de pont.
 */
export function registerAutomatedAnimations() {
  if (!game.modules.get(AA_ID)?.active) return
  if (!game.settings.get("co2", "automatedAnimations")) return
  if (hasAnimationModule()) return

  Hooks.on("AutomatedAnimations-WorkflowStart", onWorkflowStart)
  Hooks.on("createChatMessage", (message, _options, userId) => {
    if (userId !== game.user.id) return
    onChatMessage(message).catch((err) => console.error("co2 | Automated Animations", err))
  })
  Hooks.on("co2.postActivateAction", (actor, data) => {
    onActivateAction(actor, data).catch((err) => console.error("co2 | Automated Animations", err))
  })
  Hooks.on("preUpdateActor", onPreUpdateActor)
  Hooks.on("updateActor", onUpdateActor)
  Hooks.on("preUpdateItem", onPreUpdateItem)
  Hooks.on("updateItem", onUpdateItem)
  Hooks.on("deleteItem", onDeleteItem)
}

/**
 * Automated Animations est-il actif, prêt, et l'intégration branchée ?
 * @returns {boolean}
 */
function isEnabled() {
  return (
    !!game.modules.get(AA_ID)?.active &&
    !hasAnimationModule() &&
    game.settings.get("co2", "automatedAnimations") &&
    typeof globalThis.AutomatedAnimations?.playAnimation === "function"
  )
}

/**
 * Lance l'animation d'un objet.
 * @param {Token} source Jeton qui agit
 * @param {Item} item Objet utilisé
 * @param {Token[]} targets Jetons visés
 * @param {object} [options]
 * @param {Token[]} [options.hitTargets] Jetons touchés ; toutes les cibles si absent
 * @param {string} [options.actionName] Libellé de l'action
 * @param {string} [options.actionType] Type de l'action (melee, ranged, magical, spell)
 */
async function play(source, item, targets, { hitTargets = targets, actionName, actionType } = {}) {
  if (!source || !item || !canvas.ready || !isEnabled()) return
  const extraNames = extraNamesOf(item, actionName, actionType)
  try {
    await globalThis.AutomatedAnimations.playAnimation(source, item, { targets, hitTargets, playOnMiss: true, extraNames })
  } catch (err) {
    console.warn("co2 | Automated Animations", err)
  }
}

/**
 * Noms essayés par la reconnaissance automatique d'AA après le nom de l'objet, dans cet ordre : libellé de l'action,
 * type de l'action, puis étiquettes de l'objet. AA s'arrête au premier nom qui trouve une entrée.
 *
 * Le nom de l'objet reste en tête : les libellés d'action nomment la manœuvre, pas l'objet (« Attaque simple »,
 * « Activation du sort » sont partagés par des dizaines d'objets différents) et les mettre devant fondrait tous ces
 * objets sur une seule animation. Derrière, ils permettent une animation par action d'une capacité qui en a plusieurs,
 * tant que le nom de l'objet n'a pas d'entrée, et le type d'action sert de filet (une entrée « melee » pour toutes les
 * armes de contact).
 * @param {Item} item
 * @param {string} [actionName]
 * @param {string} [actionType]
 * @returns {string[]}
 */
function extraNamesOf(item, actionName, actionType) {
  const names = [actionName, actionType, ...(item.system?.tags ?? [])]
  return [...new Set(names.filter((n) => typeof n === "string" && n.trim()))]
}

/**
 * Arrête les animations persistantes posées par un objet sur les jetons d'un acteur.
 * @param {Actor} actor Acteur qui porte les animations
 * @param {string} origin Uuid de l'objet source
 */
function endPersistentAnimations(actor, origin) {
  if (!origin || !canvas.ready || !globalThis.Sequencer?.EffectManager) return
  for (const token of actorTokens(actor)) {
    Sequencer.EffectManager.endEffects({ origin, object: token })
  }
}

/**
 * Jetons d'un acteur sur la scène affichée.
 * @param {Actor} actor
 * @returns {Token[]}
 */
function actorTokens(actor) {
  if (!actor) return []
  if (actor.token) return actor.token.object ? [actor.token.object] : []
  return actor.getActiveTokens(false, false)
}

/**
 * Jeton d'un acteur désigné par son uuid (co2 enregistre les cibles comme des uuid d'acteurs).
 * @param {string} uuid
 * @returns {Token|null}
 */
function tokenFromActorUuid(uuid) {
  let actor = null
  try {
    actor = fromUuidSync(uuid)
  } catch {
    return null
  }
  return actorTokens(actor)[0] ?? null
}

/**
 * Jeton de celui qui parle dans un message.
 * @param {ChatMessage} message
 * @returns {Token|null}
 */
function speakerToken(message) {
  const { scene, token, actor } = message.speaker ?? {}
  if (token && scene === canvas.scene?.id) {
    const placed = canvas.tokens.get(token)
    if (placed) return placed
  }
  return actorTokens(game.actors.get(actor))[0] ?? null
}

/**
 * Le gestionnaire générique d'AA lit `data-item-uuid` sur les cartes co2, sans le touché ni le raté : on l'arrête,
 * le système appelle AA lui-même. Nos propres appels ne passent pas de `workflow` et ne sont donc pas concernés.
 * @param {object} data Données du flux d'AA
 */
function onWorkflowStart(data) {
  const message = data?.workflow
  if (message instanceof ChatMessage && ANIMATED_MESSAGE_TYPES.has(message.type)) data.stopWorkflow = true
}

/**
 * Uuid de l'objet d'une carte : options du jet (attaque, dommages), objet du soin, ou attribut du gabarit
 * (sauvegarde). Les cartes de dommages liées à une attaque n'en portent volontairement pas : l'action est animée une
 * seule fois, depuis la carte d'attaque.
 * @param {ChatMessage} message
 * @returns {string|null}
 */
function itemUuidOf(message) {
  if (message.type === "heal") return message.system?.item ?? null
  const fromRoll = message.rolls?.[0]?.options?.itemUuid
  if (fromRoll) return fromRoll
  if (message.type === "save") return /data-item-uuid="([^"]+)"/.exec(message.content ?? "")?.[1] ?? null
  return null
}

/**
 * Anime les cartes d'attaque, de dommages seuls, de soin et de sauvegarde.
 * @param {ChatMessage} message
 */
async function onChatMessage(message) {
  if (!isEnabled() || !canvas.ready) return
  if (!ANIMATED_MESSAGE_TYPES.has(message.type)) return

  const uuid = itemUuidOf(message)
  if (!uuid) return
  const item = await fromUuid(uuid)
  if (!item) return
  const source = speakerToken(message)
  if (!source) return

  const system = message.system ?? {}
  let targets = (system.targets ?? []).map(tokenFromActorUuid).filter((t) => t)
  // Soin sur soi : l'animation se joue sur le soigneur
  if (message.type === "heal" && !targets.length) targets = [source]
  if (!targets.length) targets = Array.from(game.user.targets)

  // Touché et raté par cible : seulement sur une carte d'attaque. Les dommages seuls construisent des résultats de cible
  // aux drapeaux tous faux, qui marqueraient toutes les cibles comme ratées.
  const rollOptions = message.rolls?.[0]?.options ?? {}
  // Le soin n'a pas d'options de jet utiles : son libellé mêle celui de l'objet et de l'action, on s'en tient au nom
  // de l'objet et à ses étiquettes
  const actionName = rollOptions.actionName
  let hitTargets = targets
  if (message.type === "action" && system.subtype === "attack") {
    if (system.targetResults?.length) {
      hitTargets = system.targetResults
        .filter((r) => r.isSuccess || r.isCritical || r.needsOppositeRoll)
        .map((r) => tokenFromActorUuid(r.uuid))
        .filter((t) => t)
    } else if (system.result && !system.result.isSuccess) {
      // Pas de résultat par cible : le résultat global du jet vaut pour toutes les cibles
      hitTargets = []
    }
  }

  await play(source, item, targets, { hitTargets, actionName, actionType: rollOptions.actionType })
}

/**
 * Anime une action activée sans jet d'attaque, de soin ni de sauvegarde (buff, débuff, protection…).
 * @param {Actor} actor Acteur qui agit
 * @param {object} data Données du crochet co2.postActivateAction
 */
async function onActivateAction(actor, { item, indice, state, success } = {}) {
  if (!state || !success || !item || !isEnabled()) return
  const action = item.system?.actions?.[indice]
  if (!action) return
  const resolvers = Object.values(action.resolvers ?? {})
  if (resolvers.some((r) => CARD_RESOLVERS.has(r.type))) return
  // Les objets sans résolveur (une arme qu'on équipe…) ne s'animent pas
  if (item.type === "equipment" && !resolvers.length) return

  const source = actorTokens(actor)[0]
  if (!source) return
  const onSelf = resolvers.some((r) => r.target?.type === "self")
  const others = Array.from(game.user.targets).filter((t) => t.id !== source.id)
  const targets = onSelf || !others.length ? [source] : others
  await play(source, item, targets, { actionName: action.label, actionType: action.type })
}

/**
 * Anime une capacité sans action publiée dans le tchat : c'est sa seule façon d'être « utilisée » (Brouillard,
 * Résurrection…).
 * @param {Actor} actor Acteur qui publie la capacité
 * @param {Item} item Capacité publiée
 */
export async function playItemCardAnimation(actor, item) {
  if (!isEnabled() || item?.type !== "capacity" || item.system?.actions?.length) return
  const source = actorTokens(actor)[0]
  if (!source) return
  const others = Array.from(game.user.targets).filter((t) => t.id !== source.id)
  await play(source, item, others.length ? others : [source])
}

/**
 * La mise à jour touche-t-elle ce champ (données développées ou clé à points) ?
 * @param {object} changes
 * @param {string} path
 * @returns {boolean}
 */
function touches(changes, path) {
  return path in changes || foundry.utils.hasProperty(changes, path)
}

/**
 * Note les sources des effets temporaires avant une mise à jour qui les touche.
 * @param {Actor} actor
 * @param {object} changes
 */
function onPreUpdateActor(actor, changes) {
  if (!touches(changes, "system.currentEffects")) return
  previousEffectSources.set(actor.uuid, new Set((actor.system.currentEffects ?? []).map((e) => e.source).filter((s) => s)))
}

/**
 * Arrête les animations des effets temporaires disparus (expiration, suppression, fin du combat).
 * @param {Actor} actor
 * @param {object} changes
 * @param {object} _options
 * @param {string} userId
 */
function onUpdateActor(actor, changes, _options, userId) {
  if (userId !== game.user.id) return
  const before = previousEffectSources.get(actor.uuid)
  if (!before) return
  previousEffectSources.delete(actor.uuid)
  const after = new Set((actor.system.currentEffects ?? []).map((e) => e.source))
  for (const source of before) {
    if (!after.has(source)) endPersistentAnimations(actor, source)
  }
}

/**
 * Une action à durée de l'objet est-elle active ?
 * @param {Item} item
 * @returns {boolean}
 */
function hasEnabledTemporaryAction(item) {
  return (item.system?.actions ?? []).some((a) => a.properties?.temporary && a.properties?.enabled)
}

/**
 * Note si une action à durée de l'objet était active avant une mise à jour de ses actions.
 * @param {Item} item
 * @param {object} changes
 */
function onPreUpdateItem(item, changes) {
  if (!item.actor || !touches(changes, "system.actions")) return
  if (hasEnabledTemporaryAction(item)) previouslyEnabledItems.add(item.uuid)
}

/**
 * Arrête les animations d'un objet dont plus aucune action à durée n'est active (désactivation, déséquipement…).
 * @param {Item} item
 * @param {object} _changes
 * @param {object} _options
 * @param {string} userId
 */
function onUpdateItem(item, _changes, _options, userId) {
  if (userId !== game.user.id || !previouslyEnabledItems.has(item.uuid)) return
  previouslyEnabledItems.delete(item.uuid)
  if (!hasEnabledTemporaryAction(item)) endPersistentAnimations(item.actor, item.uuid)
}

/**
 * Arrête les animations d'un objet supprimé de l'acteur.
 * @param {Item} item
 * @param {object} _options
 * @param {string} userId
 */
function onDeleteItem(item, _options, userId) {
  if (userId !== game.user.id || !item.actor || !isEnabled()) return
  endPersistentAnimations(item.actor, item.uuid)
}

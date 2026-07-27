import Utils from "../helpers/utils.mjs"

const { HandlebarsApplicationMixin } = foundry.applications.api

/**
 * @typedef {object} ReleaseNoteEntry
 * @property {string} version Le numéro de version, tel qu'écrit dans le titre de niveau 1
 * @property {string} markdown Le corps de l'entrée, en Markdown
 */

/**
 * Fenêtre des notes de version.
 *
 * Le contenu vient de release-notes.md, à la racine du système : un titre de niveau 1 par version
 * (`# 2.4.0`), suivi du texte libre de l'entrée. La fenêtre s'ouvre d'elle-même au MJ, au chargement
 * du monde, quand des entrées sont plus récentes que celle qu'il a marquée comme lue.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export default class COReleaseNotes extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  /**
   * Construit la fenêtre pour un jeu d'entrées déjà filtré.
   * @param {object} [options={}]
   * @param {ReleaseNoteEntry[]} [options.entries=[]] Les entrées à afficher, de la plus récente à la plus ancienne
   */
  constructor({ entries = [], ...options } = {}) {
    super(options)
    this.entries = entries
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "co-release-notes",
    classes: ["co", "release-notes"],
    position: { width: 640, height: 720 },
    window: {
      title: "CO.releaseNotes.title",
      icon: "fa-solid fa-scroll",
      resizable: true,
    },
  }

  /** @override */
  static PARTS = {
    content: {
      template: "systems/co2/templates/release-notes.hbs",
      root: true,
      scrollable: [".release-notes-body"],
    },
  }

  /**
   * Le chemin du fichier source des notes de version.
   * @type {string}
   */
  static SOURCE = "systems/co2/release-notes.md"

  /**
   * La version couverte par les entrées affichées, mémorisée quand le MJ coche « ne plus afficher ».
   * @returns {string}
   */
  get latestVersion() {
    return this.entries.reduce((latest, entry) => (foundry.utils.isNewerVersion(entry.version, latest) ? entry.version : latest), "0.0.0")
  }

  /**
   * Charge et découpe le fichier des notes de version.
   * Un fichier absent ou illisible n'est jamais bloquant : on renonce simplement à afficher la fenêtre.
   * @returns {Promise<ReleaseNoteEntry[]>}
   */
  static async loadEntries() {
    let markdown
    try {
      const response = await fetch(this.SOURCE)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      markdown = await response.text()
    } catch (error) {
      console.warn(Utils.log(`Notes de version indisponibles (${this.SOURCE}) : ${error.message}`))
      return []
    }

    const entries = []
    let current = null
    for (const line of markdown.split(/\r?\n/)) {
      const heading = line.match(/^#\s+(.+?)\s*$/)
      if (heading) {
        current = { version: heading[1], lines: [] }
        entries.push(current)
      } else current?.lines.push(line)
    }
    return entries.map((entry) => ({ version: entry.version, markdown: entry.lines.join("\n").trim() }))
  }

  /**
   * Ouvre la fenêtre au MJ si des notes de version n'ont pas encore été lues.
   * Appelée au hook ready.
   *
   * Le tri se fait sur les seules entrées du fichier, sans consulter game.system.version : le fichier
   * est empaqueté avec le système, il ne peut donc pas annoncer une version qui ne serait pas installée.
   * @returns {Promise<COReleaseNotes|void>}
   */
  static async displayIfNeeded() {
    if (!game.user.isGM) return
    const entries = await this.loadEntries()
    if (!entries.length) return

    const seen = game.settings.get("co2", "lastReleaseNotesSeen")

    // Tant que la case n'a jamais été cochée, on montre tout l'historique ; une fois cochée, seules
    // les versions publiées depuis apparaîtront.
    const unseen = seen ? entries.filter((entry) => foundry.utils.isNewerVersion(entry.version, seen)) : entries

    if (!unseen.length) return
    return new this({ entries: unseen }).render({ force: true })
  }

  /**
   * Ouvre la fenêtre avec l'historique complet, à la demande (menu de la barre latérale).
   * @returns {Promise<COReleaseNotes>}
   */
  static async displayAll() {
    const entries = await this.loadEntries()
    return new this({ entries }).render({ force: true })
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)

    // Showdown est fourni par le client Foundry, qui s'en sert déjà pour les pages de journal en Markdown.
    // Absent, on se rabat sur le texte brut plutôt que de casser l'affichage.
    const converter = window.showdown ? new window.showdown.Converter(CONST.SHOWDOWN_OPTIONS) : null
    const toHtml = (markdown) => (converter ? converter.makeHtml(markdown) : `<pre>${foundry.utils.escapeHTML(markdown)}</pre>`)

    return Object.assign(context, {
      version: this.latestVersion,
      entries: this.entries.map((entry) => ({
        version: entry.version,
        html: toHtml(entry.markdown),
      })),
      dontShowAgain: game.settings.get("co2", "lastReleaseNotesSeen") === this.latestVersion,
    })
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options)
    // Le réglage est écrit dès le clic plutôt qu'à la fermeture : le choix est conservé même si la
    // fenêtre est fermée avec Échap ou si la page est rechargée.
    this.element.querySelector("input[name='dontShowAgain']")?.addEventListener("change", (event) => {
      game.settings.set("co2", "lastReleaseNotesSeen", event.currentTarget.checked ? this.latestVersion : "")
    })
  }
}

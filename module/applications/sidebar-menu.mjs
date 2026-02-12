const { HandlebarsApplicationMixin } = foundry.applications.api
const { AbstractSidebarTab } = foundry.applications.sidebar

export default class COSidebarMenu extends HandlebarsApplicationMixin(AbstractSidebarTab) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    window: {
      title: "CO.Sidebar.title",
    },
    actions: {
      openApp: COSidebarMenu.#onOpenApp,
    },
  }

  /** @override */
  static tabName = "co"

  /** @override */
  static PARTS = {
    co: {
      template: "systems/co2/templates/sidebar-menu.hbs",
      root: true, // Permet d'avoir plusieurs sections dans le hbs
    },
  }

  static async #onOpenApp(event) {
    switch (event.target.dataset.app) {
      case "gmmanager":
        if (!foundry.applications.instances.has("cthack-application-manager")) game.system.applicationManager.render({ force: true })
        break
      case "search":
        await new SearchDialog().render(true)
        break
      case "party":
        game.system.partySheet.render(true)
        break
    }
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    return Object.assign(context, {
      version: `Version ${game.system.version}`,
    })
  }
}

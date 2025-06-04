/**
 * Adds functionality to a custom HTML element for caching its stylesheet and adopting it into its Shadow DOM, rather
 * than having each stylesheet duplicated per element.
 * @param {typeof HTMLElement} Base  The base class being mixed.
 * @returns {typeof AdoptedStylesheetElement}
 */
export default function AdoptedStylesheetMixin(Base) {
    return class AdoptedStylesheetElement extends Base {

        /**
         * A map of cached stylesheets per Document root.
         * @type {WeakMap<WeakKey<Document>, CSSStyleSheet>}
         * @protected
         */
        static _stylesheets = new WeakMap()

        /**
         * The CSS content for this element.
         * @type {string}
         */
        static CSS = ""

        /** @inheritdoc */
        adoptedCallback() {
            const sheet = this._getStylesheet()
            if (sheet) this._adoptStylesheet(this._getStylesheet())
        }

        /**
         * Retrieves the cached stylesheet, or generates a new one.
         * @returns {CSSStylesheet}
         * @protected
         */
        _getStylesheet() {
            let sheet = this.constructor._stylesheets.get(this.ownerDocument)
            if (!sheet && this.ownerDocument.defaultView) {
                sheet = new this.ownerDocument.defaultView.CSSStyleSheet()
                sheet.replaceSync(this.constructor.CSS)
                this.constructor._stylesheets.set(this.ownerDocument, sheet)
            }
            return sheet
        }

        /**
         * Adopt the stylesheet into the Shadow DOM.
         * @param {CSSStylesheet} sheet  The sheet to adopt.
         * @abstract
         */
        _adoptStylesheet(sheet) { }
    }
}

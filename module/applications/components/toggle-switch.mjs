import CheckboxElement from "./checkbox.mjs"

/**
 * A custom HTML element that represents a checkbox-like input that is displayed as a slide toggle.
 * @fires change
 */
export default class ToggleSwitchElement extends CheckboxElement {

    /** @override */
    static tagName = "co-toggle-switch"

    /** @override */
    static useShadowRoot = false

    /** @inheritDoc */
    constructor() {
        super()
        this._internals.role = "switch"
    }

    /**
     * Activate the element when it is attached to the DOM.
     * @inheritDoc
     */
    connectedCallback() {
        this.replaceChildren(...this._buildElements())
        this._refresh()
        this._activateListeners()
    }

    /**
     * Create the constituent components of this element.
     * @returns {HTMLElement[]}
     * @protected
     */
    _buildElements() {
        const track = document.createElement("div")
        track.classList.add("track")
        const thumb = document.createElement("div")
        thumb.classList.add("thumb")
        track.append(thumb)
        return [track]
    }
}
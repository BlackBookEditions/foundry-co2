import AdoptedStylesheetMixin from "./adopted-stylesheet-mixin.mjs"
import CheckboxElement from "./checkbox.mjs"
import ToggleSwitchElement from "./toggle-switch.mjs"

window.customElements.define(AbilitiesElement.tagName, AbilitiesElement)
window.customElements.define(AbilityElement.tagName, AbilityElement)
window.customElements.define(CheckboxElement.tagName, CheckboxElement)
window.customElements.define(ToggleSwitchElement.tagName, ToggleSwitchElement)

export {
    AdoptedStylesheetMixin as AdoptedStylesheetElementMixin,
    CheckboxElement,
    ToggleSwitchElement
}
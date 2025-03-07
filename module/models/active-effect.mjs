export class COActiveEffectConfig extends ActiveEffectConfig {

    get template() {
        return "systems/co/templates/effects/active-effect.hbs";
    }

    async getData(options = {}) {
        let context = await super.getData(options);
        context.config = COF;

        let lockDuringPause = game.settings.get("co", "lockDuringPause") && game.paused;
        options.editable &= (game.user.isGM || !lockDuringPause);

        let targetType = this.object.getFlag("co", "targetType");

        if (!targetType) {
            this.object.setFlag("co", "targetType", "SelectEffectTarget");
            targetType = "SelectEffectTarget";
        }

        context.targetType = targetType;

        return context;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find(".changeEffectTarget").click(this._onChangeffectTarget.bind(this));
    }

    _onChangeffectTarget(event) {
        event.preventDefault();

        let targetType = this.object.getFlag("co", "targetType");
        if (targetType === "SelectEffectTarget") {
            this.object.setFlag("co", "targetType", "InputEffectTarget");
        } else this.object.setFlag("co", "targetType", "SelectEffectTarget");

    }

}
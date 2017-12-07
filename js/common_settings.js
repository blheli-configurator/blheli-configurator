'use strict';

var CommonSettings = React.createClass({
    displayName: "CommonSettings",

    render: function render() {
        return React.createElement(
            "div",
            { className: "gui_box grey" },
            React.createElement(
                "div",
                { className: "gui_box_titlebar" },
                React.createElement(
                    "div",
                    { className: "spacer_box_title" },
                    "Common Parameters"
                )
            ),
            React.createElement(
                "div",
                { className: "spacer_box" },
                this.renderControls()
            )
        );
    },
    handleChange: function handleChange(name, value) {
        // @todo probably shouldn't alter props like this
        var escSettings = this.props.escSettings;
        escSettings.forEach(function (settings) {
            return settings[name] = value;
        });
        this.props.onUserInput(escSettings);
    },
    renderControls: function renderControls() {
        var _this = this;

        // filter escSettings to sieve unavailable ones
        var availableSettings = this.props.escSettings.filter(function (i, idx) {
            return _this.props.escMetainfo[idx].available;
        });

        // ensure all ESCs have supported firmware version
        for (var i = 0; i < availableSettings.length; ++i) {
            var _layoutRevision = availableSettings[i].LAYOUT_REVISION.toString();

            if (!(_layoutRevision in BLHELI_SETTINGS_DESCRIPTIONS)) {
                return React.createElement(
                    "h3",
                    null,
                    "Version ",
                    availableSettings[i].MAIN_REVISION + '.' + availableSettings[i].SUB_REVISION,
                    " is unsupported"
                );
            }
        }

        // ensure all ESCs are MULTI
        var allMulti = availableSettings.every(function (settings) {
            return settings.MODE === BLHELI_MODES.MULTI;
        });
        if (!allMulti) {
            return React.createElement(
                "h3",
                null,
                "Only MULTI mode currently supported"
            );
        }

        // @todo ensure valid MODE

        var masterSettings = availableSettings[0],
            layoutRevision = masterSettings.LAYOUT_REVISION,
            revision = masterSettings.MAIN_REVISION + '.' + masterSettings.SUB_REVISION,
            mode = blheliModeToString(masterSettings.MODE);

        // find specific UI overrides for this version
        var overrides = BLHELI_SETTINGS_DESCRIPTIONS[layoutRevision][mode].overrides;
        if (overrides) {
            overrides = overrides[revision];
        }

        return BLHELI_SETTINGS_DESCRIPTIONS[layoutRevision][mode].base.map(function (setting) {
            // @todo move elsewhere
            if (setting.visibleIf && !setting.visibleIf(masterSettings)) {
                return null;
            }

            var notInSync = availableSettings.reduce(function (x, y) {
                return x[setting.name] === y[setting.name] ? x : -1;
            }) === -1,
                override = overrides ? overrides.find(function (override) {
                return override.name === setting.name;
            }) : null;

            return _this.renderSetting(masterSettings, notInSync, override ? override : setting);
        });
    },
    renderSetting: function renderSetting(settings, notInSync, desc) {
        switch (desc.type) {
            case 'bool':
                {
                    return React.createElement(Checkbox, {
                        name: desc.name,
                        value: settings[desc.name],
                        label: desc.label,
                        notInSync: notInSync,
                        onChange: this.handleChange
                    });
                }
            case 'enum':
                {
                    // @todo redesign
                    // Remove DampedLight option for ESCs that do not support it
                    var options = desc.options;
                    if (desc.name === 'PWM_FREQUENCY') {
                        var layout = settings.LAYOUT;
                        if (this.props.supportedESCs.layouts.SiLabs.hasOwnProperty(layout) && !this.props.supportedESCs.layouts.SiLabs[layout].damped_enabled || this.props.supportedESCs.layouts.Atmel.hasOwnProperty(layout) && !this.props.supportedESCs.layouts.Atmel[layout].damped_enabled) {
                            options = options.slice(0, -1);
                        }
                    }
                    return React.createElement(Select, {
                        name: desc.name,
                        value: settings[desc.name],
                        options: options,
                        label: desc.label,
                        notInSync: notInSync,
                        onChange: this.handleChange
                    });
                }
            case 'number':
                {
                    return React.createElement(Number, {
                        name: desc.name,
                        step: desc.step,
                        min: desc.min,
                        max: desc.max,
                        value: settings[desc.name],
                        label: desc.label,
                        notInSync: notInSync,
                        onChange: this.handleChange
                    });
                }
            default:
                throw new Error('Logic error');
        }
    }
});
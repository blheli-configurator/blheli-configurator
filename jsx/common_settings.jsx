'use strict';

var CommonSettings = React.createClass({
    render: function() {
        return (
            <div className="gui_box grey">
                <div className="gui_box_titlebar">
                    <div className="spacer_box_title">Common Parameters</div>
                </div>
                <div className="spacer_box">
                    {this.renderControls()}
                </div>
            </div>
        );
    },
    handleChange: function(name, value) {        
        // @todo probably shouldn't alter props like this
        var escSettings = this.props.escSettings;
        escSettings.forEach(settings => settings[name] = value);
        this.props.onUserInput(escSettings);
    },
    renderControls: function() {
        // notify about BLHeli_32 (no) support
        for (let i = 0; i < this.props.escMetainfo.length; ++i) {
//            if (this.props.escMetainfo[i].available && this.props.escMetainfo[i].interfaceMode == _4way_modes.ARMBLB) {
//                return (
//                    <h3>BLHeli_32 not supported (yet), thank BLHeli team</h3>
//                );
//            }
        }

		const masterMetainfo = this.props.escMetainfo.find(metainfo => metainfo.available);

        // filter escSettings to sieve unavailable ones
        const availableSettings = this.props.escSettings.filter((i, idx) => this.props.escMetainfo[idx].available);

		const masterSettings = availableSettings[0],
			settingsDescriptions = masterMetainfo.interfaceMode === _4way_modes.ARMBLB ? OPEN_ESC_SETTINGS_DESCRIPTIONS : BLHELI_SETTINGS_DESCRIPTIONS;

        // ensure all ESCs have supported firmware version
        for (let i = 0; i < availableSettings.length; ++i) {
            const layoutRevision = availableSettings[i].LAYOUT_REVISION.toString();

            if (!(layoutRevision in settingsDescriptions)) {
                return (
                    <h3>Version {availableSettings[i].MAIN_REVISION + '.' + availableSettings[i].SUB_REVISION} is unsupported</h3>
                );
            }
        }

        // ensure all ESCs are MULTI
        const allMulti = availableSettings.every(settings => !settings.MODE || settings.MODE === BLHELI_MODES.MULTI);
        if (!allMulti) {
            return (
                <h3>Only MULTI mode currently supported</h3>
            );
        }

        // @todo ensure valid MODE

        const layoutRevision = masterSettings.LAYOUT_REVISION,
              revision = masterSettings.MAIN_REVISION + '.' + masterSettings.SUB_REVISION,
			  settingsDescription = masterMetainfo.interfaceMode === _4way_modes.ARMBLB ? settingsDescriptions[layoutRevision] : settingsDescriptions[layoutRevision][blheliModeToString(masterSettings.MODE)];

        // find specific UI overrides for this version
        var overrides = settingsDescription.overrides;
        if (overrides) {
            overrides = overrides[revision];
        }

        return settingsDescription.base.map(setting => {
            // @todo move elsewhere
            if (setting.visibleIf && !setting.visibleIf(masterSettings)) {
                return null;
            }

            const notInSync = availableSettings.reduce((x, y) => x[setting.name] === y[setting.name] ? x : -1) === -1,
                  override = overrides ? overrides.find(override => override.name === setting.name) : null;

            return this.renderSetting(masterSettings, notInSync, override ? override : setting);
        });
    },
    renderSetting: function(settings, notInSync, desc) {
        switch (desc.type) {
            case 'bool': {
                return (
                    <Checkbox
                        name={desc.name}
                        value={settings[desc.name]}
                        label={desc.label}
                        notInSync={notInSync}
                        onChange={this.handleChange}
                    />
                );
            }
            case 'enum': {
                // @todo redesign
                // Remove DampedLight option for ESCs that do not support it
                var options = desc.options;
                if (desc.name === 'PWM_FREQUENCY') {
                    const layout = settings.LAYOUT;
                    if (this.props.supportedBlheliESCs.layouts.SiLabs.hasOwnProperty(layout) && !this.props.supportedBlheliESCs.layouts.SiLabs[layout].damped_enabled ||
                        this.props.supportedBlheliESCs.layouts.Atmel.hasOwnProperty(layout) && !this.props.supportedBlheliESCs.layouts.Atmel[layout].damped_enabled) {
                        options = options.slice(0, -1);
                    }
                }
                return (
                    <Select
                        name={desc.name}
                        value={settings[desc.name]}
                        options={options}
                        label={desc.label}
                        notInSync={notInSync}
                        onChange={this.handleChange}
                    />
                );
            }
            case 'number': {
                return (
                    <Number
                        name={desc.name}
                        step={desc.step}
                        min={desc.min}
                        max={desc.max}
						factor={desc.displayFactor}
						offset={desc.displayOffset}
                        value={settings[desc.name]}
                        label={desc.label}
                        notInSync={notInSync}
                        onChange={this.handleChange}
                    />
                );
            }
            default: throw new Error('Logic error');
        }
    }
});

'use strict';

var IndividualSettings = React.createClass({
    render: function() {
        return (
            <div className="gui_box grey">
                <div className="gui_box_titlebar">
                    <div className="spacer_box_title">
                        {this.getTitle()}
                    </div>
                </div>
                <div className="spacer_box">
                    {this.renderControls()}
                </div>
            </div>
        );
    },
    getTitle: function() {
        var escSettings = this.props.escSettings[this.props.escIndex],
            escMetainfo = this.props.escMetainfo[this.props.escIndex],
            layout = escSettings.LAYOUT.trim(),
            name = escSettings.NAME.trim(),
            make = layout;

        if (escMetainfo.interfaceMode === _4way_modes.SiLBLB) {
            if (layout in BLHELI_SILABS_ESCS) {
                make = BLHELI_SILABS_ESCS[layout].name
            } else if (layout in BLHELI_S_SILABS_ESCS) {
                make = BLHELI_S_SILABS_ESCS[layout].name
            }
        } else {
            if (layout in BLHELI_ATMEL_ESCS) {
                make = BLHELI_ATMEL_ESCS[layout].name
            }
        }

        return 'ESC ' + (this.props.escIndex + 1) + ': ' + make + ', ' +
            escSettings.MAIN_REVISION + '.' + escSettings.SUB_REVISION + (name.length > 0 ? ', ' + name : '');
    },
    renderControls: function() {
        const escSettings = this.props.escSettings[this.props.escIndex];
        const isSiLabs = this.props.escMetainfo[this.props.escIndex].interfaceMode === _4way_modes.SiLBLB;

        var rows = [];

        // Check that the layout revision is valid
        if (BLHELI_INDIVIDUAL_SETTINGS_DESCRIPTIONS.hasOwnProperty(escSettings.LAYOUT_REVISION)) {
            rows = BLHELI_INDIVIDUAL_SETTINGS_DESCRIPTIONS[escSettings.LAYOUT_REVISION].base.map(setting => {
                if (setting.visibleIf && !setting.visibleIf(escSettings)) {
                    return null;
                }

                return this.renderSetting(escSettings, setting);
            });
        }

        rows.push(
            <div className="half">
                <div className="default_btn half flash_btn">
                    <progress
                        className={this.props.isFlashing ? "progress" : "hidden"}
                        value={this.props.progress}
                        min="0"
                        max="100"
                    />
                    <a
                        href="#"
                        className={this.props.canFlash && isSiLabs ? "" : "disabled"}
                        onClick={this.flashFirmware}
                    >
                        {chrome.i18n.getMessage('escButtonFlash')}
                    </a>
                </div>
            </div>
        );

        return rows;
    },
    renderSetting: function(settings, desc) {
        switch (desc.type) {
            case 'bool': {
                return (
                    <Checkbox
                        name={desc.name}
                        value={settings[desc.name]}
                        label={desc.label}
                        onChange={this.handleChange}
                    />
                );
            }
            case 'enum': {
                return (
                    <Select
                        name={desc.name}
                        value={settings[desc.name]}
                        options={desc.options}
                        label={desc.label}
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
                        offset={desc.offset}
                        factor={desc.factor}
                        value={settings[desc.name]}
                        label={desc.label}
                        suffix={desc.suffix}
                        onChange={this.handleChange}
                    />
                );
            }
            default: throw new Error('Logic error');
        }
    },
    renderSelect: function(name, options, label) {
        return (
            <Select
                name={name}
                value={this.props.escSettings[this.props.escIndex][name]}
                options={options}
                label={label}
                onChange={this.handleChange}
            />
        );
    },
    renderNumber: function(name, min, max, step, label) {
        return (
            <Number
                name={name}
                step={step}
                min={min}
                max={max}
                value={this.props.escSettings[this.props.escIndex][name]}
                label={label}
                onChange={this.handleChange}
            />
        );
    },
    handleChange: function(name, value) {
        // @todo alter state correctly, do not mutate old state
        var escSettings = this.props.escSettings;
        escSettings[this.props.escIndex][name] = value;
        this.props.onUserInput(escSettings);
    },
    flashFirmware: function() {
        this.props.onFlash(this.props.escIndex);
    }
});

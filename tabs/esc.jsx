'use strict';

function compare(lhs_array, rhs_array) {
    if (lhs_array.byteLength != rhs_array.byteLength) {
        return false;
    }

    for (var i = 0; i < lhs_array.byteLength; ++i) {
        if (lhs_array[i] !== rhs_array[i]) {
            return false;
        }
    }

    return true;
}

function ascii2buf(str) {
    var view = new Uint8Array(str.length)

    for (var i = 0; i < str.length; ++i) {
        view[i] = str.charCodeAt(i)
    }

    return view;
}

function buf2ascii(buf) {
    return String.fromCharCode.apply(null, buf)
}

var Checkbox = React.createClass({
    render: function() {
        return (
            <div className="checkbox">
                <label>
                    <input
                        type="checkbox"
                        name={this.props.name}
                        checked={this.props.value === 1 ? true : false}
                        onChange={this.handleChange}
                    />
                    <span className={this.props.notInSync ? "not-in-sync" : ""}>{chrome.i18n.getMessage(this.props.label)}</span>
                </label>
            </div>
        );
    },
    handleChange: function(e) {
        this.props.onChange(e.target.name, e.target.checked ? 1 : 0);
    }
});

var Select = React.createClass({
    render: function() {
        return (
            <div className="select">
                <label>
                    <select
                        name={this.props.name}
                        value={this.props.notInSync ? -1 : this.props.value}
                        onChange={this.handleChange}
                    >
                        <option className="hidden" disabled selected value="-1" />
                        {
                            this.props.options.map(option => <option value={option.value}>{option.label}</option>)
                        }
                    </select>
                    <span className={this.props.notInSync ? "not-in-sync" : ""}>{chrome.i18n.getMessage(this.props.label)}</span>
                </label>
            </div>
        );

    },
    handleChange: function(e) {
        this.props.onChange(e.target.name, parseInt(e.target.value));
    }
});

var Number = React.createClass({
    render: function() {
        return (
            <div className="number">
                <label>
                    <input
                        type="number"
                        name={this.props.name}
                        step={this.props.step}
                        min={this.props.min}
                        max={this.props.max}
                        value={this.props.notInSync ? null : this.props.value}
                        onChange={this.handleChange}
                        onBlur={this.handleBlur}
                    />
                    <span className={this.props.notInSync ? "not-in-sync" : ""}>{chrome.i18n.getMessage(this.props.label)}</span>
                </label>
            </div>
        );
    },
    handleChange: function(e) {
        const el = e.target;
        this.props.onChange(el.name, parseInt(el.value));
    },
    handleBlur: function(e) {
        const el = e.target;
        this.props.onChange(el.name, Math.max(Math.min(parseInt(el.value), el.max), el.min));
    }
});

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
        // filter escSettings to sieve unavailable ones
        const availableSettings = this.props.escSettings.filter((i, idx) => this.props.escMetainfo[idx].available);
        if (availableSettings.length === 0) {
            return (
                <h3>Read Settings first</h3>
            );
        }

        // ensure all ESCs have supported firmware version
        for (let i = 0; i < availableSettings.length; ++i) {
            const layoutRevision = availableSettings[i].LAYOUT_REVISION.toString();

            if (!(layoutRevision in BLHELI_SETTINGS_DESCRIPTIONS)) {
                return (
                    <h3>Version {availableSettings[i].MAIN_REVISION + '.' + availableSettings[i].SUB_REVISION} is unsupported, please update</h3>
                );
            }
        }

        // ensure all ESCs are MULTI        
        const allMulti = availableSettings.every(settings => settings.MODE === BLHELI_MODES.MULTI);
        if (!allMulti) {
            return (
                <h3>Only MULTI mode currently supported, please update</h3>
            );
        }

        const masterSettings = availableSettings[0],
              layoutRevision = masterSettings.LAYOUT_REVISION,
              revision = masterSettings.MAIN_REVISION + '.' + masterSettings.SUB_REVISION;

        return BLHELI_SETTINGS_DESCRIPTIONS[layoutRevision].MULTI.base.map(setting => {
            // @todo move elsewhere
            if (setting.visibleIf && !setting.visibleIf(masterSettings)) {
                return null;
            }

            const notInSync = availableSettings.reduce((x, y) => x[setting.name] === y[setting.name] ? x : -1) === -1,
                  overrides = BLHELI_SETTINGS_DESCRIPTIONS[layoutRevision].MULTI.overrides[revision],
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
                return (
                    <Select
                        name={desc.name}
                        value={settings[desc.name]}
                        options={desc.options}
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

var IndividualSettings = React.createClass({
    getInitialState: function() {
        return {
            canFlash: true,
            isFlashing: false,
            progress: 0
        };
    },
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

        var rows = BLHELI_INDIVIDUAL_SETTINGS_DESCRIPTIONS[escSettings.LAYOUT_REVISION].base.map(setting => {
            if (setting.visibleIf && !setting.visibleIf(escSettings)) {
                return null;
            }

            return this.renderSetting(escSettings, setting);
        });

        rows.push(
            <div className="half">
                <div className="default_btn half flash_btn">
                    <progress
                        className={this.state.isFlashing || this.props.isFlashing ? "progress" : "hidden"}
                        value={this.state.isFlashing ? this.state.progress : this.props.progress}
                        min="0"
                        max="100"
                    />
                    <a
                        href="#"
                        className={this.props.canFlash && this.state.canFlash ? "" : "disabled"}
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
                        value={settings[desc.name]}
                        label={desc.label}
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
        var escSettings = this.props.escSettings;
        escSettings[this.props.escIndex][name] = value;
        this.props.onUserInput(escSettings);
    },
    flashFirmware: function() {
        // Disallow clicking again
        this.setState({ canFlash: false });

        this.props.flashFirmware(this.props.escIndex,
            () => this.setState({ isFlashing: true }),
            progress => this.setState({ progress: progress }),
            () => this.setState(this.getInitialState())
        );
    }
});

var Configurator = React.createClass({
    getInitialState: () => {
        return {
            canRead: true,
            canWrite: false,
            canFlash: false,
            isFlashing: false,

            escSettings: [],
            escMetainfo: [],

            ignoreMCULayout: false,

            flashingEscIndex: undefined,
            flashingEscProgress: 0
        };
    },
    componentDidMount: function() {

    },
    onUserInput: function(newSettings) {
        this.setState({
            escSettings: newSettings
        });
    },
    readSetup: async function() {
        GUI.log('reading ESC setup');
        $('a.connect').addClass('disabled');

        // disallow further requests until we're finished
        // @todo also disable settings alteration
        this.setState({
            canRead: false,
            canWrite: false,
            canFlash: false
        });

        await this.readSetupImpl();

        // Enable `Flash All` if all ESCs are identical
        const availableSettings = this.state.escSettings.filter((i, idx) => this.state.escMetainfo[idx].available);
        const canFlash = availableSettings.every(settings => settings.MCU === availableSettings[0].MCU);

        this.setState({
            canRead: true,
            canWrite: availableSettings.length > 0,
            canFlash: availableSettings.length > 0 && canFlash
        });

        $('a.connect').removeClass('disabled');
        GUI.log('ESC setup read');   
    },
    readSetupImpl: async function() {
        var escSettings = [],
            escMetainfo = [];

        for (let esc = 0; esc < this.props.escCount; ++esc) {
            escSettings.push({});
            escMetainfo.push({});

            try {
                // Ask 4way interface to initialize target ESC for flashing
                const message = await _4way.initFlash(esc);

                // Check interface mode and read settings
                const interfaceMode = message.params[3]

                // remember interface mode for ESC
                escMetainfo[esc].interfaceMode = interfaceMode

                // read everything in one big chunk
                // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
                var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interfaceMode),
                    settingsArray = null;

                if (isSiLabs) {
                    settingsArray = (await _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)).params;
                } else {
                    settingsArray = (await _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)).params;
                }

                const settings = blheliSettingsObject(settingsArray);

                // Ensure MULTI mode and correct BLHeli version
                // Check whether revision is supported
                if (settings.LAYOUT_REVISION < BLHELI_MIN_SUPPORTED_LAYOUT_REVISION) {
                    GUI.log('ESC ' + (esc + 1) + ' has LAYOUT_REVISION ' + layout_revision + ', oldest supported is ' + BLHELI_MIN_SUPPORTED_LAYOUT_REVISION)
                }

                // Check for MULTI mode
                if (settings.MODE != BLHELI_MODES.MULTI) {
                    GUI.log('ESC ' + (esc + 1) + ' has MODE different from MULTI: ' + settings.MODE.toString(0x10))
                }

                escSettings[esc] = settings;
                escMetainfo[esc].available = true;

                if (isSiLabs) {
                    await _4way.reset(esc);
                }
            } catch (error) {
                console.log('ESC', esc + 1, 'read settings failed', error);
                escMetainfo[esc].available = false;
            }
        }

        // Update backend and trigger representation
        this.setState({
            escSettings: escSettings,
            escMetainfo: escMetainfo
        });
    },
    // @todo add validation of each setting via BLHELI_SETTINGS_DESCRIPTION
    writeSetupImpl: async function() {
        for (let esc = 0; esc < this.state.escSettings.length; ++esc) {
            try {
                if (!this.state.escMetainfo[esc].available) {
                   continue;
                }

                // Ask 4way interface to initialize target ESC for flashing
                const message = await _4way.initFlash(esc);
                // Remember interface mode and read settings
                var interfaceMode = message.params[3]

                // remember interface mode for ESC
                // this.setState(state => {
                //     state.escMetainfo[esc].interfaceMode = interfaceMode;
                //     return state;
                // })

                // read everything in one big chunk to check if any settings have changed
                // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
                var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interfaceMode),
                    readbackSettings = null;

                if (isSiLabs) {
                    readbackSettings = (await _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)).params;
                } else {
                    readbackSettings = (await _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)).params;
                }

                // Check for changes and perform write
                var escSettings = blheliSettingsArray(this.state.escSettings[esc]);

                // check for unexpected size mismatch
                if (escSettings.byteLength != readbackSettings.byteLength) {
                    throw new Error('byteLength of buffers do not match')
                }

                // check for actual changes, maybe we should not write to this ESC at all
                if (compare(escSettings, readbackSettings)) {
                    GUI.log('ESC ' + (esc + 1) + ': no changes');
                    continue;
                }

                // should erase page to 0xFF on SiLabs before writing
                if (isSiLabs) {
                    await _4way.pageErase(BLHELI_SILABS_EEPROM_OFFSET / BLHELI_SILABS_PAGE_SIZE);
                    // actual write
                    await _4way.write(BLHELI_SILABS_EEPROM_OFFSET, escSettings);
                } else {
                    // write only changed bytes for Atmel
                    for (var pos = 0; pos < escSettings.byteLength; ++pos) {
                        var offset = pos

                        // find the longest span of modified bytes
                        while (escSettings[pos] != readbackSettings[pos]) {
                            ++pos
                        }

                        // byte unchanged, continue
                        if (offset == pos) {
                            continue
                        }

                        // write span
                        await _4way.writeEEprom(offset, escSettings.subarray(offset, pos));
                    }
                }

                if (isSiLabs) {
                    readbackSettings = (await _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)).params;
                } else {
                    readbackSettings = (await _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)).params;
                }

                if (!compare(escSettings, readbackSettings)) {
                    throw new Error('Failed to verify settings')
                }

                if (isSiLabs) {
                    await _4way.reset(esc);
                }
            } catch (error) {
                GUI.log('ESC ' + (esc + 1) + ', failed to write settings: ' + error.stack);
            }
        }
    },
    writeSetup: async function() {
        GUI.log('writing ESC setup');
        $('a.connect').addClass('disabled');

        // disallow further requests until we're finished
        // @todo also disable settings alteration
        this.setState({
            canRead: false,
            canWrite: false,
            canFlash: false
        });

        await this.writeSetupImpl();

        GUI.log('ESC setup written');

        await this.readSetup();

        $('a.connect').removeClass('disabled');
    },
    flashFirmware: async function(escIndex, notifyStart, notifyProgress, notifyEnd) {
        $('a.connect').addClass('disabled');

        this.setState({ isFlashing: true });

        var escSettings = this.state.escSettings[escIndex],
            escMetainfo = this.state.escMetainfo[escIndex],
            isAtmel = [ _4way_modes.AtmBLB, _4way_modes.AtmSK ].includes(escMetainfo.interfaceMode);

        try {
            var images = await getLocalFirmware(isAtmel);

            // @todo perform some sanity checks on size of flash

            notifyStart();
            notifyProgress(0);

            await this.flashFirmwareImpl(escIndex, escSettings, escMetainfo, images.flash, images.eeprom, notifyProgress);
        } catch (error) {
            GUI.log('Flashing failed: ' + error.message);
        }

        notifyEnd();
        this.setState({ isFlashing: false });

        $('a.connect').removeClass('disabled');
    },
    flashFirmwareImpl: async function(escIndex, escSettings, escMetainfo, flashImage, eepromImage, notifyProgress) {
        try {
            var startTimestamp = Date.now(),
                isAtmel = [ _4way_modes.AtmBLB, _4way_modes.AtmSK ].includes(escMetainfo.interfaceMode),
                self = this;

            // rough estimate, each location gets erased, written and verified at least once
            var max_flash_size = isAtmel ? BLHELI_ATMEL_BLB_ADDRESS_8 : BLHELI_SILABS_ADDRESS_SPACE_SIZE,
                bytes_to_process = max_flash_size * 3,
                bytes_processed = 0;

            // start the actual flashing process
            const initFlashResponse = await _4way.initFlash(escIndex);
            // select flashing algorithm given interface mode
            await selectInterfaceAndFlash(initFlashResponse);

            // migrate settings from previous version if asked to
            const newSettings = blheliSettingsObject((await _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)).params);

            // @todo move elsewhere
            const elapsedSec = (Date.now() - startTimestamp) * 1.0e-3
            GUI.log('Flashing firmware to ESC ' + (escIndex + 1) + ' finished in ' + elapsedSec + ' seconds');

            // ensure mode match
            if (newSettings.MODE === escSettings.MODE) {
                GUI.log('Writing settings back\n');

                // find intersection between newSettings and escSettings with respect to their versions
                for (var prop in newSettings) {
                    if (newSettings.hasOwnProperty(prop) && escSettings.hasOwnProperty(prop) &&
                        blheliCanMigrate(prop, escSettings, newSettings)) {
                        newSettings[prop] = escSettings[prop];                        
                    }
                }

                var allSettings = self.state.escSettings.slice();
                allSettings[escIndex] = newSettings;
                self.onUserInput(allSettings);

                await self.writeSetup();
            } else {
                GUI.log('Will not write settings back due to different MODE\n');

                // read settings back
                await self.readSetup();
            }
        } catch (error) {
            const elapsedSec = (Date.now() - startTimestamp) * 1.0e-3;
            GUI.log('Firmware flashing failed ' + (error ? ': ' + error.stack : ' ') + ' after ' + elapsedSec + ' seconds');
        }

        function updateProgress(bytes) {
            bytes_processed += bytes;
            notifyProgress(Math.min(Math.ceil(100 * bytes_processed / bytes_to_process), 100));
        }

        function selectInterfaceAndFlash(message) {
            var interfaceMode = message.params[3]
            escMetainfo.interfaceMode = interfaceMode

            switch (interfaceMode) {
                case _4way_modes.SiLBLB: return flashSiLabsBLB(message)
                case _4way_modes.AtmBLB:
                case _4way_modes.AtmSK:  return flashAtmel(message)
                default: throw new Error('Flashing with interface mode ' + interfaceMode + ' is not yet implemented')
            }
        }

        function flashSiLabsBLB(message) {
            // @todo check device id

            // read current settings
            return _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)
            // check MCU and LAYOUT
            .then(checkESCAndMCU)
            // erase EEPROM page
            .then(erasePage.bind(undefined, 0x0D))
            // write **FLASH*FAILED** as ESC NAME
            .then(writeEEpromSafeguard)
            // write `LJMP bootloader` to avoid bricking            
            .then(writeBootloaderFailsafe)
            // erase up to EEPROM, skipping first two first pages with bootloader failsafe
            .then(erasePages.bind(undefined, 0x02, 0x0D))
            // write & verify just erased locations
            .then(writePages.bind(undefined, 0x02, 0x0D))
            // write & verify first page
            .then(writePage.bind(undefined, 0x00))
            // erase second page
            .then(erasePage.bind(undefined, 0x01))
            // write & verify second page
            .then(writePage.bind(undefined, 0x01))
            // erase EEPROM
            .then(erasePage.bind(undefined, 0x0D))
            // write & verify EEPROM
            .then(writePage.bind(undefined, 0x0D))
        }

        // @todo
        // 1. add check for ATmega8 vs. ATmega16, they have different flash and eeprom sizes
        function flashAtmel(message) {
            // SimonK uses word instead of byte addressing for flash and address arithmetic on subsequent reads/writes
            const isSimonK = escMetainfo.interfaceMode === _4way_modes.AtmSK
            // @todo check device id

            return _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)
            // check MCU and LAYOUT
            .then(checkESCAndMCU)
            // write **FLASH*FAILED** as NAME
            .then(() => {
                var bytes = ascii2buf('**FLASH*FAILED**')

                return _4way.writeEEprom(BLHELI_LAYOUT.NAME.offset, bytes)
                .then(_4way.readEEprom.bind(_4way, BLHELI_LAYOUT.NAME.offset, BLHELI_LAYOUT.NAME.size))
                .then(message => {
                    if (!compare(bytes, message.params)) {
                        throw new Error('Failed to verify write **FLASH*FAILED**')
                    }
                })
            })
            // write RCALL bootloader_start
            .then(() => {
                var address = isSimonK ? 0x20 : 0x40,
                    // @todo for BLHeli we can jump 0x200 bytes further, do it
                    rcall = [ 0xDF, 0xCD ],
                    bytes = new Uint8Array(64).fill(0xFF)

                bytes.set(rcall)

                return _4way.write(address, bytes)
                .then(_4way.read.bind(_4way, address, rcall.length))
                .then(message => {
                    if (!compare(rcall, message.params)) {
                        throw new Error('Failed to verify `RCALL bootloader` write')
                    }
                })
            })
            // erase first 64 bytes up to RCALL written in the previous step
            .then(() => {
                var bytes = new Uint8Array(64).fill(0xFF)

                return _4way.write(0, bytes)
                .then(_4way.read.bind(_4way, 0, bytes.byteLength))
                .then(message => {
                    if (!compare(bytes, message.params)) {
                        throw new Error('Failed to verify erasure of first 64 bytes')
                    }  
                })
            })
            // write from 0x80 up to bootloader start
            .then(() => {
                var begin_address = 0x80,
                    end_address = BLHELI_ATMEL_BLB_ADDRESS_8
                    write_step = isSimonK ? 0x40 : 0x100,
                    verify_step = 0x100,
                    promise = Q()

                // write
                for (var address = begin_address; address < end_address; address += write_step) {
                    var end = min(address + write_step, end_address),
                        write_address = address

                    if (isSimonK) {
                        if (address === begin_address) {
                            write_address /= 2
                        } else {
                            // SimonK bootloader will continue from the last address where we left off
                            write_address = 0xFFFF
                        }
                    }

                    promise = promise
                    .then(_4way.write.bind(_4way, write_address, flashImage.subarray(address, end)))
                    .then(message => {
                        updateProgress(message.params.byteLength)
                    })
                }

                // verify
                for (let address = begin_address; address < end_address; address += verify_step) {
                    var bytesToRead = min(address + verify_step, end_address) - address,
                        read_address = address

                    if (isSimonK) {
                        if (address === begin_address) {
                            read_address /= 2
                        } else {
                            // SimonK bootloader will continue from the last address where we left off
                            read_address = 0xFFFF
                        }
                    }

                    promise = promise
                    .then(_4way.read.bind(_4way, read_address, bytesToRead))
                    .then(message => {
                        if (!compare(message.params, flashImage.subarray(address, address + message.params.byteLength))) {
                            throw new Error('Failed to verify write at address 0x' + address.toString(0x10))
                        }

                        updateProgress(message.params.byteLength)
                    })
                }

                return promise
            })
            // write 128 remaining bytes
            .then(() => {
                // @todo combine
                if (isSimonK) {
                    return _4way.write(0, flashImage.subarray(0, 0x40))
                    .then(message => {
                        updateProgress(message.params.byteLength)
                    })
                    .then(_4way.write.bind(_4way, 0xFFFF, flashImage.subarray(0x40, 0x80)))
                    .then(_4way.read.bind(_4way, 0, 0x80))
                    .then(message => {
                        if (!compare(message.params, flashImage.subarray(0, 0x80))) {
                            throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10))
                        }

                        updateProgress(message.params.byteLength)
                    })
                } else {
                    return _4way.write(0, flashImage.subarray(0, 0x80))
                    .then(message => {
                        updateProgress(message.params.byteLength)
                    })
                    .then(_4way.read.bind(_4way, 0, 0x80))
                    .then(message => {
                        if (!compare(message.params, flashImage.subarray(message.address, message.address + message.params.byteLength))) {
                            throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10))
                        }

                        updateProgress(message.params.byteLength)
                    })
                }
            })
            // write EEprom changes
            .then(() => {
                var eeprom = new Uint8Array(BLHELI_ATMEL_EEPROM_SIZE)

                // read whole EEprom
                var promise = _4way.readEEprom(0, 0x100)
                .then(message => {
                    eeprom.set(message.params, 0)
                })
                .then(_4way.readEEprom.bind(_4way, isSimonK ? 0xFFFF : 0x100, 0x100))
                .then(message => {
                    eeprom.set(message.params, 0x100)
                })
                // write differing bytes
                .then(() => {
                    var promise = Q(),
                        max_bytes_per_write = isSimonK ? 0x40 : 0x100

                    // write only changed bytes for Atmel
                    for (var pos = 0; pos < eeprom.byteLength; ++pos) {
                        var offset = pos

                        // find the longest span of modified bytes
                        while (eeprom[pos] != flashImage[pos] && (pos - offset) <= max_bytes_per_write) {
                            ++pos
                        }

                        // byte unchanged, continue
                        if (offset == pos) {
                            continue
                        }

                        // write span
                        promise = promise
                        .then(_4way.writeEEprom.bind(_4way, offset, flashImage.subarray(offset, pos)))
                    }

                    return promise
                })
            })
        }

        var escSettingArrayTmp;

        function checkESCAndMCU(message) {
            escSettingArrayTmp = message.params;

            // @todo ask user if he wishes to continue

            const settings_image = isAtmel ? flashImage : flashImage.subarray(BLHELI_SILABS_EEPROM_OFFSET);

            // check LAYOUT
            var target_layout = escSettingArrayTmp.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size),
                fw_layout = settings_image.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size);

            if (!compare(target_layout, fw_layout)) {
                var target_layout_str = buf2ascii(target_layout).trim();
                if (target_layout_str.length == 0) {
                    target_layout_str = 'EMPTY'
                }

                var msg = 'Target LAYOUT ' + target_layout_str + ' is different from HEX ' + buf2ascii(fw_layout).trim()
                if (self.state.ignoreMCULayout) {
                    GUI.log(msg)
                } else {
                    throw new Error(msg)
                }
            }

            // check MCU, if it does not match there's either wrong HEX or corrupted ESC. Disallow for now
            var target_mcu = escSettingArrayTmp.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size),
                fw_mcu = settings_image.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size);
            if (!compare(target_mcu, fw_mcu)) {
                var target_mcu_str = buf2ascii(target_mcu).trim();
                if (target_mcu_str.length == 0) {
                    target_mcu_str = 'EMPTY'
                }

                var msg = 'Target MCU ' + target_mcu_str + ' is different from HEX ' + buf2ascii(fw_mcu).trim()
                if (self.state.ignoreMCULayout) {
                    GUI.log(msg)
                } else {
                    throw new Error(msg)
                }
            }

            // @todo check NAME for **FLASH*FAILED**
        }

        function writeEEpromSafeguard() {
            escSettingArrayTmp.set(ascii2buf('**FLASH*FAILED**'), BLHELI_LAYOUT.NAME.offset)

            var promise = _4way.write(BLHELI_SILABS_EEPROM_OFFSET, escSettingArrayTmp)
            .then(function(message) {
                return _4way.read(message.address, BLHELI_LAYOUT_SIZE)
            })
            .then(function(message) {
                if (!compare(escSettingArrayTmp, message.params)) {
                    throw new Error('Failed to verify write **FLASH*FAILED**')
                }
            })

            return promise
        }

        function writeBootloaderFailsafe() {
            var ljmp_reset = new Uint8Array([ 0x02, 0x19, 0xFD ]),
                ljmp_bootloader = new Uint8Array([ 0x02, 0x1C, 0x00 ])

            var promise = _4way.read(0, 3)
            // verify LJMP reset
            .then(function(message) {
                if (!compare(ljmp_reset, message.params)) {
                    GUI.log('ESC ' + (escIndex + 1) + ' has a different instruction at start of address space, previous flashing has probably failed')
                }
            })
            // erase second page
            .then(erasePage.bind(undefined, 1))
            // write LJMP bootloader
            .then(function() {
                return _4way.write(0x200, ljmp_bootloader)
            })
            // read LJMP bootloader
            .then(function() {
                return _4way.read(0x200, ljmp_bootloader.byteLength)
            })
            // verify LJMP bootloader
            .then(function(message) {
                if (!compare(ljmp_bootloader, message.params)) {
                    throw new Error('Failed to verify `LJMP bootloader` write')
                }
            })
            // erase first page
            .then(erasePage.bind(undefined, 0))
            // ensure page erased to 0xFF
            .then(_4way.read.bind(_4way, 0, 0x100))
            .then(function(message) {
                var erased = message.params.every(x => x == 0xFF)
                if (!erased) {
                    throw new Error('Failed to verify erasure of the first page')
                }

                return _4way.read(0x100, 0x100)
            })
            .then(function(message) {
                var erased = message.params.every(x => x == 0xFF)
                if (!erased) {
                    throw new Error('Failed to verify erasure of the first page')
                }
            })

            return promise
        }

        function erasePages(from_page, max_page) {
            var promise = Q()

            for (var page = from_page; page < max_page; ++page) {
                promise = promise.then(_4way.pageErase.bind(_4way, page))
                .then(function() {
                    updateProgress(BLHELI_SILABS_PAGE_SIZE)
                })
            }

            return promise;
        }

        function erasePage(page) {
            return erasePages(page, page + 1);
        }

        function writePages(begin, end) {
            var begin_address   = begin * BLHELI_SILABS_PAGE_SIZE,
                end_address     = end * BLHELI_SILABS_PAGE_SIZE,
                step            = 0x100,
                promise         = Q()

            for (var address = begin_address; address < end_address; address += step) {
                promise = promise.then(_4way.write.bind(_4way, address, flashImage.subarray(address, address + step)))
                .then(function() {
                    updateProgress(step)
                })
            }

            promise = promise.then(function() {
                return verifyPages(begin, end)
            })
            
            return promise
        }

        function writePage(page) {
            return writePages(page, page + 1)
        }

        function verifyPages(begin, end) {
            var begin_address   = begin * BLHELI_SILABS_PAGE_SIZE,
                end_address     = end * BLHELI_SILABS_PAGE_SIZE,
                step            = 0x100,
                promise         = Q()

            for (var address = begin_address; address < end_address; address += step) {
                promise = promise.then(_4way.read.bind(_4way, address, step))
                .then(function(message) {
                    if (!compare(message.params, flashImage.subarray(message.address, message.address + message.params.byteLength))) {
                        throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10))
                    }

                    updateProgress(message.params.byteLength)
                })
            }

            return promise
        }
    },
    flashAll: async function() {
        $('a.connect').addClass('disabled');

        this.setState({ isFlashing: true });
        
        const availableSettings = this.state.escSettings.filter((i, idx) => this.state.escMetainfo[idx].available),
              isAtmel = [ _4way_modes.AtmBLB, _4way_modes.AtmSK ].includes(availableSettings[0].interfaceMode);

        try {
            var images = await getLocalFirmware(isAtmel);

            // @todo perform some sanity checks on size of flash
            for (let escIndex = 0; escIndex < this.props.escCount; ++escIndex) {
                if (!this.state.escMetainfo[escIndex].available) {
                    continue;
                }

                GUI.log("Starting flash of ESC " + (escIndex + 1));
                var escSettings = this.state.escSettings[escIndex],
                    escMetainfo = this.state.escMetainfo[escIndex];

                await this.flashFirmwareImpl(escIndex, escSettings, escMetainfo, images.flash, images.eeprom,
                    () => {
                        this.setState({
                            flashingEscIndex: escIndex,
                            flashingEscProgress: 0
                        })
                    },
                    progres => {
                        this.setState({ flashingEscProgress: progress })
                    },
                    () => {
                        this.setState({
                            flashingEscIndex: undefined,
                            flashingEscProgress: 0
                        })
                    });
                GUI.log("Finished flashing ESC " + (escIndex + 1));
            }
        } catch (error) {
            GUI.log('Flashing failed: ' + error.message);
        }

        this.setState({ isFlashing: false });

        $('a.connect').removeClass('disabled');
    },
    handleIgnoreMCULayout: function(e) {
        this.setState({
            ignoreMCULayout: e.target.checked
        });
    },
    render: function() {
        return (
            <div className="tab-esc toolbar_fixed_bottom">
                <div className="content_wrapper">
                    <div className="tab_title">ESC Programming</div>
                    <div className="note">
                        <div className="note_spacer">
                            <p dangerouslySetInnerHTML={{ __html: chrome.i18n.getMessage('escFeaturesHelp') }} />
                        </div>
                    </div>
                    {this.renderContent()}
                </div>
                <div className="content_toolbar">
                    <div className="btn">
                        <a
                            href="#"
                            className={!this.state.isFlashing && this.state.canRead ? "" : "disabled"}
                            onClick={this.readSetup}
                        >
                            {chrome.i18n.getMessage('escButtonRead')}
                        </a>
                    </div>
                    <div className="btn">
                        <a
                            href="#"
                            className={!this.state.isFlashing && this.state.canWrite ? "" : "disabled"}
                            onClick={this.writeSetup}
                        >
                            {chrome.i18n.getMessage('escButtonWrite')}
                        </a>
                    </div>
                    <div className="btn">
                        <a
                            href="#"
                            className={!this.state.isFlashing && this.state.canFlash ? "" : "disabled"}
                            onClick={this.flashAll}
                        >
                            {chrome.i18n.getMessage('escButtonFlashAll')}
                        </a>
                    </div>
                </div>
            </div>
        );
    },
    renderContent: function() {
        const noneAvailable = !this.state.escMetainfo.some(info => info.available);
        if (noneAvailable) {
            return null;
        }

        return (
            <div>
                <div className="checkbox">
                    <label>
                        <input
                            type="checkbox"
                            onChange={this.handleIgnoreMCULayout}
                        />
                        <span>{chrome.i18n.getMessage('escIgnoreInappropriateMCULayout')}</span>
                    </label>
                </div>
                <div className="leftWrapper common-config">
                    {this.renderCommonSettings()}
                </div>
                <div className="rightWrapper individual-config">
                    {this.renderIndividualSettings()}
                </div>
            </div>
        );
    },
    renderCommonSettings: function() {
        return (
            <CommonSettings
                escSettings={this.state.escSettings}
                escMetainfo={this.state.escMetainfo}
                onUserInput={this.onUserInput}
            />
        );
    },
    renderIndividualSettings: function() {
        return this.state.escMetainfo.map((info, idx) => {
            if (!info.available) {
                return null;
            }

            return (
                <IndividualSettings
                    escIndex={idx}
                    escSettings={this.state.escSettings}
                    escMetainfo={this.state.escMetainfo}
                    onUserInput={this.onUserInput}
                    canFlash={!this.state.isFlashing}
                    isFlashing={this.state.flashingEscIndex === idx}
                    progress={this.state.flashingEscProgress}
                    flashFirmware={this.flashFirmware}
                />
            );
        });
    }
});

TABS.esc = {};

TABS.esc.initialize = function (callback) {
    if (GUI.active_tab != 'esc') {
        GUI.active_tab = 'esc';
        googleAnalytics.sendAppView('ESC');
    }

    function render_html() {
        // set flag to allow messages redirect to 4way-if handler
        CONFIGURATOR.escActive = true;

        ReactDOM.render(
            <Configurator escCount={ESC_CONFIG.connectedESCs} />,
            document.getElementById('content')
        );

        GUI.content_ready(callback);
    }

    // ask the FC to switch into 4way interface mode
    MSP.send_message(MSP_codes.MSP_SET_4WAY_IF, null, null, render_html);
};

TABS.esc.cleanup = function (callback) {
    if (!CONFIGURATOR.connectionValid || !CONFIGURATOR.escActive) {
        if (callback) callback();
        return;
    }

    // tell 4-way interface to return control to MSP server
    _4way.exit()
    // now we can return control to MSP or CLI handlers
    .then(() => CONFIGURATOR.escActive = false)
    .done()

    if (callback) {
        GUI.timeout_add('waiting_4way_if_exit', callback, 100);
    }
};

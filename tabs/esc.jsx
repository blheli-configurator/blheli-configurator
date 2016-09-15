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

        if (escMetainfo.interface_mode === _4way_modes.SiLBLB) {
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
                        className={this.state.isFlashing ? "progress" : "hidden"}
                        value={this.state.progress}
                        min="0"
                        max="100"
                    />
                    <a
                        href="#"
                        className={this.state.canFlash ? "" : "disabled"}
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
        var escIdx = this.props.escIndex,
            escSettings = blheliSettingsArray(this.props.escSettings[escIdx]),
            escMetainfo = this.props.escMetainfo[escIdx],
            start_timestamp = Date.now(),
            is_atmel = [ _4way_modes.AtmBLB, _4way_modes.AtmSK ].includes(escMetainfo.interface_mode),
            self = this;

        var flash_image, eeprom_image;

        // rough estimate, each location gets erased, written and verified at least once
        var max_flash_size = is_atmel ? BLHELI_ATMEL_BLB_ADDRESS_8 : BLHELI_SILABS_ADDRESS_SPACE_SIZE,
            bytes_to_process = max_flash_size * 3,
            bytes_processed = 0

        // Disallow clicking again
        this.setState({ canFlash: false });
        // @todo notify parent component that we're flashing

        // Ask user to select HEX
        select_file('hex')
        .then(parse_hex)
        .then(data => {
            if (data) {
                GUI.log('Loaded local firmware: ' + data.bytes_total + ' bytes')
                flash_image = fill_image(data, max_flash_size)
            } else {
                throw new Error('HEX file corrupt')
            }
        })
        // Ask EEP on Atmel
        .then(() => {
            if (is_atmel) {
                return select_file('eep')
                .then(parse_hex)
                .then(data => {
                    if (data) {
                        GUI.log('Loaded local EEprom: ' + data.bytes_total + 'bytes')
                        eeprom_image = fill_image(data, BLHELI_ATMEL_EEPROM_SIZE)
                    } else {
                        throw new Error('EEP file corrupt')
                    }
                })
            }
        })
        // validate files
        .then(() => {
            if (is_atmel) {
                var mcu = buf2ascii(eeprom_image.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size))

                if (!mcu.includes('#BLHELI#')) {
                    throw new Error('EEP does not look like a valid Atmel BLHeli EEprom file')
                }
            } else {
                var buf = flash_image.subarray(BLHELI_SILABS_EEPROM_OFFSET).subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size),
                    mcu = buf2ascii(buf)

                if (!mcu.includes('#BLHELI#')) {
                    throw new Error('HEX does not look like a valid SiLabs BLHeli flash file')
                }
            }

            // @todo some sanity checks on size of flash
        })
        .then(() => this.setState({
            isFlashing: true,
            progress: 0
        }))
        // start the actual flashing process
        .then(_4way.initFlash.bind(_4way, escIdx))
        // select flashing algorithm given interface mode
        .then(select_interface)
        // migrate settings from previous version if asked to
        .then(_4way.read.bind(_4way, BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE))
        .then(function(message) {
            var new_settings = message.params,
                offset = BLHELI_LAYOUT.MODE.offset;

            // @todo move elsewhere
            var elapsed_sec = (Date.now() - start_timestamp) * 1.0e-3

            GUI.log('Flashing firmware to ESC ' + (escIdx + 1) + ' finished in ' + elapsed_sec + ' seconds');
            $('a.connect').removeClass('disabled')

            // ensure mode match
            if (compare(new_settings.subarray(offset, offset + 2), escSettings.subarray(offset, offset + 2))) {
                GUI.log('Writing settings back\n');
                // @todo copy only the settings present in flashed version
                // copy changed settings
                var begin = BLHELI_LAYOUT.P_GAIN.offset,
                    end = BLHELI_LAYOUT.BRAKE_ON_STOP.offset + BLHELI_LAYOUT.BRAKE_ON_STOP.size;

                new_settings.set(escSettings.subarray(begin, end), begin);

                // set settings as current
                var allSettings = self.props.escSettings;
                allSettings[escIdx] = blheliSettingsObject(new_settings);
                self.props.onUserInput(allSettings);

                self.props.writeSetup();
            } else {
                GUI.log('Will not write settings back due to different MODE\n');

                // read settings back
                self.props.readSetup();
            }
        })
        .catch(error => {
            var elapsed_sec = (Date.now() - start_timestamp) * 1.0e-3

            GUI.log('Firmware flashing failed ' + (error ? ': ' + error.stack : ' ') + ' after ' + elapsed_sec + ' seconds');
            $('a.connect').removeClass('disabled')
        })
        .then(() => this.setState(this.getInitialState()))
        .done();

        function update_progress(bytes) {
            bytes_processed += bytes;
            self.setState({
                progress: Math.min(Math.ceil(100 * bytes_processed / bytes_to_process), 100)
            });
        }

        function parse_hex(data) {
            // parsing hex in different thread
            var worker = new Worker('./js/workers/hex_parser.js'),
                deferred = Q.defer()

            worker.onmessage = event => deferred.resolve(event.data)
            // send data over for processing
            worker.postMessage(data)

            return deferred.promise
        }

        function select_file(ext) {
            var deferred = Q.defer()

            // Open file dialog
            chrome.fileSystem.chooseEntry({
                type: 'openFile',
                accepts: [ { extensions: [ ext ] } ]
            }, fileEntry => {
                if (chrome.runtime.lastError) {
                    deferred.reject(new Error(chrome.runtime.lastError.message))
                    return
                }

                chrome.fileSystem.getDisplayPath(fileEntry, path => {
                    GUI.log('Loading file from ' + path)

                    fileEntry.file(file => {
                        var reader = new FileReader

                        reader.onprogress = e => {
                            if (e.total > 32 * 1024) { // 32 KiB
                                deferred.reject('File size limit of 32 KiB exceeded')
                            }
                        }

                        reader.onloadend = e => {
                            if (e.total !== 0 && e.total === e.loaded) {
                                GUI.log('Loaded file ' + path)

                                deferred.resolve(e.target.result)
                            } else {
                                deferred.reject(new Error('Failed to load ' + path))
                            }
                        }

                        reader.readAsText(file)
                    })
                })
            })

            return deferred.promise
        }

        // Fills a memory image of ESC MCU's address space with target firmware
        function fill_image(data, size) {
            var image = new Uint8Array(size).fill(0xFF)

            data.data.forEach(function(block) {
                // Check preconditions
                if (block.address >= image.byteLength) {
                    if (block.address == BLHELI_SILABS_BOOTLOADER_ADDRESS) {
                        GUI.log('Block at 0x' + block.address.toString(0x10) + ' of 0x' + block.bytes.toString(0x10) + ' bytes contains bootloader, skipping\n');
                    } else {
                        GUI.log('Block at 0x' + block.address.toString(0x10) + ' is outside of target address space\n');
                    }

                    return;
                }

                if (block.address + block.bytes >= image.byteLength) {
                    GUI.log('Block at 0x' + block.address.toString(0x10) + ' spans past the end of target address space\n');
                }

                // block.data may be too large, select maximum allowed size
                var clamped_length = Math.min(block.bytes, image.byteLength - block.address);
                image.set(block.data.slice(0, clamped_length), block.address);
            })

            return image
        }

        function select_interface(message) {
            var interface_mode = message.params[3]
            escMetainfo.interface_mode = interface_mode

            switch (interface_mode) {
                case _4way_modes.SiLBLB: return flash_silabs_blb(message)
                case _4way_modes.AtmBLB:
                case _4way_modes.AtmSK:  return flash_atmel(message)
                default: throw new Error('Flashing with interface mode ' + interface_mode + ' is not yet implemented')
            }
        }

        function flash_silabs_blb(message) {
            // @todo check device id

            // read current settings
            return _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)
            // check MCU and LAYOUT
            .then(check_esc_and_mcu)
            // erase EEPROM page
            .then(erase_page.bind(undefined, 0x0D))
            // write **FLASH*FAILED** as ESC NAME
            .then(write_eeprom_safeguard)
            // write `LJMP bootloader` to avoid bricking            
            .then(write_bootloader_failsafe)
            // erase up to EEPROM, skipping first two first pages with bootloader failsafe
            .then(erase_pages.bind(undefined, 0x02, 0x0D))
            // write & verify just erased locations
            .then(write_pages.bind(undefined, 0x02, 0x0D))
            // write & verify first page
            .then(write_page.bind(undefined, 0x00))
            // erase second page
            .then(erase_page.bind(undefined, 0x01))
            // write & verify second page
            .then(write_page.bind(undefined, 0x01))
            // erase EEPROM
            .then(erase_page.bind(undefined, 0x0D))
            // write & verify EEPROM
            .then(write_page.bind(undefined, 0x0D))
        }

        // @todo
        // 1. add check for ATmega8 vs. ATmega16, they have different flash and eeprom sizes
        function flash_atmel(message) {
            // SimonK uses word instead of byte addressing for flash and address arithmetic on subsequent reads/writes
            var is_simonk = escMetainfo.interface_mode === _4way_modes.AtmSK
            // @todo check device id

            return _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)
            // check MCU and LAYOUT
            .then(check_esc_and_mcu)
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
                var address = is_simonk ? 0x20 : 0x40,
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
                    write_step = is_simonk ? 0x40 : 0x100,
                    verify_step = 0x100,
                    promise = Q()

                // write
                for (var address = begin_address; address < end_address; address += write_step) {
                    var end = min(address + write_step, end_address),
                        write_address = address

                    if (is_simonk) {
                        if (address === begin_address) {
                            write_address /= 2
                        } else {
                            // SimonK bootloader will continue from the last address where we left off
                            write_address = 0xFFFF
                        }
                    }

                    promise = promise
                    .then(_4way.write.bind(_4way, write_address, flash_image.subarray(address, end)))
                    .then(message => {
                        update_progress(message.params.byteLength)
                    })
                }

                // verify
                for (let address = begin_address; address < end_address; address += verify_step) {
                    var bytesToRead = min(address + verify_step, end_address) - address,
                        read_address = address

                    if (is_simonk) {
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
                        if (!compare(message.params, flash_image.subarray(address, address + message.params.byteLength))) {
                            throw new Error('Failed to verify write at address 0x' + address.toString(0x10))
                        }

                        update_progress(message.params.byteLength)
                    })
                }

                return promise
            })
            // write 128 remaining bytes
            .then(() => {
                // @todo combine
                if (is_simonk) {
                    return _4way.write(0, flash_image.subarray(0, 0x40))
                    .then(message => {
                        update_progress(message.params.byteLength)
                    })
                    .then(_4way.write.bind(_4way, 0xFFFF, flash_image.subarray(0x40, 0x80)))
                    .then(_4way.read.bind(_4way, 0, 0x80))
                    .then(message => {
                        if (!compare(message.params, flash_image.subarray(0, 0x80))) {
                            throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10))
                        }

                        update_progress(message.params.byteLength)
                    })
                } else {
                    return _4way.write(0, flash_image.subarray(0, 0x80))
                    .then(message => {
                        update_progress(message.params.byteLength)
                    })
                    .then(_4way.read.bind(_4way, 0, 0x80))
                    .then(message => {
                        if (!compare(message.params, flash_image.subarray(message.address, message.address + message.params.byteLength))) {
                            throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10))
                        }

                        update_progress(message.params.byteLength)
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
                .then(_4way.readEEprom.bind(_4way, is_simonk ? 0xFFFF : 0x100, 0x100))
                .then(message => {
                    eeprom.set(message.params, 0x100)
                })
                // write differing bytes
                .then(() => {
                    var promise = Q(),
                        max_bytes_per_write = is_simonk ? 0x40 : 0x100

                    // write only changed bytes for Atmel
                    for (var pos = 0; pos < eeprom.byteLength; ++pos) {
                        var offset = pos

                        // find the longest span of modified bytes
                        while (eeprom[pos] != eeprom_image[pos] && (pos - offset) <= max_bytes_per_write) {
                            ++pos
                        }

                        // byte unchanged, continue
                        if (offset == pos) {
                            continue
                        }

                        // write span
                        promise = promise
                        .then(_4way.writeEEprom.bind(_4way, offset, eeprom_image.subarray(offset, pos)))
                    }

                    return promise
                })
            })
        }

        function check_esc_and_mcu(message) {
            escSettings = message.params;

            // @todo ask user if he wishes to continue

            const settings_image = is_atmel ? eeprom_image : flash_image.subarray(BLHELI_SILABS_EEPROM_OFFSET);

            // check LAYOUT
            var target_layout = escSettings.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size),
                fw_layout = settings_image.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size);

            if (!compare(target_layout, fw_layout)) {
                var target_layout_str = buf2ascii(target_layout).trim();
                if (target_layout_str.length == 0) {
                    target_layout_str = 'EMPTY'
                }

                var msg = 'Target LAYOUT ' + target_layout_str + ' is different from HEX ' + buf2ascii(fw_layout).trim()
                if (self.props.ignoreMCULayout) {
                    GUI.log(msg)
                } else {
                    throw new Error(msg)
                }
            }

            // check MCU, if it does not match there's either wrong HEX or corrupted ESC. Disallow for now
            var target_mcu = escSettings.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size),
                fw_mcu = settings_image.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size);
            if (!compare(target_mcu, fw_mcu)) {
                var target_mcu_str = buf2ascii(target_mcu).trim();
                if (target_mcu_str.length == 0) {
                    target_mcu_str = 'EMPTY'
                }

                var msg = 'Target MCU ' + target_mcu_str + ' is different from HEX ' + buf2ascii(fw_mcu).trim()
                if (self.props.ignoreMCULayout) {
                    GUI.log(msg)
                } else {
                    throw new Error(msg)
                }
            }

            // @todo check NAME for **FLASH*FAILED**
        }

        function write_eeprom_safeguard() {
            escSettings.set(ascii2buf('**FLASH*FAILED**'), BLHELI_LAYOUT.NAME.offset)

            var promise = _4way.write(BLHELI_SILABS_EEPROM_OFFSET, escSettings)
            .then(function(message) {
                return _4way.read(message.address, BLHELI_LAYOUT_SIZE)
            })
            .then(function(message) {
                if (!compare(escSettings, message.params)) {
                    throw new Error('Failed to verify write **FLASH*FAILED**')
                }
            })

            return promise
        }

        function write_bootloader_failsafe() {
            var ljmp_reset = new Uint8Array([ 0x02, 0x19, 0xFD ]),
                ljmp_bootloader = new Uint8Array([ 0x02, 0x1C, 0x00 ])

            var promise = _4way.read(0, 3)
            // verify LJMP reset
            .then(function(message) {
                if (!compare(ljmp_reset, message.params)) {
                    self.print('ESC ' + (escIdx + 1) + ' has a different instruction at start of address space, previous flashing has probably failed')
                }
            })
            // erase second page
            .then(erase_page.bind(undefined, 1))
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
            .then(erase_page.bind(undefined, 0))
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

        function erase_pages(from_page, max_page) {
            var promise = Q()

            for (var page = from_page; page < max_page; ++page) {
                promise = promise.then(_4way.pageErase.bind(_4way, page))
                .then(function() {
                    update_progress(BLHELI_SILABS_PAGE_SIZE)
                })
            }

            return promise;
        }

        function erase_page(page) {
            return erase_pages(page, page + 1);
        }

        function write_pages(begin, end) {
            var begin_address   = begin * BLHELI_SILABS_PAGE_SIZE,
                end_address     = end * BLHELI_SILABS_PAGE_SIZE,
                step            = 0x100,
                promise         = Q()

            for (var address = begin_address; address < end_address; address += step) {
                promise = promise.then(_4way.write.bind(_4way, address, flash_image.subarray(address, address + step)))
                .then(function() {
                    update_progress(step)
                })
            }

            promise = promise.then(function() {
                return verify_pages(begin, end)
            })
            
            return promise
        }

        function write_page(page) {
            return write_pages(page, page + 1)
        }

        function verify_pages(begin, end) {
            var begin_address   = begin * BLHELI_SILABS_PAGE_SIZE,
                end_address     = end * BLHELI_SILABS_PAGE_SIZE,
                step            = 0x100,
                promise         = Q()

            for (var address = begin_address; address < end_address; address += step) {
                promise = promise.then(_4way.read.bind(_4way, address, step))
                .then(function(message) {
                    if (!compare(message.params, flash_image.subarray(message.address, message.address + message.params.byteLength))) {
                        throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10))
                    }

                    update_progress(message.params.byteLength)
                })
            }

            return promise
        }
    }
});

var Configurator = React.createClass({
    getInitialState: () => {
        return {
            canRead: true,
            canWrite: false,
            escSettings: [],
            escMetainfo: [],
            ignoreMCULayout: false,
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
        // disallow further requests until we're finished
        // @todo also disable settings alteration
        this.setState({
            canRead: false,
            canWrite: false
        });

        await this.readSetupImpl();

        this.setState({
            canRead: true,
            canWrite: true
        });

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
                const interface_mode = message.params[3]

                // remember interface mode for ESC
                escMetainfo[esc].interface_mode = interface_mode

                // read everything in one big chunk
                // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
                var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interface_mode),
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
                    GUI.log('ESC ' + (esc + 1) + ' has MODE different from MULTI: ' + mode.toString(0x10))
                }

                escSettings[esc] = settings;
                escMetainfo[esc].available = true;

                if (isSiLabs) {
                    await _4way.reset(esc);
                }
            } catch (error) {
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
                var interface_mode = message.params[3]

                // remember interface mode for ESC
                // this.setState(state => {
                //     state.escMetainfo[esc].interface_mode = interface_mode;
                //     return state;
                // })

                // read everything in one big chunk to check if any settings have changed
                // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
                var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interface_mode),
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
        // disallow further requests until we're finished
        // @todo also disable settings alteration
        this.setState({
            canRead: false,
            canWrite: false
        });

        await this.writeSetupImpl();

        GUI.log('ESC setup written');

        this.readSetup();
    },
    handleIgnoreMCULayout: function(e) {
        this.setState({
            ignoreMCULayout: e.target.checked
        });
    },
    render: function() {
        return (
            <div>
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
                            className={this.state.canRead ? "read" : "read disabled"}
                            onClick={this.readSetup}
                        >
                            {chrome.i18n.getMessage('escButtonRead')}
                        </a>
                    </div>
                    <div className="btn">
                        <a
                            href="#"
                            className={this.state.canWrite ? "write" : "write disabled"}
                            onClick={this.writeSetup}
                        >
                            {chrome.i18n.getMessage('escButtonWrite')}
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
                    ignoreMCULayout={this.state.ignoreMCULayout}
                    onUserInput={this.onUserInput}
                    writeSetup={this.writeSetup}
                    readSetup={this.readSetup}
                />
            );
        });
    }
});

TABS.esc = {};

TABS.esc.print = function (str) {
    GUI.log(str);
};

TABS.esc.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'esc') {
        GUI.active_tab = 'esc';
        googleAnalytics.sendAppView('ESC');
    }

    function load_html() {
        // set flag to allow messages redirect to 4way-if handler
        CONFIGURATOR.escActive = true;
        $('#content').load("./tabs/esc.html", process_html);
    }

    function process_html() {
        // translate to user-selected language
        localize();
        ReactDOM.render(
            <Configurator escCount={ESC_CONFIG.connectedESCs} />,
            document.getElementById('configurator')
        );

        GUI.content_ready(callback);
    }

    // ask the FC to switch into 4way interface mode
    MSP.send_message(MSP_codes.MSP_SET_4WAY_IF, null, null, load_html);
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

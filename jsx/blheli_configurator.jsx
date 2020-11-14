'use strict';

const METAINFO_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

// Fix for nw.js which has regeneratorRuntime defined in global.
if (window.regeneratorRuntime == undefined) {
    window.regeneratorRuntime = global.regeneratorRuntime;
}

var Configurator = React.createClass({
    getInitialState: () => {
        return {
            canRead: true,
            canWrite: false,
            canFlash: false,
            isFlashing: false,
            selectingFirmware: false,

            escSettings: [],
            escMetainfo: [],

            ignoreMCULayout: false,

            flashingEscIndex: undefined,
            flashingEscProgress: 0
        };
    },
    componentWillMount: function() {
        this.updateVersionsMetainfo();
        const interval = setInterval(this.updateVersionsMetainfo, METAINFO_UPDATE_INTERVAL_MS);

        this.setState({
            updateInterval: interval
        });
    },
    componentWillUnmount: function() {
        if (this.state.updateInterval) {
            clearInterval(this.state.updateInterval);
        }
    },
    updateVersionsMetainfo: function() {
        fetchJSON(BLHELI_ESCS_KEY, BLHELI_ESCS_REMOTE, BLHELI_ESCS_LOCAL)
        .then(json => this.setState({ supportedBlheliESCs: json }));

        fetchJSON(OPEN_ESC_ESCS_KEY, OPEN_ESC_ESCS_REMOTE, OPEN_ESC_ESCS_LOCAL)
        .then(json => this.setState({ supportedOpenEscESCs: json }));

        fetchJSON(BLHELI_VERSIONS_KEY, BLHELI_VERSIONS_REMOTE, BLHELI_VERSIONS_LOCAL)
        .then(json => this.setState({ blheliFirmwareVersions: json }));

        fetchJSON(OPEN_ESC_VERSIONS_KEY, OPEN_ESC_VERSIONS_REMOTE, OPEN_ESC_VERSIONS_LOCAL)
        .then(json => this.setState({ openEscFirmwareVersions: json }));
    },
    onUserInput: function(newSettings) {
        this.setState({
            escSettings: newSettings
        });
    },
    saveLog: () => saveFile(console.dump().join('\n')),
    readSetup: async function() {
        GUI.log(chrome.i18n.getMessage('readSetupStarted'));
        $('a.connect').addClass('disabled');

        // disallow further requests until we're finished
        // @todo also disable settings alteration
        this.setState({
            canRead: false,
            canWrite: false,
            canFlash: false
        });

        try {
            await this.readSetupAll();
            GUI.log(chrome.i18n.getMessage('readSetupFinished'));
        } catch (error) {
            GUI.log(chrome.i18n.getMessage('readSetupFailed', [ error.stack ]));
        }

        const availableMetainfo = this.state.escMetainfo.filter(metainfo => metainfo.available);
        if (!availableMetainfo.every(metainfo => metainfo.interfaceMode === availableMetainfo[0].interfaceMode)) {
            throw new Error('Mixing of different ESC types not supported.');
        }
        const isOpenEsc = availableMetainfo[0] && availableMetainfo[0].interfaceMode === _4way_modes.ARMBLB;

        const availableSettings = this.state.escSettings.filter((i, idx) => this.state.escMetainfo[idx].available);

        // Enable `Flash All` if all ESCs are identical
        const canFlash = isOpenEsc ? availableSettings.every(settings => settings.LAYOUT_REVISION === availableSettings[0].LAYOUT_REVISION) : availableSettings.every(settings => settings.LAYOUT === availableSettings[0].LAYOUT);
        const canResetDefaults = isOpenEsc || availableSettings.every(settings => settings.LAYOUT_REVISION > BLHELI_S_MIN_LAYOUT_REVISION);

        this.setState({
            canRead: true,
            canWrite: availableSettings.length > 0,
            canFlash: availableSettings.length > 0 && canFlash,
            canResetDefaults: canResetDefaults
        });

        $('a.connect').removeClass('disabled');
    },
    readSetupAll: async function() {
        var escSettings = [],
            escMetainfo = [];

        if (Debug.enabled) {
            escSettings = [ Debug.getDummySettings(BLHELI_TYPES.BLHELI_S_SILABS) ];
            escMetainfo = [ Debug.getDummyMetainfo(BLHELI_TYPES.BLHELI_S_SILABS) ];

            this.setState({
                escSettings: escSettings,
                escMetainfo: escMetainfo
            });

            return;
        }

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
                // @todo C2 will require redesign here
                escMetainfo[esc].signature = (message.params[1] << 8) | message.params[0];

                // read everything in one big chunk
                // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
                var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interfaceMode),
                    isArm = interfaceMode === _4way_modes.ARMBLB,
                    settingsArray = null,
                    layout = BLHELI_LAYOUT;

                if (isSiLabs) {
                    settingsArray = (await _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)).params;
                } else if (isArm) {
                    settingsArray = (await _4way.read(OPEN_ESC_EEPROM_OFFSET, OPEN_ESC_LAYOUT_SIZE)).params;
                    layout = OPEN_ESC_LAYOUT;
                } else {
                    settingsArray = (await _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)).params;
                }

                const settings = blheliSettingsObject(settingsArray, layout);

                escSettings[esc] = settings;
                escMetainfo[esc].available = true;

                googleAnalytics.sendEvent('ESC', 'VERSION', settings.MAIN_REVISION + '.' + settings.SUB_REVISION);
                googleAnalytics.sendEvent('ESC', 'LAYOUT', settings.LAYOUT ? settings.LAYOUT.replace(/#/g, '') : `Arm_${settings.LAYOUT_REVISION}`);
                googleAnalytics.sendEvent('ESC', 'MODE', settings.MODE ? blheliModeToString(settings.MODE) : null);
                googleAnalytics.sendEvent('ESC', 'COMMUTATION_TIMING', settings.COMMUTATION_TIMING);
                googleAnalytics.sendEvent('ESC', 'DEMAG_COMPENSATION', settings.DEMAG_COMPENSATION);
                googleAnalytics.sendEvent('ESC', 'STARTUP_POWER', settings.STARTUP_POWER);
                googleAnalytics.sendEvent('ESC', 'PPM_MIN_THROTTLE', settings.PPM_MIN_THROTTLE);
                googleAnalytics.sendEvent('ESC', 'PPM_MAX_THROTTLE', settings.PPM_MAX_THROTTLE);

                if (isSiLabs || isArm) {
                    await _4way.reset(esc);
                }
            } catch (error) {
                console.log('ESC', esc + 1, 'read settings failed', error.message);
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
    writeSetupAll: async function() {
        for (var esc = 0; esc < this.state.escSettings.length; ++esc) {
            await this.writeSetupImpl(esc);
        }
    },
    writeSetupImpl: async function(esc) {
        try {
            if (!this.state.escMetainfo[esc].available) {
               return;
            }

            // Ask 4way interface to initialize target ESC for flashing
            const message = await _4way.initFlash(esc);
            // Remember interface mode and read settings
            var interfaceMode = message.params[3]

            // read everything in one big chunk to check if any settings have changed
            // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
            var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interfaceMode),
                isArm = interfaceMode === _4way_modes.ARMBLB,
                readbackSettings = null,
                layout = BLHELI_LAYOUT,
                layoutSize = BLHELI_LAYOUT_SIZE;

            if (isSiLabs) {
                readbackSettings = (await _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)).params;
            } else if (isArm) {
                readbackSettings = (await _4way.read(OPEN_ESC_EEPROM_OFFSET, OPEN_ESC_LAYOUT_SIZE)).params;
                layout = OPEN_ESC_LAYOUT;
                layoutSize = OPEN_ESC_LAYOUT_SIZE;
            } else {
                readbackSettings = (await _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)).params;
            }

            // Check for changes and perform write
            var escSettings = blheliSettingsArray(this.state.escSettings[esc], layout, layoutSize);

            // check for unexpected size mismatch
            if (escSettings.byteLength != readbackSettings.byteLength) {
                throw new Error('byteLength of buffers do not match')
            }

            // check for actual changes, maybe we should not write to this ESC at all
            if (compare(escSettings, readbackSettings)) {
                GUI.log(chrome.i18n.getMessage('writeSetupNoChanges', [ esc + 1 ]));
                return;
            }

            // should erase page to 0xFF on SiLabs before writing
            if (isSiLabs) {
                await _4way.pageErase(BLHELI_SILABS_EEPROM_OFFSET / BLHELI_SILABS_PAGE_SIZE);
                // actual write
                await _4way.write(BLHELI_SILABS_EEPROM_OFFSET, escSettings);
                GUI.log(chrome.i18n.getMessage('writeSetupBytesWritten', [ esc + 1, escSettings.byteLength ]));
            } else if (isArm) {
                // actual write
                await _4way.write(OPEN_ESC_EEPROM_OFFSET, escSettings);
                GUI.log(chrome.i18n.getMessage('writeSetupBytesWritten', [ esc + 1, escSettings.byteLength ]));
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
                    GUI.log(chrome.i18n.getMessage('writeSetupBytesWritten', [ esc + 1, pos - offset ]));
                }
            }

            if (isSiLabs) {
                readbackSettings = (await _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)).params;
            } else if (isArm) {
                readbackSettings = (await _4way.read(OPEN_ESC_EEPROM_OFFSET, OPEN_ESC_LAYOUT_SIZE)).params;
            } else {
                readbackSettings = (await _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)).params;
            }

            if (!compare(escSettings, readbackSettings)) {
                throw new Error('Failed to verify settings')
            }

            if (isSiLabs || isArm) {
                await _4way.reset(esc);
            }
        } catch (error) {
            GUI.log(chrome.i18n.getMessage('writeSetupFailedOne', [ esc + 1, error.message ]));
            console.log('Error while writing settings:', error);
        }
    },
    writeSetup: async function() {
        GUI.log(chrome.i18n.getMessage('writeSetupStarted'));
        $('a.connect').addClass('disabled');

        // disallow further requests until we're finished
        // @todo also disable settings alteration
        this.setState({
            canRead: false,
            canWrite: false,
            canFlash: false
        });

        try {
            await this.writeSetupAll();
            GUI.log(chrome.i18n.getMessage('writeSetupFinished'));
        } catch (error) {
            GUI.log(chrome.i18n.getMessage('writeSetupFailed', [ error.stack ]));
        }

        await this.readSetup();

        $('a.connect').removeClass('disabled');
    },
    resetDefaults: function() {
        var newSettings = [];

        this.state.escSettings.forEach((settings, index) => {
            const metainfo = this.state.escMetainfo[index];
            if (!metainfo.available) {
                newSettings.push({})
                return;
            }

            const defaults = metainfo.interfaceMode === _4way_modes.ARMBLB ? OPEN_ESC_DEFAULTS[settings.LAYOUT_REVISION] : BLHELI_S_DEFAULTS[settings.LAYOUT_REVISION];
            if (defaults) {
                for (var settingName in defaults) {
                    if (defaults.hasOwnProperty(settingName)) {
                        settings[settingName] = defaults[settingName];
                    }
                }
            }

            newSettings.push(settings);
        })

        this.setState({
            escSettings: newSettings
        });

        this.writeSetup()
        .catch(error => console.log("Unexpected error while writing default setup", error))
    },
    flashOne: async function(escIndex) {
        this.setState({
            selectingFirmware: true,
            escsToFlash: [ escIndex ]
        });
    },
    flashFirmwareImpl: async function(escIndex, escSettings, escMetainfo, flashImage, eepromImage, notifyProgress) {
        var isAtmel = [ _4way_modes.AtmBLB, _4way_modes.AtmSK ].includes(escMetainfo.interfaceMode),
            isArm = escMetainfo.interfaceMode === _4way_modes.ARMBLB,
            self = this;

        // rough estimate, each location gets erased, written and verified at least once
        // SimonK does not erase pages, hence the factor of 2
        var bytes_to_process = flashImage.byteLength * ((isAtmel || isArm) ? 2 : 3),
            bytes_processed = 0;

        // start the actual flashing process
        const initFlashResponse = await _4way.initFlash(escIndex);
        // select flashing algorithm given interface mode
        await selectInterfaceAndFlash(initFlashResponse);

        var settingsArray;
        var layout = BLHELI_LAYOUT;
        if (isAtmel) {
            settingsArray = (await _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)).params;
        } else if (isArm) {
            // Reset to get the firmware name / version set by the firmware
            await _4way.reset(escIndex);

            // Need an init after the reset
            await _4way.initFlash(escIndex);

              settingsArray = (await _4way.read(OPEN_ESC_EEPROM_OFFSET, OPEN_ESC_LAYOUT_SIZE)).params;
              layout = OPEN_ESC_LAYOUT;
        } else {
            settingsArray = (await _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)).params;
        }

        // migrate settings from previous version if asked to
        const newSettings = blheliSettingsObject(settingsArray, layout);

        if (!isArm) {
            GUI.log('No need to migrate settings for Open ESC (yet).');
        } else if (newSettings.MODE === escSettings.MODE) {
            // ensure mode match
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

            GUI.log(chrome.i18n.getMessage('writeSetupStarted'));

            try {
                await self.writeSetupImpl(escIndex);
                GUI.log(chrome.i18n.getMessage('writeSetupFinished'));
            } catch (error) {
                GUI.log(chrome.i18n.getMessage('writeSetupFailed', [ error.message ]));
            }
        } else {
            GUI.log('Will not write settings back due to different MODE\n');

            // read settings back
            await self.readSetup();
        }

        function updateProgress(bytes) {
            bytes_processed += bytes;
            notifyProgress(Math.min(Math.ceil(100 * bytes_processed / bytes_to_process), 100));
        }

        function selectInterfaceAndFlash(message) {
            var interfaceMode = message.params[3]
            escMetainfo.interfaceMode = interfaceMode

            switch (interfaceMode) {
                case _4way_modes.SiLBLB: return flashSiLabsBLB(message);
                case _4way_modes.AtmBLB:
                case _4way_modes.AtmSK:  return flashAtmel(message);
                case _4way_modes.ARMBLB: return flashArm(message);
                default: throw new Error('Flashing with interface mode ' + interfaceMode + ' is not yet implemented');
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
            .then(writePages.bind(undefined, 0x02, 0x0D, BLHELI_SILABS_PAGE_SIZE))
            // write & verify first page
            .then(writePage.bind(undefined, 0x00, BLHELI_SILABS_PAGE_SIZE))
            // erase second page
            .then(erasePage.bind(undefined, 0x01))
            // write & verify second page
            .then(writePage.bind(undefined, 0x01, BLHELI_SILABS_PAGE_SIZE))
            // erase EEPROM
            .then(erasePage.bind(undefined, 0x0D))
            // write & verify EEPROM
            .then(writePage.bind(undefined, 0x0D, BLHELI_SILABS_PAGE_SIZE))
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
                    // @todo This is a jump to SimonK bootloader, BLHeli bootloader is 512 bytes further, jump could be optimized
                    rcall = new Uint8Array([ 0xDF, 0xCD ]),
                    bytes = new Uint8Array(64).fill(0xFF)

                bytes.set(rcall)

                return _4way.write(address, bytes)
                .then(() => updateProgress(bytes.byteLength))
                .then(_4way.read.bind(_4way, address, rcall.length))
                .then(message => {
                    if (!compare(rcall, message.params)) {
                        throw new Error('Failed to verify `RCALL bootloader` write')
                    }

                    updateProgress(bytes.byteLength);
                })
            })
            // erase first 64 bytes up to RCALL written in the previous step
            .then(() => {
                var bytes = new Uint8Array(64).fill(0xFF)

                return _4way.write(0, bytes)
                .then(() => updateProgress(bytes.byteLength))
                .then(_4way.read.bind(_4way, 0, bytes.byteLength))
                .then(message => {
                    if (!compare(bytes, message.params)) {
                        throw new Error('Failed to verify erasure of first 64 bytes')
                    }
                    updateProgress(bytes.byteLength);
                })
            })
            // write from 0x80 up to bootloader start
            .then(() => {
                var begin_address = 0x80,
                    end_address = (() => {
                        const MCU = findMCU(escMetainfo.signature, self.state.supportedBlheliESCs.signatures.Atmel);

                        switch (escMetainfo.interfaceMode) {
                            case _4way_modes.AtmBLB: return MCU.flash_size - BLHELI_ATMEL_BLB_SIZE;
                            case _4way_modes.AtmSK: return MCU.flash_size - BLHELI_ATMEL_SK_SIZE;
                            default: throw Error('unknown interfaceMode ' + escMetainfo.interfaceMode);
                        }
                    })(),
                    write_step = isSimonK ? 0x40 : 0x100,
                    verify_step = 0x80,
                    promise = Q()

                // write
                for (var address = begin_address; address < end_address; address += write_step) {
                    var end = Math.min(address + write_step, end_address),
                        write_address = address;
                    let bytesToWrite = end - address;

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
                        updateProgress(bytesToWrite)
                    })
                }

                // verify
                for (let address = begin_address; address < end_address; address += verify_step) {
                    var bytesToRead = Math.min(address + verify_step, end_address) - address,
                        read_address = address

                    if (isSimonK) {
                        if (address === begin_address) {
                            // Word addressing for flash with SimonK bootloader
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
                        updateProgress(0x40);
                    })
                    .then(_4way.write.bind(_4way, 0xFFFF, flashImage.subarray(0x40, 0x80)))
                    .then(message => {
                        updateProgress(0x40);
                    })
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
                        updateProgress(0x80)
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
                var eeprom = new Uint8Array(BLHELI_ATMEL_EEPROM_SIZE),
                    beginAddress = 0,
                    endAddress = 0x200,
                    step = 0x80,
                    promise = Q();

                // read whole EEprom
                for (let address = beginAddress; address < endAddress; address += step) {
                    const cmdAddress = address === beginAddress || !isSimonK ? address : 0xFFFF;

                    promise = promise.then(_4way.readEEprom.bind(_4way, cmdAddress, step))
                    .then(message => eeprom.set(message.params, address));
                }

                // write differing bytes
                return promise.then(() => {
                    var promise = Q(),
                        max_bytes_per_write = isSimonK ? 0x40 : 0x100

                    // write only changed bytes for Atmel
                    for (var pos = 0; pos < eeprom.byteLength; ++pos) {
                        var offset = pos

                        // find the longest span of modified bytes
                        while (eeprom[pos] != eepromImage[pos] && (pos - offset) <= max_bytes_per_write) {
                            ++pos
                        }

                        // byte unchanged, continue
                        if (offset == pos) {
                            continue
                        }

                        // write span
                        promise = promise
                        .then(_4way.writeEEprom.bind(_4way, offset, eepromImage.subarray(offset, pos)))
                    }

                    return promise
                })
            })
        }

        function flashArm(message) {
            // @todo check device id

            let originalSettings;

            // read the original EEPROM contents
            return _4way.read(OPEN_ESC_EEPROM_OFFSET, OPEN_ESC_LAYOUT_SIZE)
            // lock firmware booting (set EEPROM byte 0 to 0)
            .then(message => {
                originalSettings = message.params;

                let eepromInfo = new Uint8Array(17).fill(0x00);
                eepromInfo.set([ originalSettings[1], originalSettings[2] ], 1);
                eepromInfo.set(ascii2buf('FLASH FAIL  '), 5);

                return _4way.write(OPEN_ESC_EEPROM_OFFSET, eepromInfo);
            })
            // write the firmware
            .then(writePages.bind(undefined, 0x04, 0x40, OPEN_ESC_PAGE_SIZE))
            // write back the original EEPROM contents
            .then(() => {
                // unlock firmware booting
                originalSettings[0] = 0x01;
                originalSettings.fill(0x00, 3, 5);
                originalSettings.set(ascii2buf('NOT READY   '), 5);

                return _4way.write(OPEN_ESC_EEPROM_OFFSET, originalSettings);
            });
        }

        var escSettingArrayTmp;

        function checkESCAndMCU(message) {
            escSettingArrayTmp = message.params;

            const settings_image = isAtmel ? eepromImage : flashImage.subarray(BLHELI_SILABS_EEPROM_OFFSET);

            // check LAYOUT
            var target_layout = escSettingArrayTmp.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size),
                fw_layout = settings_image.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size);

            if (!compare(target_layout, fw_layout)) {
                var target_layout_str = buf2ascii(target_layout).trim();
                if (target_layout_str.length == 0) {
                    target_layout_str = 'EMPTY'
                }

                if (!self.state.ignoreMCULayout) {
                    throw new Error(chrome.i18n.getMessage('layoutMismatch', [ target_layout_str, buf2ascii(fw_layout).trim() ]));
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

                if (!self.state.ignoreMCULayout) {
                    throw new Error(chrome.i18n.getMessage('mcuMismatch', [ target_mcu_str, buf2ascii(fw_mcu).trim() ]));
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
                    throw new Error('failed to verify write **FLASH*FAILED**')
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
                    // @todo LJMP bootloader is probably already there and we could skip some steps
                }
            })
            // erase second page
            .then(erasePage.bind(undefined, 1))
            // write LJMP bootloader
            .then(_4way.write.bind(_4way, 0x200, ljmp_bootloader))
            // read LJMP bootloader
            .then(_4way.read.bind(_4way, 0x200, ljmp_bootloader.byteLength))
            // verify LJMP bootloader
            .then(function(message) {
                if (!compare(ljmp_bootloader, message.params)) {
                    throw new Error('failed to verify `LJMP bootloader` write')
                }
            })
            // erase first page
            .then(erasePage.bind(undefined, 0))
            // ensure page erased to 0xFF
            // @todo it could be beneficial to reattempt erasing first page in case of failure
            .then(() => {
                var begin_address   = 0,
                    end_address     = 0x200,
                    step            = 0x80,
                    promise         = Q();

                for (var address = begin_address; address < end_address; address += step) {
                    promise = promise.then(_4way.read.bind(_4way, address, step))
                    .then(function(message) {
                        const erased = message.params.every(x => x == 0xFF);
                        if (!erased) {
                            throw new Error('failed to verify erasure of the first page');
                        }

                        updateProgress(message.params.byteLength);
                    })
                }

                return promise
            });

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

        function writePages(begin, end, pageSize) {
            var begin_address   = begin * pageSize,
                end_address     = end * pageSize,
                step            = 0x100,
                promise         = Q()

            for (var address = begin_address; address < end_address && address < flashImage.length; address += step) {
                promise = promise.then(_4way.write.bind(_4way, address, flashImage.subarray(address, Math.min(address + step, flashImage.length))))
                .then(function() {
                    updateProgress(step)
                })
            }

            promise = promise.then(function() {
                return verifyPages(begin, end, pageSize)
            })

            return promise
        }

        function writePage(page, pageSize) {
            return writePages(page, page + 1, pageSize)
        }

        function verifyPages(begin, end, pageSize) {
            var begin_address   = begin * pageSize,
                end_address     = end * pageSize,
                step            = 0x80,
                promise         = Q()

            for (var address = begin_address; address < end_address && address < flashImage.length; address += step) {
                promise = promise.then(_4way.read.bind(_4way, address, Math.min(step, flashImage.length - address)))
                .then(function(message) {
                    if (!compare(message.params, flashImage.subarray(message.address, message.address + message.params.byteLength))) {
                        throw new Error('failed to verify write at address 0x' + message.address.toString(0x10))
                    }

                    updateProgress(message.params.byteLength)
                })
            }

            return promise
        }
    },
    selectFirmwareForFlashAll: function() {
        // Get indices of all available ESCs
        const escsToFlash = this.state.escMetainfo.map((info, idx) => info.available ? idx : undefined).filter(_ => _ !== undefined);

        this.setState({
            selectingFirmware: true,
            escsToFlash: escsToFlash
        });
    },
    flashAll: async function(hex, eep) {
        $('a.connect').addClass('disabled');

        this.setState({ isFlashing: true });

        const firstAvailableMetainfo = this.state.escMetainfo[this.state.escsToFlash[0]],
            interfaceMode = firstAvailableMetainfo.interfaceMode,
            signature = firstAvailableMetainfo.signature,
            isAtmel = [ _4way_modes.AtmBLB, _4way_modes.AtmSK ].includes(interfaceMode),
            isArm = interfaceMode === _4way_modes.ARMBLB;

        let flashOffset = 0;
        let firmwareStart = 0;
        const flashSize = (() => {
            let MCU;
            switch (interfaceMode) {
                case _4way_modes.SiLC2:
                    return BLHELI_SILABS_FLASH_SIZE;
                case _4way_modes.SiLBLB: {
                    MCU = findMCU(signature, this.state.supportedBlheliESCs.signatures[BLHELI_TYPES.BLHELI_S_SILABS]) || findMCU(signature, this.state.supportedBlheliESCs.signatures.SiLabs);

                    break;
                }
                case _4way_modes.AtmBLB:
                case _4way_modes.AtmSK: {
                    MCU = findMCU(signature, this.state.supportedBlheliESCs.signatures.Atmel);

                    break;
                }
                case _4way_modes.ARMBLB: {
                    MCU = findMCU(signature, this.state.supportedOpenEscESCs.signatures.Arm);

                    break;
                }
                default:
                    throw Error('unknown interfaceMode ' + interfaceMode);
            }

            if (MCU.flash_offset) {
                flashOffset = parseInt(MCU.flash_offset);
            }
            if (MCU.firmware_start) {
                firmwareStart = parseInt(MCU.firmware_start);
            }

            return MCU.flash_size;
        })();

        try {
            let flash;
            let eeprom;

            if (isArm) {
                let hexImage = await parseHex(hex);
                let endAddress = hexImage.data[hexImage.data.length - 1].address + hexImage.data[hexImage.data.length - 1].bytes;
                flash = fillImage(hexImage, endAddress - flashOffset, flashOffset);

                //TODO: Also check for the firmware name
                // But we first need to get this moved to a fixed location
                const firstBytes = flash.subarray(firmwareStart, firmwareStart + 4);
                const vecTabStart = new Uint8Array([ 0x00, 0x20, 0x00, 0x20 ]);
                if (!compare(firstBytes, vecTabStart)) {
                    throw new Error(chrome.i18n.getMessage('hexInvalidArm'));
                }
            } else if (!isAtmel) {
                eeprom = fillImage(await parseHex(eep), BLHELI_ATMEL_EEPROM_SIZE, flashOffset);
                // Check pseudo-eeprom page for BLHELI signature
                const MCU = buf2ascii(flash.subarray(BLHELI_SILABS_EEPROM_OFFSET).subarray(BLHELI_LAYOUT.MCU.offset).subarray(0, BLHELI_LAYOUT.MCU.size));
                // Check instruction at the start of address space
                const firstBytes = flash.subarray(0, 3);
                const ljmpReset = new Uint8Array([ 0x02, 0x19, 0xFD ]);
                const ljmpCheckBootload = new Uint8Array([ 0x02, 0x19, 0xE0 ]);
                // BLHeli_S uses #BLHELI$.
                // @todo add additional sanitize here to prevent user from flashing BLHeli_S on BLHeli ESC and vice versa
                if (!(MCU.includes('#BLHELI#') || MCU.includes('#BLHELI$')) ||
                    (!compare(firstBytes, ljmpReset) && !compare(firstBytes, ljmpCheckBootload))) {
                    throw new Error(chrome.i18n.getMessage('hexInvalidSiLabs'));
                }
            } else {
                flash = fillImage(await parseHex(hex), flashSize, flashOffset);

                // @todo check first 2 bytes of flash as well

                const MCU = buf2ascii(eeprom.subarray(BLHELI_LAYOUT.MCU.offset).subarray(0, BLHELI_LAYOUT.MCU.size));
                if (!MCU.includes('#BLHELI#')) {
                    throw new Error('EEP does not look like a valid Atmel BLHeli EEprom file');
                }
            }

            // @todo perform some sanity checks on size of flash
            for (let i = 0; i < this.state.escsToFlash.length; ++i) {
                const escIndex = this.state.escsToFlash[i];

                GUI.log(chrome.i18n.getMessage('escFlashingStarted', [ escIndex + 1 ]));
                var escSettings = this.state.escSettings[escIndex],
                    escMetainfo = this.state.escMetainfo[escIndex];

                this.setState({
                    flashingEscIndex: escIndex,
                    flashingEscProgress: 0
                });

                try {
                    const startTimestamp = Date.now()

                    await this.flashFirmwareImpl(escIndex, escSettings, escMetainfo, flash, eeprom,
                        progress => {
                            this.setState({ flashingEscProgress: progress })
                        });

                    const elapsedSec = (Date.now() - startTimestamp) * 1.0e-3;
                    GUI.log(chrome.i18n.getMessage('escFlashingFinished', [ escIndex + 1, elapsedSec ]));
                    googleAnalytics.sendEvent('ESC', 'FlashingFinished', 'After', elapsedSec.toString());
                } catch (error) {
                    GUI.log(chrome.i18n.getMessage('escFlashingFailed', [ escIndex + 1, error.stack ]));
                    googleAnalytics.sendEvent('ESC', 'FlashingFailed', 'Error', error.stack);
                }

                this.setState({
                    flashingEscIndex: undefined,
                    flashingEscProgress: 0
                })
            }
        } catch (error) {
            GUI.log(chrome.i18n.getMessage('flashingFailedGeneral', [ error.stack ]));
            googleAnalytics.sendEvent('ESC', 'FirmwareValidationFailed', 'Error', error.stack);
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
        if (!this.state.supportedBlheliESCs || !this.state.supportedOpenEscESCs || !this.state.blheliFirmwareVersions || !this.state.openEscFirmwareVersions) return null;

        return (
            <div className="tab-esc toolbar_fixed_bottom">
                <div className="content_wrapper">
                    <div className="note">
                        <div className="note_spacer">
                            <p dangerouslySetInnerHTML={{ __html: chrome.i18n.getMessage('escFeaturesHelp') }} />
                        </div>
                    </div>
                    {this.renderContent()}
                </div>
                <div className="content_toolbar">
                    <div className="btn log_btn">
                        <a
                            href="#"
                            onClick={this.saveLog}
                        >
                            {chrome.i18n.getMessage('escButtonSaveLog')}
                        </a>
                    </div>
                    <div className="btn">
                        <a
                            href="#"
                            className={!this.state.selectingFirmware && !this.state.isFlashing && this.state.canRead ? "" : "disabled"}
                            onClick={this.readSetup}
                        >
                            {chrome.i18n.getMessage('escButtonRead')}
                        </a>
                    </div>
                    <div className="btn">
                        <a
                            href="#"
                            className={!this.state.selectingFirmware && !this.state.isFlashing && this.state.canWrite ? "" : "disabled"}
                            onClick={this.writeSetup}
                        >
                            {chrome.i18n.getMessage('escButtonWrite')}
                        </a>
                    </div>
                    <div className="btn">
                        <a
                            href="#"
                            className={!this.state.selectingFirmware && !this.state.isFlashing && this.state.canFlash ? "" : "disabled"}
                            onClick={this.selectFirmwareForFlashAll}
                        >
                            {chrome.i18n.getMessage('escButtonFlashAll')}
                        </a>
                    </div>
                    <div className={this.state.canResetDefaults ? "btn" : "hidden"}>
                        <a
                            href="#"
                            className={!this.state.selectingFirmware && !this.state.IsFlashing && this.state.canWrite ? "" : "disabled"}
                            onClick={this.resetDefaults}
                        >
                            {chrome.i18n.getMessage('resetDefaults')}
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
                {this.renderWrappers()}
            </div>
        );
    },
    renderWrappers: function() {
        if (this.state.selectingFirmware) {
            const firstAvailableIndex = this.state.escsToFlash[0];
            const firstAvailableMetainfo = this.state.escMetainfo[firstAvailableIndex];
            const firstAvailableEsc = this.state.escSettings[firstAvailableIndex];

            return [
              <div className="checkbox">
                    <label>
                        <input
                            type="checkbox"
                            onChange={this.handleIgnoreMCULayout}
                            checked={this.state.ignoreMCULayout}
                        />
                        <span>
                            {chrome.i18n.getMessage('escIgnoreInappropriateMCULayout')}
                            <span
                                className={this.state.ignoreMCULayout ? 'red' : 'hidden'}
                            >
                                {chrome.i18n.getMessage('escIgnoreInappropriateMCULayoutWarning')}
                            </span>
                        </span>
                    </label>
                </div>,
                <FirmwareSelector
                    supportedBlheliESCs={this.state.supportedBlheliESCs}
                    supportedOpenEscESCs={this.state.supportedOpenEscESCs}
                    blheliFirmwareVersions={this.state.blheliFirmwareVersions}
                    openEscFirmwareVersions={this.state.openEscFirmwareVersions}
                    signatureHint={firstAvailableMetainfo.signature}
                    escHint={firstAvailableEsc.LAYOUT}
                    modeHint={blheliModeToString(firstAvailableEsc.MODE)}
                    onFirmwareLoaded={this.onFirmwareLoaded}
                    onCancel={this.onFirmwareSelectorCancel}
                />
            ];
        }

        return (
            <div>
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
                supportedBlheliESCs={this.state.supportedBlheliESCs}
                supportedOpenEscESCs={this.state.supportedOpenEscESCs}
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
                    supportedBlheliESCs={this.state.supportedBlheliESCs}
                    supportedOpenEscESCs={this.state.supportedOpenEscESCs}
                    onUserInput={this.onUserInput}
                    canFlash={!this.state.isFlashing}
                    isFlashing={this.state.flashingEscIndex === idx}
                    progress={this.state.flashingEscProgress}
                    onFlash={this.flashOne}
                />
            );
        });
    },
    onFirmwareLoaded: function(hex, eep) {
        this.setState({
            selectingFirmware: false
        });

        this.flashAll(hex, eep);
    },
    onFirmwareSelectorCancel: function() {
        this.setState({
            selectingFirmware: false
        });
    }
});

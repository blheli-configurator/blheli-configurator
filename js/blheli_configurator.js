'use strict';

var METAINFO_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

var Configurator = React.createClass({
    displayName: 'Configurator',

    getInitialState: function getInitialState() {
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
    componentWillMount: function componentWillMount() {
        this.updateVersionsMetainfo();
        var interval = setInterval(this.updateVersionsMetainfo, METAINFO_UPDATE_INTERVAL_MS);

        this.setState({
            updateInterval: interval
        });
    },
    componentWillUnmount: function componentWillUnmount() {
        if (this.state.updateInterval) {
            clearInterval(this.state.updateInterval);
        }
    },
    updateVersionsMetainfo: function updateVersionsMetainfo() {
        var _this = this;

        fetchJSON(BLHELI_ESCS_KEY, BLHELI_ESCS_REMOTE, BLHELI_ESCS_LOCAL).then(function (json) {
            return _this.setState({ supportedESCs: json });
        });

        fetchJSON(BLHELI_VERSIONS_KEY, BLHELI_VERSIONS_REMOTE, BLHELI_VERSIONS_LOCAL).then(function (json) {
            return _this.setState({ firmwareVersions: json });
        });
    },
    onUserInput: function onUserInput(newSettings) {
        this.setState({
            escSettings: newSettings
        });
    },
    saveLog: function saveLog() {
        return saveFile(console.dump().join('\n'));
    },
    readSetup: function readSetup() {
        var _this2 = this;

        var availableSettings, availableMetainfos, canFlash, canResetDefaults;
        return regeneratorRuntime.async(function readSetup$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        GUI.log(chrome.i18n.getMessage('readSetupStarted'));
                        $('a.connect').addClass('disabled');

                        // disallow further requests until we're finished
                        // @todo also disable settings alteration
                        this.setState({
                            canRead: false,
                            canWrite: false,
                            canFlash: false
                        });

                        _context.prev = 3;
                        _context.next = 6;
                        return regeneratorRuntime.awrap(this.readSetupAll());

                    case 6:
                        GUI.log(chrome.i18n.getMessage('readSetupFinished'));
                        _context.next = 12;
                        break;

                    case 9:
                        _context.prev = 9;
                        _context.t0 = _context['catch'](3);

                        GUI.log(chrome.i18n.getMessage('readSetupFailed', [_context.t0.stack]));

                    case 12:

                        // Enable `Flash All` if all ESCs are identical
                        availableSettings = this.state.escSettings.filter(function (i, idx) {
                            return _this2.state.escMetainfo[idx].available;
                        });
                        // @todo remove when Atmel flashing has been checked

                        availableMetainfos = this.state.escMetainfo.filter(function (info) {
                            return info.available;
                        });
                        canFlash = availableSettings.every(function (settings) {
                            return settings.LAYOUT === availableSettings[0].LAYOUT;
                        });
                        canResetDefaults = availableSettings.every(function (settings) {
                            return settings.LAYOUT_REVISION > BLHELI_S_MIN_LAYOUT_REVISION;
                        });


                        this.setState({
                            canRead: true,
                            canWrite: availableSettings.length > 0,
                            canFlash: availableSettings.length > 0 && canFlash,
                            canResetDefaults: canResetDefaults
                        });

                        $('a.connect').removeClass('disabled');

                    case 18:
                    case 'end':
                        return _context.stop();
                }
            }
        }, null, this, [[3, 9]]);
    },
    readSetupAll: function readSetupAll() {
        var escSettings, escMetainfo, esc, message, interfaceMode, isSiLabs, settingsArray, settings;
        return regeneratorRuntime.async(function readSetupAll$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        escSettings = [], escMetainfo = [];

                        if (!Debug.enabled) {
                            _context2.next = 6;
                            break;
                        }

                        escSettings = [Debug.getDummySettings(BLHELI_TYPES.BLHELI_S_SILABS)];
                        escMetainfo = [Debug.getDummyMetainfo(BLHELI_TYPES.BLHELI_S_SILABS)];

                        this.setState({
                            escSettings: escSettings,
                            escMetainfo: escMetainfo
                        });

                        return _context2.abrupt('return');

                    case 6:
                        esc = 0;

                    case 7:
                        if (!(esc < this.props.escCount)) {
                            _context2.next = 50;
                            break;
                        }

                        escSettings.push({});
                        escMetainfo.push({});

                        _context2.prev = 10;
                        _context2.next = 13;
                        return regeneratorRuntime.awrap(_4way.initFlash(esc));

                    case 13:
                        message = _context2.sent;


                        // Check interface mode and read settings
                        interfaceMode = message.params[3];

                        // remember interface mode for ESC

                        escMetainfo[esc].interfaceMode = interfaceMode;
                        // @todo C2 will require redesign here
                        escMetainfo[esc].signature = message.params[1] << 8 | message.params[0];

                        // read everything in one big chunk
                        // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
                        isSiLabs = [_4way_modes.SiLC2, _4way_modes.SiLBLB].includes(interfaceMode), settingsArray = null;

                        if (!isSiLabs) {
                            _context2.next = 24;
                            break;
                        }

                        _context2.next = 21;
                        return regeneratorRuntime.awrap(_4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE));

                    case 21:
                        settingsArray = _context2.sent.params;
                        _context2.next = 27;
                        break;

                    case 24:
                        _context2.next = 26;
                        return regeneratorRuntime.awrap(_4way.readEEprom(0, BLHELI_LAYOUT_SIZE));

                    case 26:
                        settingsArray = _context2.sent.params;

                    case 27:
                        settings = blheliSettingsObject(settingsArray);


                        escSettings[esc] = settings;
                        escMetainfo[esc].available = true;

                        googleAnalytics.sendEvent('ESC', 'VERSION', settings.MAIN_REVISION + '.' + settings.SUB_REVISION);
                        googleAnalytics.sendEvent('ESC', 'LAYOUT', settings.LAYOUT.replace(/#/g, ''));
                        googleAnalytics.sendEvent('ESC', 'MODE', blheliModeToString(settings.MODE));
                        googleAnalytics.sendEvent('ESC', 'COMMUTATION_TIMING', settings.COMMUTATION_TIMING);
                        googleAnalytics.sendEvent('ESC', 'DEMAG_COMPENSATION', settings.DEMAG_COMPENSATION);
                        googleAnalytics.sendEvent('ESC', 'STARTUP_POWER', settings.STARTUP_POWER);
                        googleAnalytics.sendEvent('ESC', 'PPM_MIN_THROTTLE', settings.PPM_MIN_THROTTLE);
                        googleAnalytics.sendEvent('ESC', 'PPM_MAX_THROTTLE', settings.PPM_MAX_THROTTLE);

                        if (!isSiLabs) {
                            _context2.next = 41;
                            break;
                        }

                        _context2.next = 41;
                        return regeneratorRuntime.awrap(_4way.reset(esc));

                    case 41:
                        _context2.next = 47;
                        break;

                    case 43:
                        _context2.prev = 43;
                        _context2.t0 = _context2['catch'](10);

                        console.log('ESC', esc + 1, 'read settings failed', _context2.t0.message);
                        escMetainfo[esc].available = false;

                    case 47:
                        ++esc;
                        _context2.next = 7;
                        break;

                    case 50:

                        // Update backend and trigger representation
                        this.setState({
                            escSettings: escSettings,
                            escMetainfo: escMetainfo
                        });

                    case 51:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, null, this, [[10, 43]]);
    },
    // @todo add validation of each setting via BLHELI_SETTINGS_DESCRIPTION
    writeSetupAll: function writeSetupAll() {
        var esc;
        return regeneratorRuntime.async(function writeSetupAll$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        esc = 0;

                    case 1:
                        if (!(esc < this.state.escSettings.length)) {
                            _context3.next = 7;
                            break;
                        }

                        _context3.next = 4;
                        return regeneratorRuntime.awrap(this.writeSetupImpl(esc));

                    case 4:
                        ++esc;
                        _context3.next = 1;
                        break;

                    case 7:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, null, this);
    },
    writeSetupImpl: function writeSetupImpl(esc) {
        var message, interfaceMode, isSiLabs, readbackSettings, escSettings, pos, offset;
        return regeneratorRuntime.async(function writeSetupImpl$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        _context4.prev = 0;

                        if (this.state.escMetainfo[esc].available) {
                            _context4.next = 3;
                            break;
                        }

                        return _context4.abrupt('return');

                    case 3:
                        _context4.next = 5;
                        return regeneratorRuntime.awrap(_4way.initFlash(esc));

                    case 5:
                        message = _context4.sent;

                        // Remember interface mode and read settings
                        interfaceMode = message.params[3];

                        // read everything in one big chunk to check if any settings have changed
                        // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command

                        isSiLabs = [_4way_modes.SiLC2, _4way_modes.SiLBLB].includes(interfaceMode), readbackSettings = null;

                        if (!isSiLabs) {
                            _context4.next = 14;
                            break;
                        }

                        _context4.next = 11;
                        return regeneratorRuntime.awrap(_4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE));

                    case 11:
                        readbackSettings = _context4.sent.params;
                        _context4.next = 17;
                        break;

                    case 14:
                        _context4.next = 16;
                        return regeneratorRuntime.awrap(_4way.readEEprom(0, BLHELI_LAYOUT_SIZE));

                    case 16:
                        readbackSettings = _context4.sent.params;

                    case 17:

                        // Check for changes and perform write
                        escSettings = blheliSettingsArray(this.state.escSettings[esc]);

                        // check for unexpected size mismatch

                        if (!(escSettings.byteLength != readbackSettings.byteLength)) {
                            _context4.next = 20;
                            break;
                        }

                        throw new Error('byteLength of buffers do not match');

                    case 20:
                        if (!compare(escSettings, readbackSettings)) {
                            _context4.next = 23;
                            break;
                        }

                        GUI.log(chrome.i18n.getMessage('writeSetupNoChanges', [esc + 1]));
                        return _context4.abrupt('return');

                    case 23:
                        if (!isSiLabs) {
                            _context4.next = 31;
                            break;
                        }

                        _context4.next = 26;
                        return regeneratorRuntime.awrap(_4way.pageErase(BLHELI_SILABS_EEPROM_OFFSET / BLHELI_SILABS_PAGE_SIZE));

                    case 26:
                        _context4.next = 28;
                        return regeneratorRuntime.awrap(_4way.write(BLHELI_SILABS_EEPROM_OFFSET, escSettings));

                    case 28:
                        GUI.log(chrome.i18n.getMessage('writeSetupBytesWritten', [esc + 1, escSettings.byteLength]));
                        _context4.next = 43;
                        break;

                    case 31:
                        pos = 0;

                    case 32:
                        if (!(pos < escSettings.byteLength)) {
                            _context4.next = 43;
                            break;
                        }

                        offset = pos;

                        // find the longest span of modified bytes

                        while (escSettings[pos] != readbackSettings[pos]) {
                            ++pos;
                        }

                        // byte unchanged, continue

                        if (!(offset == pos)) {
                            _context4.next = 37;
                            break;
                        }

                        return _context4.abrupt('continue', 40);

                    case 37:
                        _context4.next = 39;
                        return regeneratorRuntime.awrap(_4way.writeEEprom(offset, escSettings.subarray(offset, pos)));

                    case 39:
                        GUI.log(chrome.i18n.getMessage('writeSetupBytesWritten', [esc + 1, pos - offset]));

                    case 40:
                        ++pos;
                        _context4.next = 32;
                        break;

                    case 43:
                        if (!isSiLabs) {
                            _context4.next = 49;
                            break;
                        }

                        _context4.next = 46;
                        return regeneratorRuntime.awrap(_4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE));

                    case 46:
                        readbackSettings = _context4.sent.params;
                        _context4.next = 52;
                        break;

                    case 49:
                        _context4.next = 51;
                        return regeneratorRuntime.awrap(_4way.readEEprom(0, BLHELI_LAYOUT_SIZE));

                    case 51:
                        readbackSettings = _context4.sent.params;

                    case 52:
                        if (compare(escSettings, readbackSettings)) {
                            _context4.next = 54;
                            break;
                        }

                        throw new Error('Failed to verify settings');

                    case 54:
                        if (!isSiLabs) {
                            _context4.next = 57;
                            break;
                        }

                        _context4.next = 57;
                        return regeneratorRuntime.awrap(_4way.reset(esc));

                    case 57:
                        _context4.next = 62;
                        break;

                    case 59:
                        _context4.prev = 59;
                        _context4.t0 = _context4['catch'](0);

                        GUI.log(chrome.i18n.getMessage('writeSetupFailedOne', [esc + 1, _context4.t0.message]));

                    case 62:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, null, this, [[0, 59]]);
    },
    writeSetup: function writeSetup() {
        return regeneratorRuntime.async(function writeSetup$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        GUI.log(chrome.i18n.getMessage('writeSetupStarted'));
                        $('a.connect').addClass('disabled');

                        // disallow further requests until we're finished
                        // @todo also disable settings alteration
                        this.setState({
                            canRead: false,
                            canWrite: false,
                            canFlash: false
                        });

                        _context5.prev = 3;
                        _context5.next = 6;
                        return regeneratorRuntime.awrap(this.writeSetupAll());

                    case 6:
                        GUI.log(chrome.i18n.getMessage('writeSetupFinished'));
                        _context5.next = 12;
                        break;

                    case 9:
                        _context5.prev = 9;
                        _context5.t0 = _context5['catch'](3);

                        GUI.log(chrome.i18n.getMessage('writeSetupFailed', [_context5.t0.stack]));

                    case 12:
                        _context5.next = 14;
                        return regeneratorRuntime.awrap(this.readSetup());

                    case 14:

                        $('a.connect').removeClass('disabled');

                    case 15:
                    case 'end':
                        return _context5.stop();
                }
            }
        }, null, this, [[3, 9]]);
    },
    resetDefaults: function resetDefaults() {
        var _this3 = this;

        var newSettings = [];

        this.state.escSettings.forEach(function (settings, index) {
            if (!_this3.state.escMetainfo[index].available) {
                newSettings.push({});
                return;
            }

            var defaults = BLHELI_S_DEFAULTS[settings.LAYOUT_REVISION];
            if (defaults) {
                for (var settingName in defaults) {
                    if (defaults.hasOwnProperty(settingName)) {
                        settings[settingName] = defaults[settingName];
                    }
                }
            }

            newSettings.push(settings);
        });

        this.setState({
            escSettings: newSettings
        });

        this.writeSetup().catch(function (error) {
            return console.log("Unexpected error while writing default setup", error);
        });
    },
    flashOne: function flashOne(escIndex) {
        return regeneratorRuntime.async(function flashOne$(_context6) {
            while (1) {
                switch (_context6.prev = _context6.next) {
                    case 0:
                        this.setState({
                            selectingFirmware: true,
                            escsToFlash: [escIndex]
                        });

                    case 1:
                    case 'end':
                        return _context6.stop();
                }
            }
        }, null, this);
    },
    flashFirmwareImpl: function flashFirmwareImpl(escIndex, escSettings, escMetainfo, flashImage, eepromImage, notifyProgress) {
        var isAtmel, self, bytes_to_process, bytes_processed, initFlashResponse, settingsArray, newSettings, prop, allSettings, updateProgress, selectInterfaceAndFlash, flashSiLabsBLB, flashAtmel, escSettingArrayTmp, checkESCAndMCU, writeEEpromSafeguard, writeBootloaderFailsafe, erasePages, erasePage, writePages, writePage, verifyPages;
        return regeneratorRuntime.async(function flashFirmwareImpl$(_context7) {
            while (1) {
                switch (_context7.prev = _context7.next) {
                    case 0:
                        verifyPages = function verifyPages(begin, end) {
                            var begin_address = begin * BLHELI_SILABS_PAGE_SIZE,
                                end_address = end * BLHELI_SILABS_PAGE_SIZE,
                                step = 0x80,
                                promise = Q();

                            for (var address = begin_address; address < end_address; address += step) {
                                promise = promise.then(_4way.read.bind(_4way, address, step)).then(function (message) {
                                    if (!compare(message.params, flashImage.subarray(message.address, message.address + message.params.byteLength))) {
                                        throw new Error('failed to verify write at address 0x' + message.address.toString(0x10));
                                    }

                                    updateProgress(message.params.byteLength);
                                });
                            }

                            return promise;
                        };

                        writePage = function writePage(page) {
                            return writePages(page, page + 1);
                        };

                        writePages = function writePages(begin, end) {
                            var begin_address = begin * BLHELI_SILABS_PAGE_SIZE,
                                end_address = end * BLHELI_SILABS_PAGE_SIZE,
                                step = 0x100,
                                promise = Q();

                            for (var address = begin_address; address < end_address; address += step) {
                                promise = promise.then(_4way.write.bind(_4way, address, flashImage.subarray(address, address + step))).then(function () {
                                    updateProgress(step);
                                });
                            }

                            promise = promise.then(function () {
                                return verifyPages(begin, end);
                            });

                            return promise;
                        };

                        erasePage = function erasePage(page) {
                            return erasePages(page, page + 1);
                        };

                        erasePages = function erasePages(from_page, max_page) {
                            var promise = Q();

                            for (var page = from_page; page < max_page; ++page) {
                                promise = promise.then(_4way.pageErase.bind(_4way, page)).then(function () {
                                    updateProgress(BLHELI_SILABS_PAGE_SIZE);
                                });
                            }

                            return promise;
                        };

                        writeBootloaderFailsafe = function writeBootloaderFailsafe() {
                            var ljmp_reset = new Uint8Array([0x02, 0x19, 0xFD]),
                                ljmp_bootloader = new Uint8Array([0x02, 0x1C, 0x00]);

                            var promise = _4way.read(0, 3)
                            // verify LJMP reset
                            .then(function (message) {
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
                            .then(function (message) {
                                if (!compare(ljmp_bootloader, message.params)) {
                                    throw new Error('failed to verify `LJMP bootloader` write');
                                }
                            })
                            // erase first page
                            .then(erasePage.bind(undefined, 0))
                            // ensure page erased to 0xFF
                            // @todo it could be beneficial to reattempt erasing first page in case of failure
                            .then(function () {
                                var begin_address = 0,
                                    end_address = 0x200,
                                    step = 0x80,
                                    promise = Q();

                                for (var address = begin_address; address < end_address; address += step) {
                                    promise = promise.then(_4way.read.bind(_4way, address, step)).then(function (message) {
                                        var erased = message.params.every(function (x) {
                                            return x == 0xFF;
                                        });
                                        if (!erased) {
                                            throw new Error('failed to verify erasure of the first page');
                                        }

                                        updateProgress(message.params.byteLength);
                                    });
                                }

                                return promise;
                            });

                            return promise;
                        };

                        writeEEpromSafeguard = function writeEEpromSafeguard() {
                            escSettingArrayTmp.set(ascii2buf('**FLASH*FAILED**'), BLHELI_LAYOUT.NAME.offset);

                            var promise = _4way.write(BLHELI_SILABS_EEPROM_OFFSET, escSettingArrayTmp).then(function (message) {
                                return _4way.read(message.address, BLHELI_LAYOUT_SIZE);
                            }).then(function (message) {
                                if (!compare(escSettingArrayTmp, message.params)) {
                                    throw new Error('failed to verify write **FLASH*FAILED**');
                                }
                            });

                            return promise;
                        };

                        checkESCAndMCU = function checkESCAndMCU(message) {
                            escSettingArrayTmp = message.params;

                            var settings_image = isAtmel ? eepromImage : flashImage.subarray(BLHELI_SILABS_EEPROM_OFFSET);

                            // check LAYOUT
                            var target_layout = escSettingArrayTmp.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size),
                                fw_layout = settings_image.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size);

                            if (!compare(target_layout, fw_layout)) {
                                var target_layout_str = buf2ascii(target_layout).trim();
                                if (target_layout_str.length == 0) {
                                    target_layout_str = 'EMPTY';
                                }

                                if (!self.state.ignoreMCULayout) {
                                    throw new Error(chrome.i18n.getMessage('layoutMismatch', [target_layout_str, buf2ascii(fw_layout).trim()]));
                                }
                            }

                            // check MCU, if it does not match there's either wrong HEX or corrupted ESC. Disallow for now
                            var target_mcu = escSettingArrayTmp.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size),
                                fw_mcu = settings_image.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size);
                            if (!compare(target_mcu, fw_mcu)) {
                                var target_mcu_str = buf2ascii(target_mcu).trim();
                                if (target_mcu_str.length == 0) {
                                    target_mcu_str = 'EMPTY';
                                }

                                if (!self.state.ignoreMCULayout) {
                                    throw new Error(chrome.i18n.getMessage('mcuMismatch', [target_mcu_str, buf2ascii(fw_mcu).trim()]));
                                }
                            }

                            // @todo check NAME for **FLASH*FAILED**
                        };

                        flashAtmel = function flashAtmel(message) {
                            // SimonK uses word instead of byte addressing for flash and address arithmetic on subsequent reads/writes
                            var isSimonK = escMetainfo.interfaceMode === _4way_modes.AtmSK;
                            // @todo check device id

                            return _4way.readEEprom(0, BLHELI_LAYOUT_SIZE)
                            // check MCU and LAYOUT
                            .then(checkESCAndMCU)
                            // write **FLASH*FAILED** as NAME
                            .then(function () {
                                var bytes = ascii2buf('**FLASH*FAILED**');

                                return _4way.writeEEprom(BLHELI_LAYOUT.NAME.offset, bytes).then(_4way.readEEprom.bind(_4way, BLHELI_LAYOUT.NAME.offset, BLHELI_LAYOUT.NAME.size)).then(function (message) {
                                    if (!compare(bytes, message.params)) {
                                        throw new Error('Failed to verify write **FLASH*FAILED**');
                                    }
                                });
                            })
                            // write RCALL bootloader_start
                            .then(function () {
                                var address = isSimonK ? 0x20 : 0x40,

                                // @todo This is a jump to SimonK bootloader, BLHeli bootloader is 512 bytes further, jump could be optimized
                                rcall = new Uint8Array([0xDF, 0xCD]),
                                    bytes = new Uint8Array(64).fill(0xFF);

                                bytes.set(rcall);

                                return _4way.write(address, bytes).then(function () {
                                    return updateProgress(bytes.byteLength);
                                }).then(_4way.read.bind(_4way, address, rcall.length)).then(function (message) {
                                    if (!compare(rcall, message.params)) {
                                        throw new Error('Failed to verify `RCALL bootloader` write');
                                    }

                                    updateProgress(bytes.byteLength);
                                });
                            })
                            // erase first 64 bytes up to RCALL written in the previous step
                            .then(function () {
                                var bytes = new Uint8Array(64).fill(0xFF);

                                return _4way.write(0, bytes).then(function () {
                                    return updateProgress(bytes.byteLength);
                                }).then(_4way.read.bind(_4way, 0, bytes.byteLength)).then(function (message) {
                                    if (!compare(bytes, message.params)) {
                                        throw new Error('Failed to verify erasure of first 64 bytes');
                                    }
                                    updateProgress(bytes.byteLength);
                                });
                            })
                            // write from 0x80 up to bootloader start
                            .then(function () {
                                var begin_address = 0x80,
                                    end_address = function () {
                                    var MCU = findMCU(escMetainfo.signature, self.state.supportedESCs.signatures.Atmel);

                                    switch (escMetainfo.interfaceMode) {
                                        case _4way_modes.AtmBLB:
                                            return MCU.flash_size - BLHELI_ATMEL_BLB_SIZE;
                                        case _4way_modes.AtmSK:
                                            return MCU.flash_size - BLHELI_ATMEL_SK_SIZE;
                                        default:
                                            throw Error('unknown interfaceMode ' + escMetainfo.interfaceMode);
                                    }
                                }(),
                                    write_step = isSimonK ? 0x40 : 0x100,
                                    verify_step = 0x80,
                                    promise = Q();

                                // write

                                var _loop = function _loop() {
                                    end = Math.min(address + write_step, end_address);
                                    write_address = address;

                                    var bytesToWrite = end - address;

                                    if (isSimonK) {
                                        if (address === begin_address) {
                                            write_address /= 2;
                                        } else {
                                            // SimonK bootloader will continue from the last address where we left off
                                            write_address = 0xFFFF;
                                        }
                                    }

                                    promise = promise.then(_4way.write.bind(_4way, write_address, flashImage.subarray(address, end))).then(function (message) {
                                        updateProgress(bytesToWrite);
                                    });
                                };

                                for (var address = begin_address; address < end_address; address += write_step) {
                                    var end, write_address;

                                    _loop();
                                }

                                // verify

                                var _loop2 = function _loop2(_address) {
                                    bytesToRead = Math.min(_address + verify_step, end_address) - _address;
                                    read_address = _address;


                                    if (isSimonK) {
                                        if (_address === begin_address) {
                                            // Word addressing for flash with SimonK bootloader
                                            read_address /= 2;
                                        } else {
                                            // SimonK bootloader will continue from the last address where we left off
                                            read_address = 0xFFFF;
                                        }
                                    }

                                    promise = promise.then(_4way.read.bind(_4way, read_address, bytesToRead)).then(function (message) {
                                        if (!compare(message.params, flashImage.subarray(_address, _address + message.params.byteLength))) {
                                            throw new Error('Failed to verify write at address 0x' + _address.toString(0x10));
                                        }

                                        updateProgress(message.params.byteLength);
                                    });
                                };

                                for (var _address = begin_address; _address < end_address; _address += verify_step) {
                                    var bytesToRead, read_address;

                                    _loop2(_address);
                                }

                                return promise;
                            })
                            // write 128 remaining bytes
                            .then(function () {
                                // @todo combine
                                if (isSimonK) {
                                    return _4way.write(0, flashImage.subarray(0, 0x40)).then(function (message) {
                                        updateProgress(0x40);
                                    }).then(_4way.write.bind(_4way, 0xFFFF, flashImage.subarray(0x40, 0x80))).then(function (message) {
                                        updateProgress(0x40);
                                    }).then(_4way.read.bind(_4way, 0, 0x80)).then(function (message) {
                                        if (!compare(message.params, flashImage.subarray(0, 0x80))) {
                                            throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10));
                                        }

                                        updateProgress(message.params.byteLength);
                                    });
                                } else {
                                    return _4way.write(0, flashImage.subarray(0, 0x80)).then(function (message) {
                                        updateProgress(0x80);
                                    }).then(_4way.read.bind(_4way, 0, 0x80)).then(function (message) {
                                        if (!compare(message.params, flashImage.subarray(message.address, message.address + message.params.byteLength))) {
                                            throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10));
                                        }

                                        updateProgress(message.params.byteLength);
                                    });
                                }
                            })
                            // write EEprom changes
                            .then(function () {
                                var eeprom = new Uint8Array(BLHELI_ATMEL_EEPROM_SIZE),
                                    beginAddress = 0,
                                    endAddress = 0x200,
                                    step = 0x80,
                                    promise = Q();

                                // read whole EEprom

                                var _loop3 = function _loop3(address) {
                                    var cmdAddress = address === beginAddress || !isSimonK ? address : 0xFFFF;

                                    promise = promise.then(_4way.readEEprom.bind(_4way, cmdAddress, step)).then(function (message) {
                                        return eeprom.set(message.params, address);
                                    });
                                };

                                for (var address = beginAddress; address < endAddress; address += step) {
                                    _loop3(address);
                                }

                                // write differing bytes
                                return promise.then(function () {
                                    var promise = Q(),
                                        max_bytes_per_write = isSimonK ? 0x40 : 0x100;

                                    // write only changed bytes for Atmel
                                    for (var pos = 0; pos < eeprom.byteLength; ++pos) {
                                        var offset = pos;

                                        // find the longest span of modified bytes
                                        while (eeprom[pos] != eepromImage[pos] && pos - offset <= max_bytes_per_write) {
                                            ++pos;
                                        }

                                        // byte unchanged, continue
                                        if (offset == pos) {
                                            continue;
                                        }

                                        // write span
                                        promise = promise.then(_4way.writeEEprom.bind(_4way, offset, eepromImage.subarray(offset, pos)));
                                    }

                                    return promise;
                                });
                            });
                        };

                        flashSiLabsBLB = function flashSiLabsBLB(message) {
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
                            .then(writePage.bind(undefined, 0x0D));
                        };

                        selectInterfaceAndFlash = function selectInterfaceAndFlash(message) {
                            var interfaceMode = message.params[3];
                            escMetainfo.interfaceMode = interfaceMode;

                            switch (interfaceMode) {
                                case _4way_modes.SiLBLB:
                                    return flashSiLabsBLB(message);
                                case _4way_modes.AtmBLB:
                                case _4way_modes.AtmSK:
                                    return flashAtmel(message);
                                default:
                                    throw new Error('Flashing with interface mode ' + interfaceMode + ' is not yet implemented');
                            }
                        };

                        updateProgress = function updateProgress(bytes) {
                            bytes_processed += bytes;
                            notifyProgress(Math.min(Math.ceil(100 * bytes_processed / bytes_to_process), 100));
                        };

                        isAtmel = [_4way_modes.AtmBLB, _4way_modes.AtmSK].includes(escMetainfo.interfaceMode), self = this;

                        // rough estimate, each location gets erased, written and verified at least once
                        // SimonK does not erase pages, hence the factor of 2

                        bytes_to_process = flashImage.byteLength * (isAtmel ? 2 : 3), bytes_processed = 0;

                        // start the actual flashing process

                        _context7.next = 16;
                        return regeneratorRuntime.awrap(_4way.initFlash(escIndex));

                    case 16:
                        initFlashResponse = _context7.sent;
                        _context7.next = 19;
                        return regeneratorRuntime.awrap(selectInterfaceAndFlash(initFlashResponse));

                    case 19:
                        if (!isAtmel) {
                            _context7.next = 25;
                            break;
                        }

                        _context7.next = 22;
                        return regeneratorRuntime.awrap(_4way.readEEprom(0, BLHELI_LAYOUT_SIZE));

                    case 22:
                        settingsArray = _context7.sent.params;
                        _context7.next = 28;
                        break;

                    case 25:
                        _context7.next = 27;
                        return regeneratorRuntime.awrap(_4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE));

                    case 27:
                        settingsArray = _context7.sent.params;

                    case 28:
                        // migrate settings from previous version if asked to
                        newSettings = blheliSettingsObject(settingsArray);

                        // ensure mode match

                        if (!(newSettings.MODE === escSettings.MODE)) {
                            _context7.next = 46;
                            break;
                        }

                        // find intersection between newSettings and escSettings with respect to their versions
                        for (prop in newSettings) {
                            if (newSettings.hasOwnProperty(prop) && escSettings.hasOwnProperty(prop) && blheliCanMigrate(prop, escSettings, newSettings)) {
                                newSettings[prop] = escSettings[prop];
                            }
                        }

                        allSettings = self.state.escSettings.slice();

                        allSettings[escIndex] = newSettings;
                        self.onUserInput(allSettings);

                        GUI.log(chrome.i18n.getMessage('writeSetupStarted'));

                        _context7.prev = 35;
                        _context7.next = 38;
                        return regeneratorRuntime.awrap(self.writeSetupImpl(escIndex));

                    case 38:
                        GUI.log(chrome.i18n.getMessage('writeSetupFinished'));
                        _context7.next = 44;
                        break;

                    case 41:
                        _context7.prev = 41;
                        _context7.t0 = _context7['catch'](35);

                        GUI.log(chrome.i18n.getMessage('writeSetupFailed', [_context7.t0.message]));

                    case 44:
                        _context7.next = 49;
                        break;

                    case 46:
                        GUI.log('Will not write settings back due to different MODE\n');

                        // read settings back
                        _context7.next = 49;
                        return regeneratorRuntime.awrap(self.readSetup());

                    case 49:
                    case 'end':
                        return _context7.stop();
                }
            }
        }, null, this, [[35, 41]]);
    },
    selectFirmwareForFlashAll: function selectFirmwareForFlashAll() {
        // Get indices of all available ESCs
        var escsToFlash = this.state.escMetainfo.map(function (info, idx) {
            return info.available ? idx : undefined;
        }).filter(function (_) {
            return _ !== undefined;
        });

        this.setState({
            selectingFirmware: true,
            escsToFlash: escsToFlash
        });
    },
    flashAll: function flashAll(hex, eep) {
        var _this4 = this;

        var firstAvailableMetainfo, interfaceMode, signature, isAtmel, flashSize, flash, eeprom, MCU, firstBytes, ljmpReset, _MCU2, i, escIndex, escSettings, escMetainfo, startTimestamp, elapsedSec;

        return regeneratorRuntime.async(function flashAll$(_context8) {
            while (1) {
                switch (_context8.prev = _context8.next) {
                    case 0:
                        $('a.connect').addClass('disabled');

                        this.setState({ isFlashing: true });

                        firstAvailableMetainfo = this.state.escMetainfo[this.state.escsToFlash[0]], interfaceMode = firstAvailableMetainfo.interfaceMode, signature = firstAvailableMetainfo.signature, isAtmel = [_4way_modes.AtmBLB, _4way_modes.AtmSK].includes(interfaceMode);

                        flashSize = function () {
                            switch (interfaceMode) {
                                case _4way_modes.SiLC2:
                                    return BLHELI_SILABS_FLASH_SIZE;
                                case _4way_modes.SiLBLB:
                                    {
                                        var MCU = findMCU(signature, _this4.state.supportedESCs.signatures[BLHELI_TYPES.BLHELI_S_SILABS]) || findMCU(signature, _this4.state.supportedESCs.signatures.SiLabs);
                                        return MCU.flash_size;
                                    }
                                case _4way_modes.AtmBLB:
                                case _4way_modes.AtmSK:
                                    {
                                        var _MCU = findMCU(signature, _this4.state.supportedESCs.signatures.Atmel);
                                        return _MCU.flash_size;
                                    }
                                default:
                                    throw Error('unknown interfaceMode ' + interfaceMode);
                            }
                        }();

                        _context8.prev = 4;
                        _context8.t0 = fillImage;
                        _context8.next = 8;
                        return regeneratorRuntime.awrap(parseHex(hex));

                    case 8:
                        _context8.t1 = _context8.sent;
                        _context8.t2 = flashSize;
                        flash = (0, _context8.t0)(_context8.t1, _context8.t2);

                        if (!eep) {
                            _context8.next = 18;
                            break;
                        }

                        _context8.t3 = fillImage;
                        _context8.next = 15;
                        return regeneratorRuntime.awrap(parseHex(eep));

                    case 15:
                        _context8.t4 = _context8.sent;
                        _context8.t5 = BLHELI_ATMEL_EEPROM_SIZE;
                        eeprom = (0, _context8.t3)(_context8.t4, _context8.t5);

                    case 18:
                        if (isAtmel) {
                            _context8.next = 26;
                            break;
                        }

                        // Check pseudo-eeprom page for BLHELI signature
                        MCU = buf2ascii(flash.subarray(BLHELI_SILABS_EEPROM_OFFSET).subarray(BLHELI_LAYOUT.MCU.offset).subarray(0, BLHELI_LAYOUT.MCU.size));
                        // Check instruction at the start of address space

                        firstBytes = flash.subarray(0, 3);
                        ljmpReset = new Uint8Array([0x02, 0x19, 0xFD]);

                        // BLHeli_S uses #BLHELI$.
                        // @todo add additional sanitize here to prevent user from flashing BLHeli_S on BLHeli ESC and vice versa

                        if (!(!(MCU.includes('#BLHELI#') || MCU.includes('#BLHELI$')) || !compare(firstBytes, ljmpReset))) {
                            _context8.next = 24;
                            break;
                        }

                        throw new Error(chrome.i18n.getMessage('hexInvalidSiLabs'));

                    case 24:
                        _context8.next = 29;
                        break;

                    case 26:
                        // @todo check first 2 bytes of flash as well

                        _MCU2 = buf2ascii(eeprom.subarray(BLHELI_LAYOUT.MCU.offset).subarray(0, BLHELI_LAYOUT.MCU.size));

                        if (_MCU2.includes('#BLHELI#')) {
                            _context8.next = 29;
                            break;
                        }

                        throw new Error('EEP does not look like a valid Atmel BLHeli EEprom file');

                    case 29:
                        i = 0;

                    case 30:
                        if (!(i < this.state.escsToFlash.length)) {
                            _context8.next = 52;
                            break;
                        }

                        escIndex = this.state.escsToFlash[i];


                        GUI.log(chrome.i18n.getMessage('escFlashingStarted', [escIndex + 1]));
                        escSettings = this.state.escSettings[escIndex], escMetainfo = this.state.escMetainfo[escIndex];


                        this.setState({
                            flashingEscIndex: escIndex,
                            flashingEscProgress: 0
                        });

                        _context8.prev = 35;
                        startTimestamp = Date.now();
                        _context8.next = 39;
                        return regeneratorRuntime.awrap(this.flashFirmwareImpl(escIndex, escSettings, escMetainfo, flash, eeprom, function (progress) {
                            _this4.setState({ flashingEscProgress: progress });
                        }));

                    case 39:
                        elapsedSec = (Date.now() - startTimestamp) * 1.0e-3;

                        GUI.log(chrome.i18n.getMessage('escFlashingFinished', [escIndex + 1, elapsedSec]));
                        googleAnalytics.sendEvent('ESC', 'FlashingFinished', 'After', elapsedSec.toString());
                        _context8.next = 48;
                        break;

                    case 44:
                        _context8.prev = 44;
                        _context8.t6 = _context8['catch'](35);

                        GUI.log(chrome.i18n.getMessage('escFlashingFailed', [escIndex + 1, _context8.t6.stack]));
                        googleAnalytics.sendEvent('ESC', 'FlashingFailed', 'Error', _context8.t6.stack);

                    case 48:

                        this.setState({
                            flashingEscIndex: undefined,
                            flashingEscProgress: 0
                        });

                    case 49:
                        ++i;
                        _context8.next = 30;
                        break;

                    case 52:
                        _context8.next = 58;
                        break;

                    case 54:
                        _context8.prev = 54;
                        _context8.t7 = _context8['catch'](4);

                        GUI.log(chrome.i18n.getMessage('flashingFailedGeneral', [_context8.t7.stack]));
                        googleAnalytics.sendEvent('ESC', 'FirmwareValidationFailed', 'Error', _context8.t7.stack);

                    case 58:

                        this.setState({ isFlashing: false });

                        $('a.connect').removeClass('disabled');

                    case 60:
                    case 'end':
                        return _context8.stop();
                }
            }
        }, null, this, [[4, 54], [35, 44]]);
    },
    handleIgnoreMCULayout: function handleIgnoreMCULayout(e) {
        this.setState({
            ignoreMCULayout: e.target.checked
        });
    },
    render: function render() {
        if (!this.state.supportedESCs || !this.state.firmwareVersions) return null;

        return React.createElement(
            'div',
            { className: 'tab-esc toolbar_fixed_bottom' },
            React.createElement(
                'div',
                { className: 'content_wrapper' },
                React.createElement(
                    'div',
                    { className: 'note' },
                    React.createElement(
                        'div',
                        { className: 'note_spacer' },
                        React.createElement('p', { dangerouslySetInnerHTML: { __html: chrome.i18n.getMessage('escFeaturesHelp') } })
                    )
                ),
                this.renderContent()
            ),
            React.createElement(
                'div',
                { className: 'content_toolbar' },
                React.createElement(
                    'div',
                    { className: 'btn log_btn' },
                    React.createElement(
                        'a',
                        {
                            href: '#',
                            onClick: this.saveLog
                        },
                        chrome.i18n.getMessage('escButtonSaveLog')
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'btn' },
                    React.createElement(
                        'a',
                        {
                            href: '#',
                            className: !this.state.selectingFirmware && !this.state.isFlashing && this.state.canRead ? "" : "disabled",
                            onClick: this.readSetup
                        },
                        chrome.i18n.getMessage('escButtonRead')
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'btn' },
                    React.createElement(
                        'a',
                        {
                            href: '#',
                            className: !this.state.selectingFirmware && !this.state.isFlashing && this.state.canWrite ? "" : "disabled",
                            onClick: this.writeSetup
                        },
                        chrome.i18n.getMessage('escButtonWrite')
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'btn' },
                    React.createElement(
                        'a',
                        {
                            href: '#',
                            className: !this.state.selectingFirmware && !this.state.isFlashing && this.state.canFlash ? "" : "disabled",
                            onClick: this.selectFirmwareForFlashAll
                        },
                        chrome.i18n.getMessage('escButtonFlashAll')
                    )
                ),
                React.createElement(
                    'div',
                    { className: this.state.canResetDefaults ? "btn" : "hidden" },
                    React.createElement(
                        'a',
                        {
                            href: '#',
                            className: !this.state.selectingFirmware && !this.state.IsFlashing && this.state.canWrite ? "" : "disabled",
                            onClick: this.resetDefaults
                        },
                        chrome.i18n.getMessage('resetDefaults')
                    )
                )
            )
        );
    },
    renderContent: function renderContent() {
        var noneAvailable = !this.state.escMetainfo.some(function (info) {
            return info.available;
        });
        if (noneAvailable) {
            return null;
        }

        return React.createElement(
            'div',
            null,
            this.renderWrappers()
        );
    },
    renderWrappers: function renderWrappers() {
        if (this.state.selectingFirmware) {
            var firstAvailableIndex = this.state.escsToFlash[0];
            var firstAvailableMetainfo = this.state.escMetainfo[firstAvailableIndex];
            var firstAvailableEsc = this.state.escSettings[firstAvailableIndex];

            return [React.createElement(
                'div',
                { className: 'checkbox' },
                React.createElement(
                    'label',
                    null,
                    React.createElement('input', {
                        type: 'checkbox',
                        onChange: this.handleIgnoreMCULayout,
                        checked: this.state.ignoreMCULayout
                    }),
                    React.createElement(
                        'span',
                        null,
                        chrome.i18n.getMessage('escIgnoreInappropriateMCULayout'),
                        React.createElement(
                            'span',
                            {
                                className: this.state.ignoreMCULayout ? 'red' : 'hidden'
                            },
                            chrome.i18n.getMessage('escIgnoreInappropriateMCULayoutWarning')
                        )
                    )
                )
            ), React.createElement(FirmwareSelector, {
                supportedESCs: this.state.supportedESCs,
                firmwareVersions: this.state.firmwareVersions,
                signatureHint: firstAvailableMetainfo.signature,
                escHint: firstAvailableEsc.LAYOUT,
                modeHint: blheliModeToString(firstAvailableEsc.MODE),
                onFirmwareLoaded: this.onFirmwareLoaded,
                onCancel: this.onFirmwareSelectorCancel
            })];
        }

        return React.createElement(
            'div',
            null,
            React.createElement(
                'div',
                { className: 'leftWrapper common-config' },
                this.renderCommonSettings()
            ),
            React.createElement(
                'div',
                { className: 'rightWrapper individual-config' },
                this.renderIndividualSettings()
            )
        );
    },
    renderCommonSettings: function renderCommonSettings() {
        return React.createElement(CommonSettings, {
            escSettings: this.state.escSettings,
            escMetainfo: this.state.escMetainfo,
            supportedESCs: this.state.supportedESCs,
            onUserInput: this.onUserInput
        });
    },
    renderIndividualSettings: function renderIndividualSettings() {
        var _this5 = this;

        return this.state.escMetainfo.map(function (info, idx) {
            if (!info.available) {
                return null;
            }

            return React.createElement(IndividualSettings, {
                escIndex: idx,
                escSettings: _this5.state.escSettings,
                escMetainfo: _this5.state.escMetainfo,
                supportedESCs: _this5.state.supportedESCs,
                onUserInput: _this5.onUserInput,
                canFlash: !_this5.state.isFlashing,
                isFlashing: _this5.state.flashingEscIndex === idx,
                progress: _this5.state.flashingEscProgress,
                onFlash: _this5.flashOne
            });
        });
    },
    onFirmwareLoaded: function onFirmwareLoaded(hex, eep) {
        this.setState({
            selectingFirmware: false
        });

        this.flashAll(hex, eep);
    },
    onFirmwareSelectorCancel: function onFirmwareSelectorCancel() {
        this.setState({
            selectingFirmware: false
        });
    }
});
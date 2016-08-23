'use strict';

TABS.esc = {
    esc_settings: [],
    esc_metainfo: [],
    ignore_inappropriate_mcu_layout: false
};

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

        var individualConfigDiv = $('.tab-esc .content_wrapper .individual-config'),
            individualConfigTemplate = individualConfigDiv.find('.template');

        // create tabs for individual ESC parameters
        for (var i = 0; i < ESC_CONFIG.connectedESCs; ++i) {
            var escBox = individualConfigTemplate.clone();

            escBox.css('display', '').removeClass('template').addClass('esc-' + i).addClass(i % 2 ? 'quarterRight' : 'quarterLeft');
            escBox.find('.escNumber').text('ESC ' + (i + 1));
            escBox.appendTo(individualConfigDiv);

            $('select,input,a', escBox).data('esc', i);

            self.esc_settings.push({});
            self.esc_metainfo.push({ available: false });
        }

        var commonConfigContext = $('.common-config');

        // Add UI handlers
        $('input[type="checkbox"]', commonConfigContext).change(function() {
            var element = $(this),
                val = Number(element.is(':checked')),
                name = this.id;

            self.esc_settings.forEach(function(settings) {
                settings[BLHELI_LAYOUT[name].offset] = val;
            });
        });

        $('input[type="number"]', commonConfigContext).change(function() {
            var element = $(this),
                step = parseFloat(element.prop('step')),
                val = parseFloat(element.val()),
                name = this.id;

            self.esc_settings.forEach(function(settings) {
                settings[BLHELI_LAYOUT[name].offset] = val;
            });
        });

        $('select', commonConfigContext).change(function() {
            var element = $(this),
                val = element.val(),
                name = this.id;

            self.esc_settings.forEach(function(settings) {
                settings[BLHELI_LAYOUT[name].offset] = val;
            });

            // @todo extract to special handlers
            if (name == 'GOVERNOR_MODE') {
                if (val == 4) {
                    $('#P_GAIN').parent().parent().hide();
                    $('#I_GAIN').parent().parent().hide();
                } else {
                    $('#P_GAIN').parent().parent().show();
                    $('#I_GAIN').parent().parent().show();
                }
            }
        });

        $('select', individualConfigDiv).change(function() {
            var element = $(this),
                escIdx = element.data('esc'),
                name = this.id,
                val = element.val();

            self.esc_settings[escIdx][BLHELI_LAYOUT[name].offset] = val;

            // @todo extract to special handlers
            if (name == 'MOTOR_DIRECTION') {
                var ppm_center_element = element.parent().parent().siblings().find('#PPM_CENTER_THROTTLE').parent().parent()
                if (val == 3 || val == 4) {
                    ppm_center_element.show();
                } else {
                    ppm_center_element.hide();
                }
            }
        });

        // @todo add logic for spreading PPM_MIN_THROTTLE and PPM_MAX_THROTTLE 500us apart
        $('input[type="number"]', individualConfigDiv).change(function() {
            var element = $(this),
                escIdx = element.data('esc'),
                name = this.id,
                multiplier = element.data('multiplier'),
                offset = element.data('offset'),
                val = Math.floor((element.val() - offset) / multiplier);

            // round down to multiple
            element.val(val * multiplier + offset);
            self.esc_settings[escIdx][BLHELI_LAYOUT[name].offset] = val;
        });

        // reading ESC setup from FC too fast fails spuriously, add a small delay
        GUI.timeout_add('allow_read', () => {
            $('a.read').removeClass('disabled')
        }, 1500)

        // add button handlers
        $('a.write').click(write_settings);
        $('a.read').click(read_settings);
        $('a.flash').click(flash_firmware);

        $('#ignore_inappropriate_mcu_layout').change(function() {
            var element = $(this),
                val = Number(element.is(':checked'))

            self.ignore_inappropriate_mcu_layout = val
        })

        GUI.content_ready(callback);
    }

    // @todo combine
    // Read setting(s), uses ReadEEprom for Atmel and Read for SiLabs
    function read_eeprom_impl(interface_mode, address, bytesToRead) {
        // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
        var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interface_mode)

        if (isSiLabs) {
            return _4way.read(BLHELI_SILABS_EEPROM_OFFSET + address, bytesToRead)
        } else {
            return _4way.readEEprom(address, bytesToRead)
        }
    }

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

    function write_settings() {
        $('a.write, a.read, a.flash').addClass('disabled')

        write_settings_impl()
        .then(() => {
            self.print('Settings written')

            // settings readback
            read_settings()
        })
        .done()
    }

    function write_settings_impl() {
        var promise = Q()

        for (let esc = 0; esc < self.esc_settings.length; ++esc) {
            if (!self.esc_metainfo[esc].available) {
               self.print('ESC ' + (esc + 1) + ' was not connected, skipping.')
               continue;
            }

            promise = promise
            // Ask 4way interface to initialize target ESC for flashing
            .then(_4way.initFlash.bind(_4way, esc))
            // Remember interface mode and read settings
            .then(message => {
                var interface_mode = message.params[3]

                // remember interface mode for ESC
                self.esc_metainfo[esc].interface_mode = interface_mode

                // read everything in one big chunk to check if any settings have changed
                return read_eeprom_impl(interface_mode, 0, BLHELI_LAYOUT_SIZE)
            })
            // Check for changes and perform write
            .then(message => {
                var esc_settings = self.esc_settings[esc],
                    readback_settings = message.params

                // check for unexpected size mismatch
                if (esc_settings.byteLength != readback_settings.byteLength) {
                    throw new Error('byteLength of buffers do not match')
                }

                // check for actual changes, maybe we should not write to this ESC at all
                // @todo BLHeliSuite writes only hanged values to Atmel EEPROM, probably there's a reason for it
                if (compare(esc_settings, readback_settings)) {
                    self.print('ESC ' + (esc + 1) + ': no changes')
                    return
                }

                var interface_mode = self.esc_metainfo[esc].interface_mode,
                    isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interface_mode),
                    promise = Q()

                // should erase page to 0xFF on SiLabs before writing
                if (isSiLabs) {
                    promise = promise
                    .then(_4way.pageErase.bind(_4way, BLHELI_SILABS_EEPROM_OFFSET / BLHELI_SILABS_PAGE_SIZE))
                    // actual write
                    .then(_4way.write.bind(_4way, BLHELI_SILABS_EEPROM_OFFSET, esc_settings))
                } else {
                    // write only changed bytes for Atmel
                    for (var pos = 0; pos < esc_settings.byteLength; ++pos) {
                        var offset = pos

                        // find the longest span of modified bytes
                        while (esc_settings[pos] != readback_settings[pos]) {
                            ++pos
                        }

                        // byte unchanged, continue
                        if (offset == pos) {
                            continue
                        }

                        // write span
                        promise = promise
                        .then(_4way.writeEEprom.bind(_4way, offset, esc_settings.subarray(offset, pos)))
                    }
                }

                promise = promise
                // readback
                .then(() => {
                    return read_eeprom_impl(interface_mode, 0, BLHELI_LAYOUT_SIZE)
                })
                // verify
                .then(message => {
                    if (!compare(esc_settings, message.params)) {
                        throw new Error('Failed to verify settings')
                    }
                })

                return promise
            })
            .catch(error => {
                self.print('ESC ' + (esc + 1) + ', failed to write settings: ' + error.message)
            })
        }

        return promise
    }

    function read_settings() {
        $('a.read, a.write, a.flash').addClass('disabled')

        read_settings_impl()
        .then(() => {
            // @todo check agreement between ESC settings
            var first_esc_available = self.esc_metainfo.findIndex(function(item) {
                return item.available
            })

            update_settings_ui(first_esc_available)

            $('a.read').removeClass('disabled')
            if (first_esc_available != -1) {
                $('a.write').removeClass('disabled')
            }
        })
        .done()
    }

    function read_settings_impl() {
        var promise = Q()

        for (let esc = 0; esc < self.esc_settings.length; ++esc) {
            promise = promise
            // Ask 4way interface to initialize target ESC for flashing
            .then(_4way.initFlash.bind(_4way, esc))
            // Check interface mode and read settings
            .then(message => {
                var interface_mode = message.params[3]

                // remember interface mode for ESC
                self.esc_metainfo[esc].interface_mode = interface_mode

                // read everything in one big chunk
                return read_eeprom_impl(interface_mode, 0, BLHELI_LAYOUT_SIZE)
            })
            // Ensure MULTI mode and correct BLHeli version
            .then(message => {
                // Check whether revision is supported
                var esc_settings = message.params,
                    main_revision = esc_settings[0],
                    sub_revision = esc_settings[1],
                    layout_revision = esc_settings[2]

                // @todo Reflect following checks in the UI, allowing to flash but not alter settings of ESCs which have wrong/unsupported BLHeli version

                // BLHeli firmware sets these three bytes to 0 while flashing, so we can check if flashing has gone wrong
                if (main_revision == 0 && sub_revision == 0 && layout_revision == 0) {
                    self.print('ESC ' + (esc + 1) + ' is not flashed properly, all of (MAIN_REVISION, SUB_REVISION, LAYOUT_REVISION) are 0')
                }

                if (layout_revision < BLHELI_MIN_SUPPORTED_LAYOUT_REVISION) {
                    self.print('ESC ' + (esc + 1) + ' has LAYOUT_REVISION ' + layout_revision + ', oldest supported is ' + BLHELI_MIN_SUPPORTED_LAYOUT_REVISION)
                }

                // Check for MULTI mode
                // @todo replace with a DataView
                var mode = esc_settings.subarray(BLHELI_LAYOUT.MODE.offset, BLHELI_LAYOUT.MODE.offset + BLHELI_LAYOUT.MODE.size)
                    .reduce(function(sum, byte) { return (sum << 8) | byte; })
                if (mode != BLHELI_MODES.MULTI) {
                    self.print('ESC ' + (esc + 1) + ' has MODE different from MULTI: ' + mode.toString(0x10))
                }

                self.esc_settings[esc] = esc_settings
                self.esc_metainfo[esc].available = true
            })
            .catch(error => {
                self.esc_metainfo[esc].available = false
                self.print('ESC ' + (esc + 1) + ' read settings failed: ' + error.message)
            })
        }

        return promise
    }

    function update_settings_ui(first_esc_available) {
        if (first_esc_available !== -1) {
            var master_esc_settings = self.esc_settings[first_esc_available],
                layout_revision = master_esc_settings[BLHELI_LAYOUT.LAYOUT_REVISION.offset];

            // input[type=checkbox]
            [
                'PROGRAMMING_BY_TX', 'TEMPERATURE_PROTECTION', 'LOW_RPM_POWER_PROTECTION',
                'BRAKE_ON_STOP', 'PWM_INPUT'
            ].forEach(function(name) {
                var element= $('#' + name),
                    val = Number(element.is(':checked')),
                    setting = BLHELI_LAYOUT[name],
                    newVal = master_esc_settings[setting.offset];

                if (setting.since <= layout_revision && (!setting.until || layout_revision < setting.until)) {
                    element.parent().show();
                    if (val != newVal) {
                        element.trigger('click');
                    }
                } else {
                    element.parent().hide();
                }
            });

            // <select>, input[type=number]
            [
                'BEEP_STRENGTH', 'BEACON_STRENGTH', 'GOVERNOR_MODE',
                'P_GAIN', 'I_GAIN', 'MOTOR_GAIN', 'STARTUP_POWER',
                'PWM_DITHER', 'DEMAG_COMPENSATION', 'PWM_FREQUENCY',
                'COMMUTATION_TIMING', 'INPUT_PWM_POLARITY', 'BEACON_DELAY'
            ].forEach(function(name) {
                var element = $('#' + name),
                    val = element.val(),
                    setting = BLHELI_LAYOUT[name],
                    newVal = master_esc_settings[setting.offset];

                if (setting.since <= layout_revision && (!setting.until || layout_revision < setting.until)) {
                    element.parent().show();
                    element.prop('disabled', false);
                    if (val != newVal) {
                        element.val(newVal);
                    }
                } else {
                    element.parent().hide();
                }
            });

            // @todo refactor
            if (layout_revision < BLHELI_S_MIN_LAYOUT_REVISION) {
                var closedLoopOff = master_esc_settings[BLHELI_LAYOUT.GOVERNOR_MODE.offset] == 4;
                if (closedLoopOff) {
                    $('#P_GAIN').parent().parent().hide();
                    $('#I_GAIN').parent().parent().hide();
                } else {
                    $('#P_GAIN').parent().parent().show();
                    $('#I_GAIN').parent().parent().show();
                }
            }
        }

        // set individual values
        for (var i = 0; i < self.esc_settings.length; ++i) {
            var container = $('.esc-' + i),
                esc_settings = self.esc_settings[i],
                esc_metainfo = self.esc_metainfo[i];

            if (esc_metainfo.available) {
                [ 'MOTOR_DIRECTION', 'PPM_MIN_THROTTLE', 'PPM_MAX_THROTTLE', 'PPM_CENTER_THROTTLE' ]
                .forEach(function(name) {
                    var element = $('#' + name, container),
                        val = element.val(),
                        settingInfo = BLHELI_LAYOUT[name],
                        newVal = esc_settings[settingInfo.offset] * element.data('multiplier') + element.data('offset');

                    element.prop('disabled', false);
                    if (val != newVal) element.val(newVal);
                });

                // ugly hack to enable bidir reversed
                $('#MOTOR_DIRECTION', container).find(':nth-child(4)').prop('hidden', layout_revision < BLHELI_S_MIN_LAYOUT_REVISION);

                var layout_buf = esc_settings.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size),
                    name_buf = esc_settings.subarray(BLHELI_LAYOUT.NAME.offset, BLHELI_LAYOUT.NAME.offset + BLHELI_LAYOUT.NAME.size),
                    layout = buf2ascii(layout_buf).trim(),
                    name = buf2ascii(name_buf).trim(),
                    make = layout.length > 0 ? layout : 'EMPTY'

                if (esc_metainfo.interface_mode === _4way_modes.SiLBLB) {
                    if (BLHELI_SILABS_ESCS.hasOwnProperty(layout)) {
                        make = BLHELI_SILABS_ESCS[layout].name
                        $('a.flash', container).removeClass('disabled')
                    } else if (BLHELI_S_SILABS_ESCS.hasOwnProperty(layout)) {
                        make = BLHELI_S_SILABS_ESCS[layout].name
                        $('a.flash', container).removeClass('disabled')
                    } else {
                        $('a.flash', container).addClass('disabled')
                    }
                } else {
                    if (BLHELI_ATMEL_ESCS.hasOwnProperty(layout)) {
                        make = BLHELI_ATMEL_ESCS[layout].name
                    }
                    $('a.flash', container).addClass('disabled')
                }

                var title = make + ', ' + esc_settings[0] + '.' + esc_settings[1] + (name.length > 0 ? ', ' + name : '');

                container.find('.escInfo').text(title);

                var direction = esc_settings[BLHELI_LAYOUT.MOTOR_DIRECTION.offset],
                    bidirectional = direction === 3 || direction === 4,
                    ppm_center_element = container.find('#PPM_CENTER_THROTTLE').parent().parent()

                if (bidirectional) {
                    ppm_center_element.show();
                } else {
                    ppm_center_element.hide();
                }
            } else {
                container.find('.escInfo').text('NOT CONNECTED')
                $('a.flash', container).addClass('disabled')
            }
        }
    }

    function flash_firmware() {
        var button_e = $(this),
            progress_e = button_e.siblings('progress.progress'),
            escIdx = button_e.data('esc'),
            esc_settings = self.esc_settings[escIdx],
            esc_metainfo = self.esc_metainfo[escIdx],
            start_timestamp = Date.now(),
            is_atmel = [ _4way_modes.AtmBLB, _4way_modes.AtmSK ].includes(esc_metainfo.interface_mode)

        var flash_image, eeprom_image

        // rough estimate, each location gets erased, written and verified at least once
        var max_flash_size = is_atmel ? BLHELI_ATMEL_BLB_ADDRESS_8 : BLHELI_SILABS_ADDRESS_SPACE_SIZE,
            bytes_to_process = max_flash_size * 3,
            bytes_processed = 0

        // Disallow clicking again
        $('a.flash, a.connect').addClass('disabled')

        // Ask user to select HEX
        select_file('hex')
        .then(parse_hex)
        .then(data => {
            if (data) {
                self.print('Loaded local firmware: ' + data.bytes_total + ' bytes')
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
                        self.print('Loaded local EEprom: ' + data.bytes_total + 'bytes')
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
        // show progress bar
        .then(() => progress_e.val(0).show())
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
            on_finished()

            // ensure mode match
            if (compare(new_settings.subarray(offset, offset + 2), esc_settings.subarray(offset, offset + 2))) {
                self.print('Writing settings back\n');
                // copy changed settings
                var begin = BLHELI_LAYOUT.P_GAIN.offset,
                    end = BLHELI_LAYOUT.BRAKE_ON_STOP.offset + BLHELI_LAYOUT.BRAKE_ON_STOP.size;

                new_settings.set(esc_settings.subarray(begin, end), begin);

                // set settings as current
                self.esc_settings[escIdx] = new_settings;

                return write_settings()
            } else {
                self.print('Will not write settings back due to different MODE\n');

                // read settings back
                return read_settings()
            }
        })
        .catch(on_failed)
        .done()

        function update_progress(bytes) {
            bytes_processed += bytes;
            progress_e.val(Math.min(Math.ceil(100 * bytes_processed / bytes_to_process), 100));
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
                    self.print('Loading file from ' + path)

                    fileEntry.file(file => {
                        var reader = new FileReader

                        reader.onprogress = e => {
                            if (e.total > 32 * 1024) { // 32 KiB
                                deferred.reject('File size limit of 32 KiB exceeded')
                            }
                        }

                        reader.onloadend = e => {
                            if (e.total !== 0 && e.total === e.loaded) {
                                self.print('Loaded file ' + path)

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
                        self.print('Block at 0x' + block.address.toString(0x10) + ' of 0x' + block.bytes.toString(0x10) + ' bytes contains bootloader, skipping\n');
                    } else {
                        self.print('Block at 0x' + block.address.toString(0x10) + ' is outside of target address space\n');
                    }

                    return;
                }

                if (block.address + block.bytes >= image.byteLength) {
                    self.print('Block at 0x' + block.address.toString(0x10) + ' spans past the end of target address space\n');
                }

                // block.data may be too large, select maximum allowed size
                var clamped_length = Math.min(block.bytes, image.byteLength - block.address);
                image.set(block.data.slice(0, clamped_length), block.address);
            })

            return image
        }

        function select_interface(message) {
            var interface_mode = message.params[3]
            esc_metainfo.interface_mode = interface_mode

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
            var is_simonk = esc_metainfo.interface_mode === _4way_modes.AtmSK
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
            esc_settings = message.params;

            // @todo ask user if he wishes to continue

            // check LAYOUT
            var target_layout = esc_settings.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size),
                fw_layout = flash_image.subarray(BLHELI_SILABS_EEPROM_OFFSET).subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size);

            if (!compare(target_layout, fw_layout)) {
                var target_layout_str = buf2ascii(target_layout).trim();
                if (target_layout_str.length == 0) {
                    target_layout_str = 'EMPTY'
                }

                var msg = 'Target LAYOUT ' + target_layout_str + ' is different from HEX ' + buf2ascii(fw_layout).trim()
                if (self.ignore_inappropriate_mcu_layout) {
                    self.print(msg)
                } else {
                    throw new Error(msg)
                }
            }

            // check MCU, if it does not match there's either wrong HEX or corrupted ESC. Disallow for now
            var target_mcu = esc_settings.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size),
                fw_mcu = flash_image.subarray(BLHELI_SILABS_EEPROM_OFFSET).subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size);
            if (!compare(target_mcu, fw_mcu)) {
                var target_mcu_str = buf2ascii(target_mcu).trim();
                if (target_mcu_str.length == 0) {
                    target_mcu_str = 'EMPTY'
                }

                var msg = 'Target MCU ' + target_mcu_str + ' is different from HEX ' + buf2ascii(fw_mcu).trim()
                if (self.ignore_inappropriate_mcu_layout) {
                    self.print(msg)
                } else {
                    throw new Error(msg)
                }
            }

            // @todo check NAME for **FLASH*FAILED**
        }

        function write_eeprom_safeguard() {
            esc_settings.set(ascii2buf('**FLASH*FAILED**'), BLHELI_LAYOUT.NAME.offset)

            var promise = _4way.write(BLHELI_SILABS_EEPROM_OFFSET, esc_settings)
            .then(function(message) {
                return _4way.read(message.address, BLHELI_LAYOUT_SIZE)
            })
            .then(function(message) {
                if (!compare(esc_settings, message.params)) {
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

        function on_failed(error) {
            var elapsed_sec = (Date.now() - start_timestamp) * 1.0e-3

            self.print('Firmware flashing failed ' + (error ? ': ' + error.stack : ' ') + ' after ' + elapsed_sec + ' seconds');
            $('a.connect').removeClass('disabled')
            progress_e.hide();

            var first_esc_available = self.esc_metainfo.findIndex(function(item) {
                return item.available
            })

            update_settings_ui(first_esc_available)
        }

        function on_finished() {
            var elapsed_sec = (Date.now() - start_timestamp) * 1.0e-3

            self.print('Flashing firmware to ESC ' + (escIdx + 1) + ' finished in ' + elapsed_sec + ' seconds');
            $('a.flash, a.connect').removeClass('disabled')
            progress_e.hide();
        }
    }

    // ask the FC to switch into 4way interface mode
    MSP.send_message(MSP_codes.MSP_SET_4WAY_IF, null, null, load_html);
};

TABS.esc.cleanup = function (callback) {
    if (!CONFIGURATOR.connectionValid || !CONFIGURATOR.escActive) {
        if (callback) callback();
        return;
    }

    this.esc_settings = []
    this.esc_metainfo = []

    // tell 4-way interface to return control to MSP server
    _4way.exit()
    // now we can return control to MSP or CLI handlers
    .then(() => CONFIGURATOR.escActive = false)
    .done()

    if (callback) {
        GUI.timeout_add('waiting_4way_if_exit', callback, 100);
    }
};

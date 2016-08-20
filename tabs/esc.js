'use strict';

TABS.esc = {
    esc_settings: [],
    esc_metainfo: []
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

        // add button handlers
        $('a.write').click(write_settings);
        $('a.read').click(read_settings);
        $('a.flash').click(flash_firmware);

        GUI.content_ready(callback);
    }

    // @todo combine
    // Read setting(s), uses ReadEEprom for Atmel and Read for SiLabs
    function read_eeprom_impl(interface_mode, address, bytesToRead, callback) {
        // SiLabs has no separate EEPROM, but Atmel has and therefore requires a different read command
        var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interface_mode),
            obj = {
            command: isSiLabs ? _4way_commands.cmd_DeviceRead : _4way_commands.cmd_DeviceReadEEprom,
            address: isSiLabs ? BLHELI_SILABS_EEPROM_OFFSET + address : address,
            params: [ bytesToRead ],
            callback: callback
        };

        _4way.send(obj);
    }

    function write_eeprom_impl(interface_mode, address, bytes, callback) {
        var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interface_mode),
            obj = {
            command: isSiLabs ? _4way_commands.cmd_DeviceWrite : _4way_commands.cmd_DeviceWriteEEprom,
            address: isSiLabs ? BLHELI_SILABS_EEPROM_OFFSET + address : address,
            params: bytes,
            callback: callback
        };

        _4way.send(obj);
    }

    function write_settings() {
        $('a.write').addClass('disabled');
        $('a.read').addClass('disabled');

        write_settings_impl(0);
    }

    function write_settings_impl(escIdx) {
        if (escIdx >= self.esc_settings.length) {
            write_settings_complete();
            return;
        }

        if (!self.esc_metainfo[escIdx].available) {
            self.print('ESC ' + (escIdx + 1) + ' was not connected, skipping. Please `Read Settings` first\n');
            write_settings_impl(escIdx + 1);
            return;
        }

        _4way.send({
            command: _4way_commands.cmd_DeviceInitFlash,
            params: [ escIdx ],
            callback: on_init_flash
        });

        var interface_mode;

        // Tell 4way-if to initialize target ESC for flashing
        function on_init_flash(message) {
            if (message.ack == _4way_ack.ACK_D_GENERAL_ERROR) {
                // ESC may be unpowered or absent, continue
                self.print('ESC ' + (escIdx + 1) + ' is not connected\n');
                write_settings_impl(escIdx + 1);
                return;
            } else if (message.ack != _4way_ack.ACK_OK) {
                write_settings_failed(message);
                return;
            }

            // remember interface mode for ESC
            interface_mode = message.params[3];
            self.esc_metainfo[escIdx].interface_mode = interface_mode;

            self.print('ESC ' + (escIdx + 1) + ' signature: ' + message.params[1].toString(0x10) + message.params[0].toString(0x10) + '\n');

            // read everything in one big chunk to check if any settings have changed
            read_eeprom_impl(interface_mode, 0, BLHELI_LAYOUT_SIZE, check_for_changes);
        }

        function check_for_changes(message) {
            if (message.ack != _4way_ack.ACK_OK) {
                write_settings_failed(message);
                return;
            }

            var esc_settings = self.esc_settings[escIdx],
                readback_settings = message.params;

            // check for unexpected size mismatch
            if (esc_settings.byteLength != readback_settings.byteLength) {
                self.print('Flashing ESC ' + (escIdx + 1) + ' failed, byteLength of buffers does not match\n');
                write_settings_failed(message);
                return;
            }

            // check for actual changes, maybe we should not write to this ESC at all
            var has_changes = false;
            for (var i = 0; i < esc_settings.byteLength; ++i) {
                if (esc_settings[i] != readback_settings[i]) {
                    has_changes = true;
                    break;
                }
            }

            // @todo BLHeliSuite writes only hanged values to Atmel EEPROM, probably there's a reason for it
            if (has_changes) {
                var isSiLabs = [ _4way_modes.SiLC2, _4way_modes.SiLBLB ].includes(interface_mode);
                if (isSiLabs) {
                    erase_page();
                } else {
                    write_eeprom_impl(interface_mode, 0, esc_settings, on_written);
                }
            } else {
                self.print('ESC ' + (escIdx + 1) + ', no changes\n');
                write_settings_impl(escIdx + 1);
            }
        }

        function erase_page() {
            // All the supported SiLabs MCU ESCs have the same page size
            var pageNo = BLHELI_SILABS_EEPROM_OFFSET / BLHELI_SILABS_PAGE_SIZE;
            _4way.send({
                command: _4way_commands.cmd_DevicePageErase,
                params: [ pageNo ],
                callback: write
            });
        }

        function write(message) {
            if (message.ack != _4way_ack.ACK_OK) {
                write_settings_failed(message);
                return;
            }

            write_eeprom_impl(interface_mode, 0, self.esc_settings[escIdx], on_written);
        }

        function on_written(message) {
            if (message.ack != _4way_ack.ACK_OK) {
                write_settings_failed(message);
                return;
            }

            write_settings_impl(escIdx + 1);
        }
    }

    function write_settings_complete() {
        self.print('write_settings_complete\n');

        $('a.write').removeClass('disabled');
        $('a.read').removeClass('disabled');

        // settings readback
        read_settings();
    }

    function write_settings_failed(message) {
        self.print('write_settings_failed: ' + _4way_ack_to_string(message.ack) + '\n' + JSON.stringify(message) + '\n');

        $('a.write').removeClass('disabled');
        $('a.read').removeClass('disabled');
    }

    function read_settings() {
        $('a.read').addClass('disabled');
        $('a.write').addClass('disabled');

        read_settings_impl(0);
    }

    function read_settings_impl(escIdx) {
        if (escIdx >= self.esc_settings.length) {
            read_settings_complete();
            return;
        }

        _4way.send({
            command: _4way_commands.cmd_DeviceInitFlash,
            params: [ escIdx ],
            callback: on_init_flash
        });

        // Tell 4way-if to initialize target ESC for flashing
        function on_init_flash(message) {
            if (message.ack == _4way_ack.ACK_D_GENERAL_ERROR) {
                // ESC may be unpowered or absent, continue
                self.esc_metainfo.available = false;
                read_settings_impl(escIdx + 1);
                return;
            } else if (message.ack != _4way_ack.ACK_OK) {
                read_settings_failed(message);
                return;
            }

            // remember interface mode for ESC
            var interface_mode = message.params[3];
            self.esc_metainfo[escIdx].interface_mode = interface_mode;

            // read everything in one big chunk
            read_eeprom_impl(interface_mode, 0, BLHELI_LAYOUT_SIZE, check_revision);
        }

        // Ensure revisions match
        function check_revision(message) {
            if (message.ack != _4way_ack.ACK_OK) {
                read_settings_failed(message);
                return;
            }

            // Check whether revision is supported
            var buf = message.params,
                main_revision = buf[0],
                sub_revision = buf[1],
                layout_revision = buf[2];

            // BLHeli firmware sets these three bytes to 0 while flashing, so we can check if flashing has gone wrong
            if (main_revision == 0 && sub_revision == 0 && layout_revision == 0) {
                self.print('ESC ' + (escIdx + 1) + ' is not flashed properly, all of (MAIN_REVISION, SUB_REVISION, LAYOUT_REVISION) are 0\n');
            }

            if (layout_revision < BLHELI_MIN_SUPPORTED_LAYOUT_REVISION) {
                self.print('ESC ' + (escIdx + 1) + ' has LAYOUT_REVISION ' + layout_revision + ', oldest supported is ' + BLHELI_MIN_SUPPORTED_LAYOUT_REVISION + '\n');
            }

            // Check for MULTI mode
            var mode = buf.subarray(BLHELI_LAYOUT.MODE.offset, BLHELI_LAYOUT.MODE.offset + BLHELI_LAYOUT.MODE.size)
                .reduce(function(sum, byte) { return (sum << 8) | byte; });
            if (mode != BLHELI_MODES.MULTI) {
                self.print('ESC ' + (escIdx + 1) + ' has MODE different from MULTI: ' + mode.toString(0x10) + '\n');
            }

            self.esc_settings[escIdx] = buf;
            self.esc_metainfo[escIdx].available = true;

            // Continue with remaining ESCs
            read_settings_impl(escIdx + 1);
        }
    }

    function read_settings_complete() {
        // @todo check agreement between ESC settings
        var first_esc_available = self.esc_metainfo.findIndex(function(item) {
            return item.available;
        });

        fill_settings_ui(first_esc_available);

        $('a.read').removeClass('disabled');
        if (first_esc_available != -1) {
            $('a.write').removeClass('disabled');
        }
    }

    function read_settings_failed(message) {
        self.print('read_settings_failed: ' + _4way_ack_to_string(message.ack) + '\n' + JSON.stringify(message) + '\n');

        $('a.read').removeClass('disabled');
        $('a.flash').addClass('disabled');
    }

    function fill_settings_ui(first_esc_available) {
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
            esc_metainfo = self.esc_metainfo[escIdx];

        var intel_hex, parsed_hex, memory_image;

        // rough estimate, each location gets erased, written and verified at least once
        var bytes_to_process = BLHELI_SILABS_ADDRESS_SPACE_SIZE * 3,
            bytes_processed = 0;

        function update_progress(bytes) {
            bytes_processed += bytes;
            progress_e.val(Math.min(Math.ceil(100 * bytes_processed / bytes_to_process), 100));
        }

        function parse_hex(str, callback) {
            // parsing hex in different thread
            var worker = new Worker('./js/workers/hex_parser.js');

            // "callback"
            worker.onmessage = function (event) {
                callback(event.data);
            };

            // send data/string over for processing
            worker.postMessage(str);
        }

        function select_file() {
            // Open file dialog
            chrome.fileSystem.chooseEntry({
                type: 'openFile',
                accepts: [ { extensions: ['hex'] } ]
            }, function (fileEntry) {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);

                    return;
                }

                // Disallow clicking again
                $('a.flash').addClass('disabled');
                progress_e.val(0).show();

                chrome.fileSystem.getDisplayPath(fileEntry, function (path) {
                    console.log('Loading file from: ' + path);

                    fileEntry.file(function (file) {
                        var reader = new FileReader();

                        reader.onprogress = function (e) {
                            if (e.total > 32 * 1024) { // 32 KiB
                                console.log('File limit (32 KiB) exceeded, aborting');
                                reader.abort();
                            }
                        };

                        reader.onloadend = function(e) {
                            if (e.total != 0 && e.total == e.loaded) {
                                console.log('File loaded');

                                intel_hex = e.target.result;

                                parse_hex(intel_hex, function (data) {
                                    parsed_hex = data;

                                    if (parsed_hex) {
                                        self.print('Loaded Local Firmware: (' + parsed_hex.bytes_total + ' bytes)\n');
                                        fill_memory_image();
                                    } else {
                                        self.print('Hex file corrupted\n');
                                        on_failed();
                                    }
                                });
                            } else {
                                on_failed();
                            }
                        };

                        reader.readAsText(file);
                    });
                });
            });
        }

        // Fills a memory image of ESC MCU's address space with target firmware
        function fill_memory_image() {
            memory_image = new Uint8Array(BLHELI_SILABS_ADDRESS_SPACE_SIZE);
            memory_image.fill(0xFF);

            parsed_hex.data.forEach(function(block) {
                // Check preconditions
                if (block.address >= memory_image.byteLength) {
                    if (block.address == BLHELI_SILABS_BOOTLOADER_ADDRESS) {
                        self.print('Block at 0x' + block.address.toString(0x10) + ' of 0x' + block.bytes.toString(0x10) + ' bytes contains bootloader, skipping\n');
                    } else {
                        self.print('Block at 0x' + block.address.toString(0x10) + ' is outside of target address space\n');
                    }

                    return;
                }

                if (block.address + block.bytes >= memory_image.byteLength) {
                    self.print('Block at 0x' + block.address.toString(0x10) + ' spans past the end of target address space\n');
                }

                // block.data may be too large, select maximum allowed size
                var clamped_length = Math.min(block.bytes, memory_image.byteLength - block.address);
                memory_image.set(block.data.slice(0, clamped_length), block.address);
            });

            // start the actual flashing process
            // @todo implement Atmel flashing
            flash_silabs_impl();
        }

        // Whole ESC flashing algorithm
        function flash_silabs_impl() {
            _4way.initFlash(escIdx)
            // check that the target ESC is still SiLabs
            .then(check_interface)
            // read current settings
            .then(read_eeprom)
            // for subsequent write-back, erase
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
            // migrate settings from previous version if asked to
            .then(read_eeprom)
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

            // @todo done
        }

        function check_interface(message) {
            esc_metainfo.interface_mode = message.params[3];
            if (esc_metainfo.interface_mode != _4way_modes.SiLBLB) {
                throw new Error('Interface mode for ESC ' + (escIdx + 1) + ' has changed')
            }

            // @todo check device id correspondence
        }

        function read_eeprom() {
            return _4way.read(BLHELI_SILABS_EEPROM_OFFSET, BLHELI_LAYOUT_SIZE)
        }

        function check_esc_and_mcu(message) {
            esc_settings = message.params;

            // @todo ask user if he wishes to continue

            // check LAYOUT
            var target_esc = esc_settings.subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size),
                fw_esc = memory_image.subarray(BLHELI_SILABS_EEPROM_OFFSET).subarray(BLHELI_LAYOUT.LAYOUT.offset, BLHELI_LAYOUT.LAYOUT.offset + BLHELI_LAYOUT.LAYOUT.size);

            if (!compare(target_esc, fw_esc)) {
                var target_esc_str = buf2ascii(target_esc).trim();
                if (target_esc_str.length == 0)
                    target_esc_str = 'EMPTY';

                self.print('Target ESC ' + target_esc_str + ' is different from HEX ' + buf2ascii(fw_esc).trim() + '\n');
            }

            // check MCU, if it does not match there's either wrong HEX or corrupted ESC. Disallow for now
            var target_mcu = esc_settings.subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size),
                fw_mcu = memory_image.subarray(BLHELI_SILABS_EEPROM_OFFSET).subarray(BLHELI_LAYOUT.MCU.offset, BLHELI_LAYOUT.MCU.offset + BLHELI_LAYOUT.MCU.size);
            if (!compare(target_mcu, fw_mcu)) {
                var target_mcu_str = buf2ascii(target_mcu).trim();
                if (target_mcu_str.length == 0)
                    target_mcu_str = 'EMPTY';

                throw new Error('Target MCU ' + target_mcu_str + ' is different from HEX ' + buf2ascii(fw_mcu).trim() + ', aborting')
            }

            // @todo check NAME for **FLASH*FAILED**
        }

        function write_eeprom_safeguard() {
            esc_settings.set(ascii2buf('**FLASH*FAILED**'), BLHELI_LAYOUT.NAME.offset);

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
                console.log(message)
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
                promise = promise.then(_4way.write.bind(_4way, address, memory_image.subarray(address, address + step)))
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
                promise = promise.then(_4way.read.bind(_4way, address, 256))
                .then(function(message) {
                    if (!compare(message.params, memory_image.subarray(message.address, message.address + message.params.byteLength))) {
                        throw new Error('Failed to verify write at address 0x' + message.address.toString(0x10))
                    }

                    update_progress(step)
                })
            }

            return promise
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

        function on_failed(error) {
            self.print('Firmware flashing failed' + (error ? ': ' + error.stack : ' ') + '\n');
            $('a.flash').removeClass('disabled');
            _4way.dry_run = false;
            progress_e.hide();
        }

        function on_finished() {
            self.print('Flashing firmware to ESC ' + (escIdx + 1) + ' finished\n');
            $('a.flash').removeClass('disabled');
            _4way.dry_run = false;
            progress_e.hide();
        }

        select_file();
    }

    function ascii2buf(str) {
        var view = new Uint8Array(str.length);

        for (var i = 0; i < str.length; ++i) {
            view[i] = str.charCodeAt(i);
        }

        return view;
    }

    function buf2ascii(buf) {
        return String.fromCharCode.apply(null, buf);
    }

    // ask the FC to switch into 4way interface mode
    MSP.send_message(MSP_codes.MSP_SET_4WAY_IF, null, null, load_html);
};

TABS.esc.cleanup = function (callback) {
    if (!CONFIGURATOR.connectionValid || !CONFIGURATOR.escActive) {
        if (callback) callback();
        return;
    }

    this.esc_settings = [];
    this.esc_metainfo = [];
    // now we can return control to MSP or CLI handlers
    CONFIGURATOR.escActive = false;

    // tell 4-way interface to return control to MSP server
    _4way.send({
        command: _4way_commands.cmd_InterfaceExit
    });

    if (callback) {
        GUI.timeout_add('waiting_4way_if_exit', callback, 100);
    }
};

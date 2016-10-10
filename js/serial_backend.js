'use strict';

$(document).ready(function () {

    GUI.updateManualPortVisibility = function(){
        var selected_port = $('div#port-picker #port option:selected');
        if (selected_port.data().isManual) {
            $('#port-override-option').show();
        }
        else {
            $('#port-override-option').hide();
        }
        if (selected_port.data().isDFU) {
            $('select#baud').hide();
        }
        else {
            $('select#baud').show();
        }
    };

    GUI.updateManualPortVisibility();

    $('#port-override').change(function () {
        chrome.storage.local.set({'portOverride': $('#port-override').val()});
    });

    chrome.storage.local.get('portOverride', function (data) {
        $('#port-override').val(data.portOverride);
    });

    $('div#port-picker #port').change(function (target) {
        GUI.updateManualPortVisibility();
    });

    $('div.connect_controls a.connect').click(function () {
        if (GUI.connect_lock != true) { // GUI control overrides the user control

            var clicks = $(this).data('clicks');
            var selected_baud = parseInt($('div#port-picker #baud').val());
            var selected_port = $('div#port-picker #port option:selected').data().isManual ?
                    $('#port-override').val() :
                    String($('div#port-picker #port').val());
            if (selected_port === 'DFU') {
                GUI.log(chrome.i18n.getMessage('dfu_connect_message'));
            }
            else if (selected_port != '0') {
                if (!clicks) {
                    console.log('Connecting to: ' + selected_port);
                    GUI.connecting_to = selected_port;

                    // lock port select & baud while we are connecting / connected
                    $('div#port-picker #port, div#port-picker #baud, div#port-picker #delay, div#port-picker #interface').prop('disabled', true);
                    $('div.connect_controls a.connect_state').text(chrome.i18n.getMessage('connecting'));


                    serial.connect(selected_port, {bitrate: selected_baud}, onOpen);
                } else {
                    GUI.timeout_kill_all();
                    GUI.interval_kill_all();
                    GUI.tab_switch_cleanup();
                    GUI.tab_switch_in_progress = false;

                    serial.disconnect(onClosed);

                    var wasConnected = CONFIGURATOR.connectionValid;

                    GUI.connected_to = false;
                    CONFIGURATOR.connectionValid = false;
                    GUI.allowedTabs = GUI.defaultAllowedTabsWhenDisconnected.slice();
                    MSP.disconnect_cleanup();
                    PortUsage.reset();
                    if (CONFIGURATOR.escActive) {
                        GUI.timeout_add('4w-if-cleanup', () => {
                            CONFIGURATOR.escActive = false
                            _4way.disconnect_cleanup()    
                        }, 0)
                    }

                    // unlock port select & baud
                    $('div#port-picker #port, div#port-picker #baud, div#port-picker #interface').prop('disabled', false);

                    // reset connect / disconnect button
                    $('div.connect_controls a.connect').removeClass('active');
                    $('div.connect_controls a.connect_state').text(chrome.i18n.getMessage('connect'));
                   
                    if (wasConnected) {
                        // detach listeners and remove element data
                        $('#content').empty();
                    }

                    $('#tabs .tab_landing a').click();
                }

                $(this).data("clicks", !clicks);
            }
        }
    });

    PortHandler.initialize();
    PortUsage.initialize();
});

function onOpen(openInfo) {
    if (openInfo) {
        // update connected_to
        GUI.connected_to = GUI.connecting_to;

        // reset connecting_to
        GUI.connecting_to = false;

        GUI.log(chrome.i18n.getMessage('serialPortOpened', [openInfo.connectionId]));

        // save selected port with chrome.storage if the port differs
        chrome.storage.local.get('last_used_port', function (result) {
            if (result.last_used_port) {
                if (result.last_used_port != GUI.connected_to) {
                    // last used port doesn't match the one found in local db, we will store the new one
                    chrome.storage.local.set({'last_used_port': GUI.connected_to});
                }
            } else {
                // variable isn't stored yet, saving
                chrome.storage.local.set({'last_used_port': GUI.connected_to});
            }
        });

        serial.onReceive.addListener(read_serial);

        // disconnect after 10 seconds with error if we don't get IDENT data
        GUI.timeout_add('connecting', function () {
            if (!CONFIGURATOR.connectionValid) {
                GUI.log(chrome.i18n.getMessage('noConfigurationReceived'));

                GUI.timeout_add('disconnecting', function() {
                    $('a.connect').click(); // disconnect
                }, 500);
            }
        }, 10000);

        FC.resetState();

                                        // continue as usually
                                        CONFIGURATOR.connectionValid = true;
                                        // set flag to allow messages redirect to 4way-if handler
                                        CONFIGURATOR.escActive = true;
                                        GUI.allowedTabs = GUI.defaultAllowedTabsWhenConnected.slice();

                                        onConnect();

                                        $('#tabs ul.mode-connected .tab_esc a').click();

                                        return;

        // request configuration data
        MSP.send_message(MSP_codes.MSP_API_VERSION, false, false, function () {
            GUI.log(chrome.i18n.getMessage('apiVersionReceived', [CONFIG.apiVersion]));

            if (semver.gte(CONFIG.apiVersion, CONFIGURATOR.apiVersionAccepted)) {

                MSP.send_message(MSP_codes.MSP_FC_VARIANT, false, false, function () {

                    MSP.send_message(MSP_codes.MSP_FC_VERSION, false, false, function () {

                        googleAnalytics.sendEvent('Firmware', 'Variant', CONFIG.flightControllerIdentifier + ',' + CONFIG.flightControllerVersion);
                        GUI.log(chrome.i18n.getMessage('fcInfoReceived', [CONFIG.flightControllerIdentifier, CONFIG.flightControllerVersion]));

                        MSP.send_message(MSP_codes.MSP_BUILD_INFO, false, false, function () {

                            googleAnalytics.sendEvent('Firmware', 'Using', CONFIG.buildInfo);
                            GUI.log(chrome.i18n.getMessage('buildInfoReceived', [CONFIG.buildInfo]));

                            MSP.send_message(MSP_codes.MSP_BOARD_INFO, false, false, function () {

                                googleAnalytics.sendEvent('Board', 'Using', CONFIG.boardIdentifier + ',' + CONFIG.boardVersion);
                                GUI.log(chrome.i18n.getMessage('boardInfoReceived', [CONFIG.boardIdentifier, CONFIG.boardVersion]));

                                MSP.send_message(MSP_codes.MSP_UID, false, false, function () {
                                    GUI.log(chrome.i18n.getMessage('uniqueDeviceIdReceived', [CONFIG.uid[0].toString(16) + CONFIG.uid[1].toString(16) + CONFIG.uid[2].toString(16)]));

                                    MSP.send_message(MSP_codes.MSP_SET_4WAY_IF, false, false, function () {
                                        // continue as usually
                                        CONFIGURATOR.connectionValid = true;
                                        // set flag to allow messages redirect to 4way-if handler
                                        CONFIGURATOR.escActive = true;
                                        GUI.allowedTabs = GUI.defaultAllowedTabsWhenConnected.slice();

                                        onConnect();

                                        $('#tabs ul.mode-connected .tab_esc a').click();
                                    })
                                });
                            });
                        });
                    });
                });
            } else {
                GUI.log(chrome.i18n.getMessage('firmwareVersionNotSupported', [CONFIGURATOR.apiVersionAccepted]));
            }
        });
    } else {
        console.log('Failed to open serial port');
        GUI.log(chrome.i18n.getMessage('serialPortOpenFail'));

        $('div#connectbutton a.connect_state').text(chrome.i18n.getMessage('connect'));
        $('div#connectbutton a.connect').removeClass('active');

        // unlock port select & baud
        $('div#port-picker #port, div#port-picker #baud, div#port-picker #delay').prop('disabled', false);

        // reset data
        $('div#connectbutton a.connect').data("clicks", false);
    }
}

function onConnect() {
    GUI.timeout_remove('connecting'); // kill connecting timer
    $('div#connectbutton a.connect_state').text(chrome.i18n.getMessage('disconnect')).addClass('active');
    $('div#connectbutton a.connect').addClass('active');
    $('#tabs ul.mode-disconnected').hide();
    $('#tabs ul.mode-connected').show(); 
     
    var port_picker = $('#portsinput');
    port_picker.hide(); 
}

function onClosed(result) {
    if (result) { // All went as expected
        GUI.log(chrome.i18n.getMessage('serialPortClosedOk'));
    } else { // Something went wrong
        GUI.log(chrome.i18n.getMessage('serialPortClosedFail'));
    }

    $('#tabs ul.mode-connected').hide();
    $('#tabs ul.mode-disconnected').show();
    
    var port_picker = $('#portsinput');
    port_picker.show(); 
}

function read_serial(info) {
    if (!CONFIGURATOR.escActive) {
        MSP.read(info);
    } else {
        _4way.onread(info);
    }
}

function highByte(num) {
    return num >> 8;
}

function lowByte(num) {
    return 0x00FF & num;
}

function specificByte(num, pos) {
    return 0x000000FF & (num >> (8 * pos));
}

function bit_check(num, bit) {
    return ((num >> bit) % 2 != 0);
}

function bit_set(num, bit) {
    return num | 1 << bit;
}

function bit_clear(num, bit) {
    return num & ~(1 << bit);
}

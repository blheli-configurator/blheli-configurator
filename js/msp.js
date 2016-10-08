'use strict';

// MSP_codes needs to be re-integrated inside MSP object
var MSP_codes = {
    MSP_API_VERSION:            1,
    MSP_FC_VARIANT:             2,
    MSP_FC_VERSION:             3,
    MSP_BOARD_INFO:             4,
    MSP_BUILD_INFO:             5,

    // Multiwii MSP commands
    MSP_IDENT:              100,
    MSP_STATUS:             101,
    MSP_MOTOR:              104,
    MSP_3D:                 124,
    MSP_SET_3D:             217,

    MSP_SET_4WAY_IF:        245,

    // Additional baseflight commands that are not compatible with MultiWii
    MSP_UID:                160, // Unique device ID
};

var MSP = {
    state:                      0,
    message_direction:          1,
    code:                       0,
    message_length_expected:    0,
    message_length_received:    0,
    message_buffer:             null,
    message_buffer_uint8_view:  null,
    message_checksum:           0,

    callbacks:                  [],
    packet_error:               0,
    unsupported:                0,
    timeouts_in_a_row:          0,

    last_received_timestamp:   null,
    analog_last_received_timestamp: null,

    read: function (readInfo) {
        var data = new Uint8Array(readInfo.data);

        for (var i = 0; i < data.length; i++) {
            switch (this.state) {
                case 0: // sync char 1
                    if (data[i] == 36) { // $
                        this.state++;
                    }
                    break;
                case 1: // sync char 2
                    if (data[i] == 77) { // M
                        this.state++;
                    } else { // restart and try again
                        this.state = 0;
                    }
                    break;
                case 2: // direction (should be >)
                    this.unsupported = 0;
                    if (data[i] == 62) { // >
                        this.message_direction = 1;
                    } else if (data[i] == 60) { // <
                        this.message_direction = 0;
                    } else if (data[i] == 33) { // !
                        // FC reports unsupported message error
                        this.unsupported = 1;
                    }

                    this.state++;
                    break;
                case 3:
                    this.message_length_expected = data[i];

                    this.message_checksum = data[i];

                    // setup arraybuffer
                    this.message_buffer = new ArrayBuffer(this.message_length_expected);
                    this.message_buffer_uint8_view = new Uint8Array(this.message_buffer);

                    this.state++;
                    break;
                case 4:
                    this.code = data[i];
                    this.message_checksum ^= data[i];

                    if (this.message_length_expected > 0) {
                        // process payload
                        this.state++;
                    } else {
                        // no payload
                        this.state += 2;
                    }
                    break;
                case 5: // payload
                    this.message_buffer_uint8_view[this.message_length_received] = data[i];
                    this.message_checksum ^= data[i];
                    this.message_length_received++;

                    if (this.message_length_received >= this.message_length_expected) {
                        this.state++;
                    }
                    break;
                case 6:
                    if (this.message_checksum == data[i]) {
                        // message received, process
                        this.process_data(this.code, this.message_buffer, this.message_length_expected);
                    } else {
                        console.log('code: ' + this.code + ' - crc failed');

                        this.packet_error++;
                        $('span.packet-error').html(this.packet_error);
                    }

                    // Reset variables
                    this.message_length_received = 0;
                    this.state = 0;
                    break;

                default:
                    console.log('Unknown state detected: ' + this.state);
            }
        }
        this.last_received_timestamp = Date.now();
    },
    process_data: function (code, message_buffer, message_length) {
        var data = new DataView(message_buffer, 0); // DataView (allowing us to view arrayBuffer as struct/union)

        if (!this.unsupported) switch (code) {
            case MSP_codes.MSP_IDENT:
                console.log('Using deprecated msp command: MSP_IDENT');
                // Deprecated
                CONFIG.version = parseFloat((data.getUint8(0) / 100).toFixed(2));
                CONFIG.multiType = data.getUint8(1);
                CONFIG.msp_version = data.getUint8(2);
                CONFIG.capability = data.getUint32(3, 1);
                break;
            case MSP_codes.MSP_STATUS:
                CONFIG.cycleTime = data.getUint16(0, 1);
                CONFIG.i2cError = data.getUint16(2, 1);
                CONFIG.activeSensors = data.getUint16(4, 1);
                CONFIG.mode = data.getUint32(6, 1);
                CONFIG.profile = data.getUint8(10);
                break;
            case MSP_codes.MSP_MOTOR:
                var motorCount = message_length / 2;
                var needle = 0;
                for (var i = 0; i < motorCount; i++) {
                    MOTOR_DATA[i] = data.getUint16(needle, 1);

                    needle += 2;
                }
                break;
            case MSP_codes.MSP_SET_4WAY_IF:
                ESC_CONFIG.connectedESCs = data.getUint8(0);
                break;
            case MSP_codes.MSP_SET_MOTOR:
                console.log('Motor Speeds Updated');
                break;
            // Additional baseflight commands that are not compatible with MultiWii
            case MSP_codes.MSP_UID:
                CONFIG.uid[0] = data.getUint32(0, 1);
                CONFIG.uid[1] = data.getUint32(4, 1);
                CONFIG.uid[2] = data.getUint32(8, 1);
                break;
            //
            // Cleanflight specific 
            //

            case MSP_codes.MSP_API_VERSION:
                var offset = 0;
                CONFIG.mspProtocolVersion = data.getUint8(offset++); 
                CONFIG.apiVersion = data.getUint8(offset++) + '.' + data.getUint8(offset++) + '.0';
                break;

            case MSP_codes.MSP_FC_VARIANT:
                var identifier = '';
                var offset;
                for (offset = 0; offset < 4; offset++) {
                    identifier += String.fromCharCode(data.getUint8(offset));
                }
                CONFIG.flightControllerIdentifier = identifier;
                break;

            case MSP_codes.MSP_FC_VERSION:
                var offset = 0;
                CONFIG.flightControllerVersion = data.getUint8(offset++) + '.' + data.getUint8(offset++) + '.' + data.getUint8(offset++);
                break;

            case MSP_codes.MSP_BUILD_INFO:
                var offset = 0;
                
                var dateLength = 11;
                var buff = [];
                for (var i = 0; i < dateLength; i++) {
                    buff.push(data.getUint8(offset++));
                }
                buff.push(32); // ascii space
                
                var timeLength = 8;
                for (var i = 0; i < timeLength; i++) {
                    buff.push(data.getUint8(offset++));
                }
                CONFIG.buildInfo = String.fromCharCode.apply(null, buff);
                break;

            case MSP_codes.MSP_BOARD_INFO:
                var identifier = '';
                var offset;
                for (offset = 0; offset < 4; offset++) {
                    identifier += String.fromCharCode(data.getUint8(offset));
                }
                CONFIG.boardIdentifier = identifier;
                CONFIG.boardVersion = data.getUint16(offset, 1);
                offset+=2;
                break;
            case MSP_codes.MSP_SET_3D:
                console.log('3D settings saved');
                break;
            default:
                console.log('Unknown code detected: ' + code);
        } else {
            if (code === MSP_codes.MSP_SET_4WAY_IF) {
                GUI.log(chrome.i18n.getMessage('blheliPassthroughNotSupported'));
            } else {
                console.log('FC reports unsupported message error: ' + code);
            }
        }

        this.timeouts_in_a_row = 0;

        // trigger callbacks, cleanup/remove callback after trigger
        for (var i = this.callbacks.length - 1; i >= 0; i--) { // itterating in reverse because we use .splice which modifies array length
            if (i < this.callbacks.length) {
                if (this.callbacks[i].code == code) {
                    // save callback reference
                    var callback = this.callbacks[i].callback;
    
                    // remove timeout
                    clearInterval(this.callbacks[i].timer);
    
                    // remove object from array
                    this.callbacks.splice(i, 1);
    
                    // fire callback
                    if (callback) callback({'command': code, 'data': data, 'length': message_length});
                }
            }
        }
    },
    send_message: function (code, data, callback_sent, callback_msp) {
        var bufferOut,
            bufView;

        // always reserve 6 bytes for protocol overhead !
        if (data) {
            var size = data.length + 6,
                checksum = 0;

            bufferOut = new ArrayBuffer(size);
            bufView = new Uint8Array(bufferOut);

            bufView[0] = 36; // $
            bufView[1] = 77; // M
            bufView[2] = 60; // <
            bufView[3] = data.length;
            bufView[4] = code;

            checksum = bufView[3] ^ bufView[4];

            for (var i = 0; i < data.length; i++) {
                bufView[i + 5] = data[i];

                checksum ^= bufView[i + 5];
            }

            bufView[5 + data.length] = checksum;
        } else {
            bufferOut = new ArrayBuffer(6);
            bufView = new Uint8Array(bufferOut);

            bufView[0] = 36; // $
            bufView[1] = 77; // M
            bufView[2] = 60; // <
            bufView[3] = 0; // data length
            bufView[4] = code; // code
            bufView[5] = bufView[3] ^ bufView[4]; // checksum
        }

        // dev version 0.57 code below got recently changed due to the fact that queueing same MSP codes was unsupported
        // and was causing trouble while backup/restoring configurations
        // watch out if the recent change create any inconsistencies and then adjust accordingly
        var obj = {'code': code, 'requestBuffer': bufferOut, 'callback': (callback_msp) ? callback_msp : false, 'timer': false};

        var requestExists = false;
        for (var i = 0; i < MSP.callbacks.length; i++) {
            if (i < MSP.callbacks.length) {
                if (MSP.callbacks[i].code == code) {
                    // request already exist, we will just attach
                    requestExists = true;
                    break;
                }
            } else {
                console.log("Callback index error: "+ i);
            }
        }

        if (!requestExists) {
            obj.timer = setInterval(function () {
                console.log('MSP data request timed-out: ' + code);

                // try exiting 4-way interface just in case
                if (++MSP.timeouts_in_a_row > 1) {
                    MSP.timeouts_in_a_row = 0;
                    _4way.exit()
                }

                serial.send(bufferOut, false);
            }, 1000); // we should be able to define timeout in the future
        }

        MSP.callbacks.push(obj);

        // always send messages with data payload (even when there is a message already in the queue)
        if (data || !requestExists) {
            serial.send(bufferOut, function (sendInfo) {
                if (sendInfo.bytesSent == bufferOut.byteLength) {
                    if (callback_sent) callback_sent();
                }
            });
        }
        return true;
    },
    callbacks_cleanup: function () {
        for (var i = 0; i < this.callbacks.length; i++) {
            clearInterval(this.callbacks[i].timer);
        }

        this.callbacks = [];
    },
    disconnect_cleanup: function () {
        this.state = 0; // reset packet state for "clean" initial entry (this is only required if user hot-disconnects)
        this.packet_error = 0; // reset CRC packet error counter for next session

        this.callbacks_cleanup();
    }
};

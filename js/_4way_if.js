'use strict';

/*  implementation of BLHeli 4way interface documentation found at
    https://github.com/4712/BLHeliSuite/blob/master/Manuals/BLHeliSuite%204w-if%20protocol.pdf
*/

var _4way_pc = 0x2f;
var _4way_if = 0x2e;

var _4way_commands = {
    cmd_InterfaceTestAlive:     0x30,
    cmd_ProtocolGetVersion:     0x31,
    cmd_InterfaceGetName:       0x32,
    cmd_InterfaceGetVersion:    0x33,
    cmd_InterfaceExit:          0x34,
    cmd_DeviceReset:            0x35,
    cmd_DeviceInitFlash:        0x37,
    cmd_DeviceEraseAll:         0x38,
    cmd_DevicePageErase:        0x39,
    cmd_DeviceRead:             0x3a,
    cmd_DeviceWrite:            0x3b,
    cmd_DeviceC2CK_LOW:         0x3c,
    cmd_DeviceReadEEprom:       0x3d,
    cmd_DeviceWriteEEprom:      0x3e,
    cmd_InterfaceSetMode:       0x3f
};

// acknowledgment answers from interface
var _4way_ack = {
    ACK_OK:                 0x00,
    ACK_I_UNKNOWN_ERROR:    0x01,   // unused
    ACK_I_INVALID_CMD:      0x02,
    ACK_I_INVALID_CRC:      0x03,
    ACK_I_VERIFY_ERROR:     0x04,
    ACK_D_INVALID_COMMAND:  0x05,   // unused
    ACK_D_COMMAND_FAILED:   0x06,   // unused
    ACK_D_UNKNOWN_ERROR:    0x07,   // unused
    ACK_I_INVALID_CHANNEL:  0x08,
    ACK_I_INVALID_PARAM:    0x09,
    ACK_D_GENERAL_ERROR:    0x0f
};

var _4way_modes = {
    SiLC2:  0,
    SiLBLB: 1,
    AtmBLB: 2,
    AtmSK:  3
};

function _4way_command_to_string(command) {
    for (var field in _4way_commands)
        if (_4way_commands[field] == command)
            return field;

    return "invalid command: " + command;
};

function _4way_ack_to_string(ack) {
    for (var field in _4way_ack)
        if (_4way_ack[field] == ack)
            return field;

    return "invalid ack: " + ack;
}

// It is not advisable to queue-up commands as the serial interface may overflow.
// Multiple commands with the same `command` tag may be resolved incorrectly.
var _4way = {
    callbacks:      [],
    // Storage for partially-received messages
    backlog_view:   null,

    crc16_xmodem_update: function(crc, byte) {
        crc = crc ^ (byte << 8);
        for (var i = 0; i < 8; ++i) {
            if (crc & 0x8000)
                crc = (crc << 1) ^ 0x1021;
            else
                crc = crc << 1;
        }

        return crc & 0xffff;
    },

    createMessage: function(command, params, address) {
        // ensure parameters are correctly set
        if (params.length == 0) {
            params.push(0);
        } else if (params.length > 256) {
            throw new Error('4way interface supports maximum of 256 params, ' + params.length + ' passed')
        }

        var bufferOut = new ArrayBuffer(7 + params.length),
            bufferView = new Uint8Array(bufferOut);

        // fill header
        bufferView[0] = _4way_pc;
        bufferView[1] = command;
        bufferView[2] = (address >> 8) & 0xff;
        bufferView[3] = address & 0xff;
        bufferView[4] = params.length == 256 ? 0 : params.length;

        // copy params
        var outParams = bufferView.subarray(5);
        for (var i = 0; i < params.length; ++i)
            outParams[i] = params[i];

        // calculate checksum
        var msgWithoutChecksum = bufferView.subarray(0, -2)
        var checksum = msgWithoutChecksum.reduce(this.crc16_xmodem_update, 0);

        bufferView[5 + params.length] = (checksum >> 8) & 0xff;
        bufferView[6 + params.length] = checksum & 0xff;

        return bufferOut;
    },

    parseMessages: function(buffer) {
        var messages = [];

        if (this.backlog_view && this.backlog_view.byteLength != 0) {
            var view = new Uint8Array(this.backlog_view.byteLength + buffer.byteLength);
            view.set(this.backlog_view, 0);
            view.set(new Uint8Array(buffer), this.backlog_view.byteLength);
            this.backlog_view = null;
        } else {
            var view = new Uint8Array(buffer);
        }

        while (view.length > 0) {
            if (view[0] != _4way_if) {
                console.log('invalid message start: ', view[0]);
                break;
            }

            if (view.length < 9) {
                // incomplete message, store it and continue later
                this.backlog_view = view;
                break;
            }

            var paramCount = view[4];
            if (paramCount == 0) {
                paramCount = 256;
            }

            if (view.length < 8 + paramCount) {
                // incomplete message, store it and continue later
                this.backlog_view = view;
                break;
            }

            var message = {
                command:    view[1],
                address:    (view[2] << 8) | view[3],
                ack:        view[5 + paramCount],
                checksum:   (view[6 + paramCount] << 8) | view[7 + paramCount],
                params:     view.slice(5, 5 + paramCount)
            };

            var msgWithoutChecksum = view.subarray(0, 6 + paramCount);
            var checksum = msgWithoutChecksum.reduce(this.crc16_xmodem_update, 0);

            if (checksum != message.checksum) {
                console.log('checksum mismatch, received: ', message.checksum, ', calculated: ', checksum);
                break;
            }

            messages.push(message);

            // move onto next message in buffer
            view = view.subarray(8 + paramCount);
        }

        return messages;
    },

    sendMessage: function(command, params, address, callback) {
        if (params == undefined) params = [ 0 ];
        if (address == undefined) address = 0;

        var self = this,
            message = self.createMessage(command, params, address);

        console.log('sending', _4way_command_to_string(command), address.toString(0x10), params)
        serial.send(message, function(sendInfo) {
            if (sendInfo.bytesSent == message.byteLength) {
                if (callback) {
                    self.callbacks.push({
                        command: command,
                        callback: callback
                    });
                }
            } else {
                console.log('send failed: ', sendInfo);
            }
        });
    },

    sendMessagePromised: function(command, params, address) {
        if (params == undefined) params = [ 0 ];
        if (address == undefined) address = 0;

        var self = this,
            message = self.createMessage(command, params, address),
            deferred = Q.defer()

        console.log('sending', _4way_command_to_string(command), address.toString(0x10), params)
        serial.send(message, function(sendInfo) {
            if (sendInfo.bytesSent == message.byteLength) {
                self.callbacks.push({
                    command: command,
                    callback: function(msg) {
                        if (msg.ack === _4way_ack.ACK_OK) {
                            deferred.resolve(msg)
                        } else {
                            deferred.reject(new Error(JSON.stringify(msg)))
                        }
                    }
                })
            } else {
                deferred.reject(new Error('serial.send(): ' + JSON.stringify(sendInfo)))
            }
        });

        return deferred.promise
    },

    send: function(obj) {
        this.sendMessage(obj.command, obj.params, obj.address, obj.callback)
    },

    initFlash: function(target) {
        return this.sendMessagePromised(_4way_commands.cmd_DeviceInitFlash, [ target ], 0)
    },

    pageErase: function(page) {
        return this.sendMessagePromised(_4way_commands.cmd_DevicePageErase, [ page ], 0)
    },

    read: function(address, bytes) {
        return this.sendMessagePromised(_4way_commands.cmd_DeviceRead, [ bytes === 256 ? 0 : bytes ], address)
    },

    readEEprom: function(address, bytes) {
        return this.sendMessagePromised(_4way_commands.cmd_DeviceReadEEprom, [ bytes === 256 ? 0 : bytes ], address)  
    },

    write: function(address, data) {
        return this.sendMessagePromised(_4way_commands.cmd_DeviceWrite, data, address)
    },

    writeEEprom: function(address, data) {
        return this.sendMessagePromised(_4way_commands.cmd_DeviceWriteEEprom, data, address)
    },

    reset: function(target) {
        return this.sendMessagePromised(_4way_commands.cmd_DeviceReset, [ target ], 0)
    },

    onread: function(readInfo) {
        var self = this;
        var messages = self.parseMessages(readInfo.data);

        messages.forEach(function (message) {
            console.log('received', _4way_command_to_string(message.command), _4way_ack_to_string(message.ack), message.address.toString(0x10), message.params)
            for (var i = self.callbacks.length - 1; i >= 0; --i) {
                if (i < self.callbacks.length) {
                    if (self.callbacks[i].command == message.command) {
                        // save callback reference
                        var callback = self.callbacks[i].callback;
        
                        // remove object from array
                        self.callbacks.splice(i, 1);
        
                        // fire callback
                        if (callback) {
                            callback(message);
                        }
                    }
                }
            }
        });
    }
};

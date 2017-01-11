var BLHELI_ESCS_REMOTE = 'https://raw.githubusercontent.com/blheli-configurator/blheli-configurator/master/js/blheli_escs.json';
var BLHELI_ESCS_LOCAL = './js/blheli_escs.json';
var BLHELI_ESCS_KEY = 'escs';

function findMCU(signature, MCUList) {
    return MCUList.find(MCU => parseInt(MCU.signature) === signature);
}

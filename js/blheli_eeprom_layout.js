'use strict';

var BLHELI_TYPES = {
    BLHELI_S_SILABS: 'BLHeli_S SiLabs',
    SILABS: 'SiLabs',
    ATMEL: 'Atmel'
};

var BLHELI_MODES = {
    MAIN:   0xA55A,
    TAIL:   0x5AA5,
    MULTI:  0x55AA
};

var BLHELI_SILABS_EEPROM_OFFSET         = 0x1A00
var BLHELI_SILABS_PAGE_SIZE             = 0x0200
var BLHELI_SILABS_BOOTLOADER_ADDRESS    = 0x1C00
var BLHELI_SILABS_BOOTLOADER_SIZE       = 0x0200
var BLHELI_SILABS_FLASH_SIZE            = 0x2000
var BLHELI_SILABS_ADDRESS_SPACE_SIZE    = BLHELI_SILABS_BOOTLOADER_ADDRESS

var BLHELI_ATMEL_BLB_SIZE               = 0x0200
var BLHELI_ATMEL_SK_SIZE                = 0x0400
var BLHELI_ATMEL_BLB_ADDRESS_8          = 0x1E00
var BLHELI_ATMEL_BLB_ADDRESS_16         = 0x3E00
var BLHELI_ATMEL_SK_ADDRESS_8           = 0x1C00
var BLHELI_ATMEL_SK_ADDRESS_16          = 0x3C00
var BLHELI_ATMEL_EEPROM_SIZE            = 0x0200

var BLHELI_LAYOUT_SIZE = 0x70
var BLHELI_MIN_SUPPORTED_LAYOUT_REVISION = 0x13

var BLHELI_S_MIN_LAYOUT_REVISION = 0x20

// Bootloader was added to BLHeli only in 13.2, hence supporting lower versions if not practical
var BLHELI_LAYOUT = {
    MAIN_REVISION:              {   offset: 0x00, size: 1   },
    SUB_REVISION:               {   offset: 0x01, size: 1   },
    LAYOUT_REVISION:            {   offset: 0x02, size: 1   },
    P_GAIN:                     {   offset: 0x03, size: 1   },
    I_GAIN:                     {   offset: 0x04, size: 1   },
    GOVERNOR_MODE:              {   offset: 0x05, size: 1   },
    LOW_VOLTAGE_LIMIT:          {   offset: 0x06, size: 1   },
    MOTOR_GAIN:                 {   offset: 0x07, size: 1   },
    MOTOR_IDLE:                 {   offset: 0x08, size: 1   },
    STARTUP_POWER:              {   offset: 0x09, size: 1   },
    PWM_FREQUENCY:              {   offset: 0x0A, size: 1   },
    MOTOR_DIRECTION:            {   offset: 0x0B, size: 1   },
    INPUT_PWM_POLARITY:         {   offset: 0x0C, size: 1   },
    MODE:                       {   offset: 0x0D, size: 2   },
    PROGRAMMING_BY_TX:          {   offset: 0x0F, size: 1   },
    REARM_AT_START:             {   offset: 0x10, size: 1   },
    GOVERNOR_SETUP_TARGET:      {   offset: 0x11, size: 1   },
    STARTUP_RPM:                {   offset: 0x12, size: 1   },
    STARTUP_ACCELERATION:       {   offset: 0x13, size: 1   },
    VOLT_COMP:                  {   offset: 0x14, size: 1   },
    COMMUTATION_TIMING:         {   offset: 0x15, size: 1   },
    DAMPING_FORCE:              {   offset: 0x16, size: 1   },
    GOVERNOR_RANGE:             {   offset: 0x17, size: 1   },
    STARTUP_METHOD:             {   offset: 0x18, size: 1   },
    PPM_MIN_THROTTLE:           {   offset: 0x19, size: 1   },
    PPM_MAX_THROTTLE:           {   offset: 0x1A, size: 1   },
    BEEP_STRENGTH:              {   offset: 0x1B, size: 1   },
    BEACON_STRENGTH:            {   offset: 0x1C, size: 1   },
    BEACON_DELAY:               {   offset: 0x1D, size: 1   },
    THROTTLE_RATE:              {   offset: 0x1E, size: 1   },
    DEMAG_COMPENSATION:         {   offset: 0x1F, size: 1   },
    BEC_VOLTAGE:                {   offset: 0x20, size: 1   },
    PPM_CENTER_THROTTLE:        {   offset: 0x21, size: 1   },
    SPOOLUP_TIME:               {   offset: 0x22, size: 1   },
    TEMPERATURE_PROTECTION:     {   offset: 0x23, size: 1   },
    LOW_RPM_POWER_PROTECTION:   {   offset: 0x24, size: 1   },
    PWM_INPUT:                  {   offset: 0x25, size: 1   },
    PWM_DITHER:                 {   offset: 0x26, size: 1   },
    BRAKE_ON_STOP:              {   offset: 0x27, size: 1   },
    LED_CONTROL:                {   offset: 0x28, size: 1   },

    LAYOUT:                     {   offset: 0x40, size: 16   },
    MCU:                        {   offset: 0x50, size: 16   },
    NAME:                       {   offset: 0x60, size: 16   }
};

function blheliModeToString(mode) {
    for (var property in BLHELI_MODES) {
        if (BLHELI_MODES.hasOwnProperty(property)) {
            if (BLHELI_MODES[property] === mode) {
                return property;
            }
        }
    }
}

function blheliSettingsObject(settingsUint8Array) {
    var object = {};

    for (var prop in BLHELI_LAYOUT) {
        if (BLHELI_LAYOUT.hasOwnProperty(prop)) {
            let setting = BLHELI_LAYOUT[prop];

            if (setting.size === 1) {
                object[prop] = settingsUint8Array[setting.offset];
            } else if (setting.size === 2) {
                object[prop] = (settingsUint8Array[setting.offset] << 8) | settingsUint8Array[setting.offset + 1];
            } else if (setting.size === 16) {
                object[prop] = String.fromCharCode.apply(undefined, settingsUint8Array.subarray(setting.offset).subarray(0, 16)).trim();
            } else {
                throw new Error('Logic error')
            }
        }
    }

    return object;
}

function blheliSettingsArray(settingsObject) {
    var array = new Uint8Array(BLHELI_LAYOUT_SIZE).fill(0xff);

    for (var prop in BLHELI_LAYOUT) {
        if (BLHELI_LAYOUT.hasOwnProperty(prop)) {
            let setting = BLHELI_LAYOUT[prop];

            if (setting.size === 1) {
                array[setting.offset] = settingsObject[prop];
            } else if (setting.size === 2) {
                array[setting.offset] = (settingsObject[prop] >> 8) & 0xff;
                array[setting.offset + 1] = (settingsObject[prop]) & 0xff;
            } else if (setting.size === 16) {
                for (let i = 0, len = settingsObject[prop].length; i < setting.size; ++i) {
                    array[setting.offset + i] = i < len ? settingsObject[prop].charCodeAt(i) : ' '.charCodeAt(0);
                }
            } else {
                throw new Error('Logic error')
            }
        }
    }

    return array;
}

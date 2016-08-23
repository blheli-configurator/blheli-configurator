'use strict';

var BLHELI_MODES = {
    MAIN:   0xA55A,
    TAIL:   0x5AA5,
    MULTI:  0x55AA
};

var BLHELI_SILABS_EEPROM_OFFSET         = 0x1A00
var BLHELI_SILABS_PAGE_SIZE             = 0x0200
var BLHELI_SILABS_BOOTLOADER_ADDRESS    = 0x1C00
var BLHELI_SILABS_ADDRESS_SPACE_SIZE    = BLHELI_SILABS_BOOTLOADER_ADDRESS

var BLHELI_ATMEL_BLB_ADDRESS_8          = 0x1C00
var BLHELI_ATMEL_BLB_ADDRESS_16         = 0x3C00
var BLHELI_ATMEL_SK_ADDRESS_8           = 0x1E00
var BLHELI_ATMEL_SK_ADDRESS_16          = 0x3E00

var BLHELI_LAYOUT_SIZE = 0x70
var BLHELI_MIN_SUPPORTED_LAYOUT_REVISION = 0x14

var BLHELI_S_MIN_LAYOUT_REVISION = 0x20

// Bootloader was added to BLHeli only in 13.2, hence supporting lower versions if not practical
var BLHELI_LAYOUT = {
    MAIN_REVISION:              {   offset: 0x00, size: 1,  since: 0 },
    SUB_REVISION:               {   offset: 0x01, size: 1,  since: 0 },
    LAYOUT_REVISION:            {   offset: 0x02, size: 1,  since: 0 },
    P_GAIN:                     {   offset: 0x03, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    I_GAIN:                     {   offset: 0x04, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    GOVERNOR_MODE:              {   offset: 0x05, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    LOW_VOLTAGE_LIMIT:          {   offset: 0x06, size: 1,  since: 0, until: 0x14 }, // disappeared for MULTI in layout 0x14
    MOTOR_GAIN:                 {   offset: 0x07, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    MOTOR_IDLE:                 {   offset: 0x08, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    STARTUP_POWER:              {   offset: 0x09, size: 1,  since: 0 },
    PWM_FREQUENCY:              {   offset: 0x0A, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    MOTOR_DIRECTION:            {   offset: 0x0B, size: 1,  since: 0 },
    INPUT_PWM_POLARITY:         {   offset: 0x0C, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    MODE:                       {   offset: 0x0D, size: 2,  since: 0 },
    PROGRAMMING_BY_TX:          {   offset: 0x0F, size: 1,  since: 0 },
    REARM_AT_START:             {   offset: 0x10, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    GOVERNOR_SETUP_TARGET:      {   offset: 0x11, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    STARTUP_RPM:                {   offset: 0x12, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    STARTUP_ACCELERATION:       {   offset: 0x13, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    VOLT_COMP:                  {   offset: 0x14, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    COMMUTATION_TIMING:         {   offset: 0x15, size: 1,  since: 0 },
    DAMPING_FORCE:              {   offset: 0x16, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    GOVERNOR_RANGE:             {   offset: 0x17, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    STARTUP_METHOD:             {   offset: 0x18, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    PPM_MIN_THROTTLE:           {   offset: 0x19, size: 1,  since: 0 },
    PPM_MAX_THROTTLE:           {   offset: 0x1A, size: 1,  since: 0 },
    BEEP_STRENGTH:              {   offset: 0x1B, size: 1,  since: 0 },
    BEACON_STRENGTH:            {   offset: 0x1C, size: 1,  since: 0 },
    BEACON_DELAY:               {   offset: 0x1D, size: 1,  since: 0 },
    THROTTLE_RATE:              {   offset: 0x1E, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    DEMAG_COMPENSATION:         {   offset: 0x1F, size: 1,  since: 0 },
    BEC_VOLTAGE:                {   offset: 0x20, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    PPM_CENTER_THROTTLE:        {   offset: 0x21, size: 1,  since: 0 },
    SPOOLUP_TIME:               {   offset: 0x22, size: 1,  since: 0, until: BLHELI_S_MIN_LAYOUT_REVISION },
    TEMPERATURE_PROTECTION:     {   offset: 0x23, size: 1,  since: 0 },
    LOW_RPM_POWER_PROTECTION:   {   offset: 0x24, size: 1,  since: 0x14 },
    PWM_INPUT:                  {   offset: 0x25, size: 1,  since: 0x14, until: BLHELI_S_MIN_LAYOUT_REVISION },
    PWM_DITHER:                 {   offset: 0x26, size: 1,  since: 0x14, until: BLHELI_S_MIN_LAYOUT_REVISION },
    BRAKE_ON_STOP:              {   offset: 0x27, size: 1,  since: 0x15 },
    LED_CONTROL:                {   offset: 0x28, size: 1,  since: BLHELI_S_MIN_LAYOUT_REVISION },

    LAYOUT:                     {   offset: 0x40, size: 16, since: 0 },
    MCU:                        {   offset: 0x50, size: 16, since: 0 },
    NAME:                       {   offset: 0x60, size: 16, since: 0 }
};

// @todo PWM_DITHER in layout version 0x14 is 0, 7, 15, 31, 63
// @todo PWM_DITHER in version 14.0 vas 1, 7, 15, 31, 63

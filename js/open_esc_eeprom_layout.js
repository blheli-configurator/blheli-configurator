'use strict';

const OPEN_ESC_TYPES = {
    ARM: 'Arm'
};

const OPEN_ESC_PAGE_SIZE                = 0x0400
const OPEN_ESC_EEPROM_OFFSET            = 0x7c00
const OPEN_ESC_LAYOUT_SIZE              = 0x30

const OPEN_ESC_LAYOUT = {
    BOOT_BYTE:                  {   offset: 0x00, size: 1   },
    LAYOUT_REVISION:            {   offset: 0x01, size: 1   },
    BOOT_LOADER_REVISION:       {   offset: 0x02, size: 1   },
    MAIN_REVISION:              {   offset: 0x03, size: 1   },
    SUB_REVISION:               {   offset: 0x04, size: 1   },

    NAME:                       {   offset: 0x05, size: 12  },

    MOTOR_DIRECTION:            {   offset: 0x11, size: 1   },
    BIDIRECTIONAL_MODE:         {   offset: 0x12, size: 1   },
    SINUSOIDAL_STARTUP:         {   offset: 0x13, size: 1   },
    COMPLEMENTARY_PWM:          {   offset: 0x14, size: 1   },
    VARIABLE_PWM_FREQUENCY:     {   offset: 0x15, size: 1   },
    STUCK_ROTOR_PROTECTION:     {   offset: 0x16, size: 1   },
    TIMING_ADVANCE:             {   offset: 0x17, size: 1   },
    PWM_FREQUENCY:              {   offset: 0x18, size: 1   },
    STARTUP_POWER:              {   offset: 0x19, size: 1   },
    MOTOR_KV:                   {   offset: 0x1a, size: 1   },
    MOTOR_POLES:                {   offset: 0x1b, size: 1   },
    BRAKE_ON_STOP:              {   offset: 0x1c, size: 1   },
};

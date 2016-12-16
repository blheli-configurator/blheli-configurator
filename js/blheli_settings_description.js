'use strict';

// layout 33, 16.3, 16.4, 16.5
var BLHELI_S_SETTINGS_LAYOUT_33 = [
    {
        name: 'PROGRAMMING_BY_TX', type: 'bool', label: 'escProgrammingByTX'
    },
    {
        name: 'STARTUP_POWER', type: 'enum', options: [
            { value: '1', label: '0.031' }, { value: '2', label: '0.047' },
            { value: '3', label: '0.063' }, { value: '4', label: '0.094' },
            { value: '5', label: '0.125' }, { value: '6', label: '0.188' },
            { value: '7', label: '0.25' }, { value: '8', label: '0.38' },
            { value: '9', label: '0.50' }, { value: '10', label: '0.75' },
            { value: '11', label: '1.00' }, { value: '12', label: '1.25' },
            { value: '13', label: '1.50' }
        ],
        label: 'escStartupPower'
    },
    {
        name: 'TEMPERATURE_PROTECTION', type: 'enum', label: 'escTemperatureProtection',
        options: [
            { value: '0', label: 'Disabled' }, { value: '1', label: '90C' },
            { value: '2', label: '100 C' }, { value: '3', label: '110 C' },
            { value: '4', label: '120 C' }, { value: '5', label: '120 C' },
            { value: '6', label: '130 C' }, { value: '7', label: '140 C' }
        ]
    },
    {
        name: 'LOW_RPM_POWER_PROTECTION', type: 'bool', label: 'escLowRPMPowerProtection'
    },
    {
        name: 'BRAKE_ON_STOP', type: 'bool', label: 'escBrakeOnStop'
    },
    {
        name: 'DEMAG_COMPENSATION', type: 'enum', label: 'escDemagCompensation',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ]
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', label: 'escMotorTiming',
        options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ]
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', label: 'escBeaconDelay',
        options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ]
    }
];

// layout 32, 16.0, 16.1, 16.2
var BLHELI_S_SETTINGS_LAYOUT_32 = [
    {
        name: 'PROGRAMMING_BY_TX', type: 'bool', label: 'escProgrammingByTX'
    },
    {
        name: 'STARTUP_POWER', type: 'enum', options: [
            { value: '1', label: '0.031' }, { value: '2', label: '0.047' },
            { value: '3', label: '0.063' }, { value: '4', label: '0.094' },
            { value: '5', label: '0.125' }, { value: '6', label: '0.188' },
            { value: '7', label: '0.25' }, { value: '8', label: '0.38' },
            { value: '9', label: '0.50' }, { value: '10', label: '0.75' },
            { value: '11', label: '1.00' }, { value: '12', label: '1.25' },
            { value: '13', label: '1.50' }
        ],
        label: 'escStartupPower'
    },
    {
        name: 'TEMPERATURE_PROTECTION', type: 'bool', label: 'escTemperatureProtection'
    },
    {
        name: 'LOW_RPM_POWER_PROTECTION', type: 'bool', label: 'escLowRPMPowerProtection'
    },
    {
        name: 'BRAKE_ON_STOP', type: 'bool', label: 'escBrakeOnStop'
    },
    {
        name: 'DEMAG_COMPENSATION', type: 'enum', label: 'escDemagCompensation',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ]
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', label: 'escMotorTiming',
        options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ]
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', label: 'escBeaconDelay',
        options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ]
    }
];

// layout 21, 14.5, 14.6, 14.7
var BLHELI_MULTI_SETTINGS_LAYOUT_21 = [
    {
        name: 'PROGRAMMING_BY_TX', type: 'bool', label: 'escProgrammingByTX'
    },
    {
        name: 'GOVERNOR_MODE', type: 'enum', label: 'escClosedLoopMode',
        options: [
            { value: '1', label: 'HiRange' }, { value: '2', label: 'MidRange' },
            { value: '3', label: 'LoRange' }, { value: '4', label: 'Off' }
        ]
    },
    {
        name: 'P_GAIN', type: 'enum', options: [
            { value: '1', label: '0.13' }, { value: '2', label: '0.17' },
            { value: '3', label: '0.25' }, { value: '4', label: '0.38' },
            { value: '5', label: '0.50' }, { value: '6', label: '0.75' },
            { value: '7', label: '1.00' }, { value: '8', label: '1.50' },
            { value: '9', label: '2.00' }, { value: '10', label: '3.00' },
            { value: '11', label: '4.00' }, { value: '12', label: '6.00' },
            { value: '13', label: '8.00' }
        ],
        visibleIf: settings => settings.GOVERNOR_MODE !== 4,
        label: 'escClosedLoopPGain'
    },
    {
        name: 'I_GAIN', type: 'enum', options: [
            { value: '1', label: '0.13' }, { value: '2', label: '0.17' },
            { value: '3', label: '0.25' }, { value: '4', label: '0.38' },
            { value: '5', label: '0.50' }, { value: '6', label: '0.75' },
            { value: '7', label: '1.00' }, { value: '8', label: '1.50' },
            { value: '9', label: '2.00' }, { value: '10', label: '3.00' },
            { value: '11', label: '4.00' }, { value: '12', label: '6.00' },
            { value: '13', label: '8.00' }
        ],
        visibleIf: settings => settings.GOVERNOR_MODE !== 4,
        label: 'escClosedLoopIGain'
    },
    {
        name: 'MOTOR_GAIN', type: 'enum', options: [
            { value: '1', label: '0.75' }, { value: '2', label: '0.88' },
            { value: '3', label: '1.00' }, { value: '4', label: '1.12' },
            { value: '5', label: '1.25' }
        ],
        label: 'escMotorGain'
    },
    {
        name: 'STARTUP_POWER', type: 'enum', options: [
            { value: '1', label: '0.031' }, { value: '2', label: '0.047' },
            { value: '3', label: '0.063' }, { value: '4', label: '0.094' },
            { value: '5', label: '0.125' }, { value: '6', label: '0.188' },
            { value: '7', label: '0.25' }, { value: '8', label: '0.38' },
            { value: '9', label: '0.50' }, { value: '10', label: '0.75' },
            { value: '11', label: '1.00' }, { value: '12', label: '1.25' },
            { value: '13', label: '1.50' }
        ],
        label: 'escStartupPower'
    },
    {
        name: 'TEMPERATURE_PROTECTION', type: 'bool', label: 'escTemperatureProtection'
    },
    {
        name: 'PWM_DITHER', type: 'enum', label: 'escPWMOutputDither',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: '3' },
            { value: '3', label: '7' }, { value: '4', label: '15' },
            { value: '5', label: '31' }
        ]
    },
    {
        name: 'LOW_RPM_POWER_PROTECTION', type: 'bool', label: 'escLowRPMPowerProtection'
    },
    {
        name: 'BRAKE_ON_STOP', type: 'bool', label: 'escBrakeOnStop'
    },
    {
        name: 'DEMAG_COMPENSATION', type: 'enum', label: 'escDemagCompensation',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ]
    },
    {
        name: 'PWM_FREQUENCY', type: 'enum', label: 'escPWMFrequencyDamped',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'DampedLight' }
        ]
    },
    {
        name: 'PWM_INPUT', type: 'bool', label: 'escEnablePWMInput'
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', label: 'escMotorTiming',
        options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ]
    },
    {
        name: 'INPUT_PWM_POLARITY', type: 'enum', label: 'escInputPolarity',
        options: [
            { value: '1', label: 'Positive' }, { value: '2', label: 'Negative' }
        ]
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', label: 'escBeaconDelay',
        options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ]
    }
];

// layout 20, 14.0, 14.1, 14.2, 14.3, 14.4
var BLHELI_MULTI_SETTINGS_LAYOUT_20 = [
    {
        name: 'PROGRAMMING_BY_TX', type: 'bool', label: 'escProgrammingByTX'
    },
    {
        name: 'GOVERNOR_MODE', type: 'enum', label: 'escClosedLoopMode',
        options: [
            { value: '1', label: 'HiRange' }, { value: '2', label: 'MidRange' },
            { value: '3', label: 'LoRange' }, { value: '4', label: 'Off' }
        ]
    },
    {
        name: 'P_GAIN', type: 'enum', options: [
            { value: '1', label: '0.13' }, { value: '2', label: '0.17' },
            { value: '3', label: '0.25' }, { value: '4', label: '0.38' },
            { value: '5', label: '0.50' }, { value: '6', label: '0.75' },
            { value: '7', label: '1.00' }, { value: '8', label: '1.50' },
            { value: '9', label: '2.00' }, { value: '10', label: '3.00' },
            { value: '11', label: '4.00' }, { value: '12', label: '6.00' },
            { value: '13', label: '8.00' }
        ],
        visibleIf: settings => settings.GOVERNOR_MODE !== 4,
        label: 'escClosedLoopPGain'
    },
    {
        name: 'I_GAIN', type: 'enum', options: [
            { value: '1', label: '0.13' }, { value: '2', label: '0.17' },
            { value: '3', label: '0.25' }, { value: '4', label: '0.38' },
            { value: '5', label: '0.50' }, { value: '6', label: '0.75' },
            { value: '7', label: '1.00' }, { value: '8', label: '1.50' },
            { value: '9', label: '2.00' }, { value: '10', label: '3.00' },
            { value: '11', label: '4.00' }, { value: '12', label: '6.00' },
            { value: '13', label: '8.00' }
        ],
        visibleIf: settings => settings.GOVERNOR_MODE !== 4,
        label: 'escClosedLoopIGain'
    },
    {
        name: 'MOTOR_GAIN', type: 'enum', options: [
            { value: '1', label: '0.75' }, { value: '2', label: '0.88' },
            { value: '3', label: '1.00' }, { value: '4', label: '1.12' },
            { value: '5', label: '1.25' }
        ],
        label: 'escMotorGain'
    },
    {
        name: 'STARTUP_POWER', type: 'enum', options: [
            { value: '1', label: '0.031' }, { value: '2', label: '0.047' },
            { value: '3', label: '0.063' }, { value: '4', label: '0.094' },
            { value: '5', label: '0.125' }, { value: '6', label: '0.188' },
            { value: '7', label: '0.25' }, { value: '8', label: '0.38' },
            { value: '9', label: '0.50' }, { value: '10', label: '0.75' },
            { value: '11', label: '1.00' }, { value: '12', label: '1.25' },
            { value: '13', label: '1.50' }
        ],
        label: 'escStartupPower'
    },
    {
        name: 'TEMPERATURE_PROTECTION', type: 'bool', label: 'escTemperatureProtection'
    },
    {
        name: 'PWM_DITHER', type: 'enum', label: 'escPWMOutputDither',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: '7' },
            { value: '3', label: '15' }, { value: '4', label: '31' },
            { value: '5', label: '63' }
        ]
    },
    {
        name: 'LOW_RPM_POWER_PROTECTION', type: 'bool', label: 'escLowRPMPowerProtection'
    },
    {
        name: 'DEMAG_COMPENSATION', type: 'enum', label: 'escDemagCompensation',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ]
    },
    {
        name: 'PWM_FREQUENCY', type: 'enum', label: 'escPWMFrequencyDamped',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'DampedLight' }
        ]
    },
    {
        name: 'PWM_INPUT', type: 'bool', label: 'escEnablePWMInput'
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', label: 'escMotorTiming',
        options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ]
    },
    {
        name: 'INPUT_PWM_POLARITY', type: 'enum', label: 'escInputPolarity',
        options: [
            { value: '1', label: 'Positive' }, { value: '2', label: 'Negative' }
        ]
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', label: 'escBeaconDelay',
        options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ]
    }
];

// layout 19, 13.2
var BLHELI_MULTI_SETTINGS_LAYOUT_19 = [
    {
        name: 'PROGRAMMING_BY_TX', type: 'bool', label: 'escProgrammingByTX'
    },
    {
        name: 'GOVERNOR_MODE', type: 'enum', label: 'escClosedLoopMode',
        options: [
            { value: '1', label: 'HiRange' }, { value: '2', label: 'MidRange' },
            { value: '3', label: 'LoRange' }, { value: '4', label: 'Off' }
        ]
    },
    {
        name: 'P_GAIN', type: 'enum', options: [
            { value: '1', label: '0.13' }, { value: '2', label: '0.17' },
            { value: '3', label: '0.25' }, { value: '4', label: '0.38' },
            { value: '5', label: '0.50' }, { value: '6', label: '0.75' },
            { value: '7', label: '1.00' }, { value: '8', label: '1.50' },
            { value: '9', label: '2.00' }, { value: '10', label: '3.00' },
            { value: '11', label: '4.00' }, { value: '12', label: '6.00' },
            { value: '13', label: '8.00' }
        ],
        visibleIf: settings => settings.GOVERNOR_MODE !== 4,
        label: 'escClosedLoopPGain'
    },
    {
        name: 'I_GAIN', type: 'enum', options: [
            { value: '1', label: '0.13' }, { value: '2', label: '0.17' },
            { value: '3', label: '0.25' }, { value: '4', label: '0.38' },
            { value: '5', label: '0.50' }, { value: '6', label: '0.75' },
            { value: '7', label: '1.00' }, { value: '8', label: '1.50' },
            { value: '9', label: '2.00' }, { value: '10', label: '3.00' },
            { value: '11', label: '4.00' }, { value: '12', label: '6.00' },
            { value: '13', label: '8.00' }
        ],
        visibleIf: settings => settings.GOVERNOR_MODE !== 4,
        label: 'escClosedLoopIGain'
    },
    {
        name: 'LOW_VOLTAGE_LIMIT', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: '3.0V/c' },
            { value: '3', label: '3.1V/c' }, { value: '4', label: '3.2V/c' },
            { value: '5', label: '3.3V/c' }, { value: '6', label: '3.4V/c' }
        ],
        label: 'escLowVoltageLimit'
    },
    {
        name: 'MOTOR_GAIN', type: 'enum', options: [
            { value: '1', label: '0.75' }, { value: '2', label: '0.88' },
            { value: '3', label: '1.00' }, { value: '4', label: '1.12' },
            { value: '5', label: '1.25' }
        ],
        label: 'escMotorGain'
    },
    {
        name: 'STARTUP_POWER', type: 'enum', options: [
            { value: '1', label: '0.031' }, { value: '2', label: '0.047' },
            { value: '3', label: '0.063' }, { value: '4', label: '0.094' },
            { value: '5', label: '0.125' }, { value: '6', label: '0.188' },
            { value: '7', label: '0.25' }, { value: '8', label: '0.38' },
            { value: '9', label: '0.50' }, { value: '10', label: '0.75' },
            { value: '11', label: '1.00' }, { value: '12', label: '1.25' },
            { value: '13', label: '1.50' }
        ],
        label: 'escStartupPower'
    },
    {
        name: 'TEMPERATURE_PROTECTION', type: 'bool', label: 'escTemperatureProtection'
    },
    {
        name: 'DEMAG_COMPENSATION', type: 'enum', label: 'escDemagCompensation',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ]
    },
    {
        name: 'PWM_FREQUENCY', type: 'enum', label: 'escPWMFrequencyDamped',
        options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'DampedLight' }
        ]
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', label: 'escMotorTiming',
        options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ]
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', label: 'escBeaconDelay',
        options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ]
    }
];

var BLHELI_SETTINGS_DESCRIPTIONS = {
    // BLHeli_S
    '33': {
        MULTI: {
            base: BLHELI_S_SETTINGS_LAYOUT_33
        },
        // There is no MAIN nor MULTI mode in BLHeli_S, added for completeness
        MAIN: {
            base: []
        },
        TAIL: {
            base: []
        }
    },
    '32': {
        MULTI: {
            base: BLHELI_S_SETTINGS_LAYOUT_32
        },
        // There is no MAIN nor MULTI mode in BLHeli_S, added for completeness
        MAIN: {
            base: []
        },
        TAIL: {
            base: []
        }
    },

    // BLHeli
    '21': {
        MULTI: {
            base: BLHELI_MULTI_SETTINGS_LAYOUT_21,
            overrides: {
                '14.5': [
                    {
                        name: 'PWM_DITHER', type: 'enum', label: 'escPWMOutputDither',
                        options: [
                            { value: '1', label: 'Off' }, { value: '2', label: '7' },
                            { value: '3', label: '15' }, { value: '4', label: '31' },
                            { value: '5', label: '63' }
                        ]
                    }
                ],
            }
        },
        MAIN: {
            base: []
        },
        TAIL: {
            base: []
        }
    },

    '20': {
        MULTI: {
            base: BLHELI_MULTI_SETTINGS_LAYOUT_20,
            overrides: {
                '14.0': [
                    {
                        name: 'PWM_DITHER', type: 'enum', label: 'escPWMOutputDither',
                        options: [
                            { value: '1', label: '1' }, { value: '2', label: '3' },
                            { value: '3', label: '7' }, { value: '4', label: '15' },
                            { value: '5', label: '31' }
                        ]
                    }
                ]
            }
        },
        MAIN: {
            base: []
        },
        TAIL: {
            base: []
        }
    },

    '19': {
        MULTI: {
            base: BLHELI_MULTI_SETTINGS_LAYOUT_19
        },
        MAIN: {
            base: []
        },
        TAIL: {
            base: []
        }
    }
};

// @todo add validation for min/max throttle
var BLHELI_S_INDIVIDUAL_SETTINGS = [
    {
        name: 'MOTOR_DIRECTION', type: 'enum', label: 'escMotorDirection',
        options: [
            { value: '1', label: 'Normal' }, { value: '2', label: 'Reversed' },
            { value: '3', label: 'Bidirectional' }, { value: '4', label: 'Bidirectional Reversed' }
        ]
    },
    {
        name: 'PPM_MIN_THROTTLE', type: 'number', min: 1000, max: 1500, step: 1, label: 'escPPMMinThrottle',
        offset: 1000, factor: 4, suffix: ' μs'
    },
    {
        name: 'PPM_MAX_THROTTLE', type: 'number', min: 1504, max: 2020, step: 1, label: 'escPPMMaxThrottle',
        offset: 1000, factor: 4, suffix: ' μs'
    },
    {
        name: 'PPM_CENTER_THROTTLE', type: 'number', min: 1504, max: 2020, step: 1, label: 'escPPMCenterThrottle',
        offset: 1000, factor: 4, suffix: ' μs',
        visibleIf: settings => [ 3, 4 ].includes(settings.MOTOR_DIRECTION)
    }
];

var BLHELI_INDIVIDUAL_SETTINGS = [
    {
        name: 'MOTOR_DIRECTION', type: 'enum', label: 'escMotorDirection',
        options: [
            { value: '1', label: 'Normal' }, { value: '2', label: 'Reversed' },
            { value: '3', label: 'Bidirectional' }
        ]
    },
    {
        name: 'PPM_MIN_THROTTLE', type: 'number', min: 1000, max: 1500, step: 4, label: 'escPPMMinThrottle',
        offset: 1000, factor: 4, suffix: ' μs'
    },
    {
        name: 'PPM_MAX_THROTTLE', type: 'number', min: 1504, max: 2020, step: 1, label: 'escPPMMaxThrottle',
        offset: 1000, factor: 4, suffix: ' μs'
    },
    {
        name: 'PPM_CENTER_THROTTLE', type: 'number', min: 1504, max: 2020, step: 1, label: 'escPPMCenterThrottle',
        offset: 1000, factor: 4, suffix: ' μs',
        visibleIf: settings => settings.MOTOR_DIRECTION === 3
    }
];

var BLHELI_INDIVIDUAL_SETTINGS_DESCRIPTIONS = {
    // BLHeli_S
    '33': {
        base: BLHELI_S_INDIVIDUAL_SETTINGS
    },
    '32': {
        base: BLHELI_S_INDIVIDUAL_SETTINGS
    },

    // BLHeli
    '21': {
        base: BLHELI_INDIVIDUAL_SETTINGS
    },
    '20': {
        base: BLHELI_INDIVIDUAL_SETTINGS
    },
    '19': {
        base: BLHELI_INDIVIDUAL_SETTINGS
    }
};

// @todo reconsinder, I don't like coupling between UI and underlying settings and versioning
function blheliCanMigrate(settingName, fromSettings, toSettings) {
    if (fromSettings.MODE === BLHELI_MODES.MULTI && toSettings.MODE === BLHELI_MODES.MULTI) {
        var fromCommons = BLHELI_SETTINGS_DESCRIPTIONS[fromSettings.LAYOUT_REVISION].MULTI.base,
            toCommons = BLHELI_SETTINGS_DESCRIPTIONS[toSettings.LAYOUT_REVISION].MULTI.base;

        var fromCommon = fromCommons.find(setting => setting.name === settingName),
            toCommon = toCommons.find(setting => setting.name === settingName);

        if (fromCommon && toCommon) {
            return true;
        }

        var fromIndividuals = BLHELI_INDIVIDUAL_SETTINGS_DESCRIPTIONS[fromSettings.LAYOUT_REVISION].base,
            toIndividuals = BLHELI_INDIVIDUAL_SETTINGS_DESCRIPTIONS[toSettings.LAYOUT_REVISION].base;

        var fromIndividual = fromIndividuals.find(setting => setting.name === settingName),
            toIndividual = toIndividuals.find(setting => setting.name === settingName);

        if (fromIndividual && toIndividual) {
            return true;
        }
    }

    return false;
}

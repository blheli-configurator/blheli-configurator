'use strict';

/* 
        rows.push(this.renderCheckbox('PROGRAMMING_BY_TX', 'escProgrammingByTX'));
        rows.push(this.renderSelect(
            'GOVERNOR_MODE',
            [ [ '1', 'HiRange' ], [ '2', 'MidRange' ], [ '3', 'LoRange' ], [ '4', 'Off' ] ],
            'escClosedLoopMode'
        ));
        if (this.props.escSettings[0][BLHELI_LAYOUT['GOVERNOR_MODE'].offset] !== 4) {
            const options = [
                [ '1', '0.13' ], [ '2', '0.17' ], [ '3', '0.25' ], [ '4', '0.38' ],
                [ '5', '0.50' ], [ '6', '0.75' ], [ '7', '1.00' ], [ '8', '1.50' ],
                [ '9', '2.00' ], [ '10', '3.00' ], [ '11', '4.00' ], [ '12', '6.00' ],
                [ '13', '8.00' ]
            ];

            rows.push(this.renderSelect('P_GAIN', options, 'escClosedLoopPGain'));
            rows.push(this.renderSelect('I_GAIN', options, 'escClosedLoopIGain'));
        }
        rows.push(this.renderSelect(
            'MOTOR_GAIN',
            [ [ '1', '0.75' ], [ '2', '0.88' ], [ '3', '1.00' ], [ '4', '1.12' ], [ '5', '1.25'] ],
            'escMotorGain'
        ));
        rows.push(this.renderSelect(
            'STARTUP_POWER',
            [ [ '1', '0.031' ], [ '2', '0.047' ], [ '3', '0.063' ], [ '4', '0.094' ], [ '5', '0.125' ], [ '6', '0.188' ], [ '7', '0.25' ], [ '8', '0.38' ], [ '9', '0.50' ], [ '10', '0.75' ], [ '11', '1.00' ], [ '12', '1.25' ], [ '13', '1.50' ] ],
            'escStartupPower'
        ));
        rows.push(this.renderCheckbox('TEMPERATURE_PROTECTION', 'escTemperatureProtection'));
        rows.push(this.renderSelect(
            'PWM_DITHER',
            [ [ '1', 'Off' ], [ '2', '3' ], [ '3', '7' ], [ '4', '15' ], [ '5', '31' ] ],
            'escPWMOutputDither'
        ));
        rows.push(this.renderCheckbox('LOW_RPM_POWER_PROTECTION', 'escLowRPMPowerProtection'));
        rows.push(this.renderCheckbox('BRAKE_ON_STOP', 'escBrakeOnStop'));
        rows.push(this.renderSelect(
            'DEMAG_COMPENSATION',
            [ [ '1', 'Off' ], [ '2', 'Low' ], [ '3', 'High' ] ],
            'escDemagCompensation'
        ));
        rows.push(this.renderSelect(
            'PWM_FREQUENCY',
            [ [ '1', 'Off' ], [ '2', 'Low' ], [ '3', 'DampedLight' ] ],
            'escPWMFrequencyDamped'
        ));
        rows.push(this.renderCheckbox('PWM_INPUT', 'escEnablePWMInput'));
        rows.push(this.renderSelect(
            'COMMUTATION_TIMING',
            [ [ '1', 'Low' ], [ '2', 'MediumLow' ], [ '3', 'Medium' ], [ '4', 'MediumHigh' ], [ '5', 'High' ] ],
            'escMotorTiming'
        ));
        rows.push(this.renderSelect(
            'INPUT_PWM_POLARITY',
            [ [ '1', 'Positive' ], [ '2', 'Negative' ] ],
            'escInputPolarity'
        ));
        rows.push(this.renderNumber('BEEP_STRENGTH', 1, 255, 1, 'escBeepStrength'));
        rows.push(this.renderNumber('BEACON_STRENGTH', 1, 255, 1, 'escBeaconStrength'));
        rows.push(this.renderSelect(
            'BEACON_DELAY',
            [ [ '1', '1 minute' ], [ '2', '2 minutes' ], [ '3', '5 minutes' ], [ '4', '10 minutes' ], [ '5', 'Infinite' ] ],
            'escBeaconDelay'
        ));

        return rows;
    }
    */
// layout 32, 16.0, 16.1, 16.2, 16.3
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
        name: 'DEMAG_COMPENSATION', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ],
        label: 'escDemagCompensation'
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ],
        label: 'escMotorTiming'
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ],
        label: 'escBeaconDelay'
    }
];

// layout 21, 14.5, 14.6, 14.7
var BLHELI_MULTI_SETTINGS_LAYOUT_21 = [
    {
        name: 'PROGRAMMING_BY_TX', type: 'bool', label: 'escProgrammingByTX'
    },
    {
        name: 'GOVERNOR_MODE', type: 'enum', options: [
            { value: '1', label: 'HiRange' }, { value: '2', label: 'MidRange' },
            { value: '3', label: 'LoRange' }, { value: '4', label: 'Off' }
        ],
        label: 'escClosedLoopMode'
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
        name: 'PWM_DITHER', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: '3' },
            { value: '3', label: '7' }, { value: '4', label: '15' },
            { value: '5', label: '31' }
        ],
        label: 'escPWMOutputDither'
    },
    {
        name: 'LOW_RPM_POWER_PROTECTION', type: 'bool', label: 'escLowRPMPowerProtection'
    },
    {
        name: 'BRAKE_ON_STOP', type: 'bool', label: 'escBrakeOnStop'
    },
    {
        name: 'DEMAG_COMPENSATION', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ],
        label: 'escDemagCompensation'
    },
    {
        name: 'PWM_FREQUENCY', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'DampedLight' }
        ],
        label: 'escPWMFrequencyDamped'
    },
    {
        name: 'PWM_INPUT', type: 'bool', label: 'escEnablePWMInput'
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ],
        label: 'escMotorTiming'
    },
    {
        name: 'INPUT_PWM_POLARITY', type: 'enum', options: [
            { value: '1', label: 'Positive' }, { value: '2', label: 'Negative' }
        ],
        label: 'escInputPolarity'
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ],
        label: 'escBeaconDelay'
    }
];

// layout 20, 14.0, 14.1, 14.2, 14.3, 14.4
var BLHELI_MULTI_SETTINGS_LAYOUT_20 = [
    {
        name: 'PROGRAMMING_BY_TX', type: 'bool', label: 'escProgrammingByTX'
    },
    {
        name: 'GOVERNOR_MODE', type: 'enum', options: [
            { value: '1', label: 'HiRange' }, { value: '2', label: 'MidRange' },
            { value: '3', label: 'LoRange' }, { value: '4', label: 'Off' }
        ],
        label: 'escClosedLoopMode'
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
        name: 'PWM_DITHER', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: '7' },
            { value: '3', label: '15' }, { value: '4', label: '31' },
            { value: '5', label: '63' }
        ],
        label: 'escPWMOutputDither'
    },
    {
        name: 'LOW_RPM_POWER_PROTECTION', type: 'bool', label: 'escLowRPMPowerProtection'
    },
    {
        name: 'DEMAG_COMPENSATION', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ],
        label: 'escDemagCompensation'
    },
    {
        name: 'PWM_FREQUENCY', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'DampedLight' }
        ],
        label: 'escPWMFrequencyDamped'
    },
    {
        name: 'PWM_INPUT', type: 'bool', label: 'escEnablePWMInput'
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ],
        label: 'escMotorTiming'
    },
    {
        name: 'INPUT_PWM_POLARITY', type: 'enum', options: [
            { value: '1', label: 'Positive' }, { value: '2', label: 'Negative' }
        ],
        label: 'escInputPolarity'
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ],
        label: 'escBeaconDelay'
    }
];

// layout 19, 13.2
var BLHELI_MULTI_SETTINGS_LAYOUT_19 = [
    {
        name: 'PROGRAMMING_BY_TX', type: 'bool', label: 'escProgrammingByTX'
    },
    {
        name: 'GOVERNOR_MODE', type: 'enum', options: [
            { value: '1', label: 'HiRange' }, { value: '2', label: 'MidRange' },
            { value: '3', label: 'LoRange' }, { value: '4', label: 'Off' }
        ],
        label: 'escClosedLoopMode'
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
        label: 'escClosedLoopIGain'
    },
    {
        name: 'LOW_VOLTAGE_LIMIT', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: '3.0V/c' },
            { value: '3', label: '3.1V/c' }, { value: '4', label: '3.2V/c' },
            { value: '5', label: '3.03/c' }, { value: '6', label: '3.4V/c' }
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
        name: 'PWM_DITHER', type: 'enum', options: [
            { value: '1', label: '1' }, { value: '2', label: '3' },
            { value: '3', label: '7' }, { value: '4', label: '15' },
            { value: '5', label: '31' }
        ],
        label: 'escPWMOutputDither'
    },
    {
        name: 'DEMAG_COMPENSATION', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'High' }
        ],
        label: 'escDemagCompensation'
    },
    {
        name: 'PWM_FREQUENCY', type: 'enum', options: [
            { value: '1', label: 'Off' }, { value: '2', label: 'Low' },
            { value: '3', label: 'DampedLight' }
        ],
        label: 'escPWMFrequencyDamped'
    },
    {
        name: 'COMMUTATION_TIMING', type: 'enum', options: [
            { value: '1', label: 'Low' }, { value: '2', label: 'MediumLow' },
            { value: '3', label: 'Medium' }, { value: '4', label: 'MediumHigh' },
            { value: '5', label: 'High' }
        ],
        label: 'escMotorTiming'
    },
    {
        name: 'BEEP_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeepStrength'
    },
    {
        name: 'BEACON_STRENGTH', type: 'number', min: 1, max: 255, step: 1, label: 'escBeaconStrength'
    },
    {
        name: 'BEACON_DELAY', type: 'enum', options: [
            { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' },
            { value: '3', label: '5 minutes' }, { value: '4', label: '10 minutes' },
            { value: '5', label: 'Infinite' }
        ],
        label: 'escBeaconDelay'
    }
];

var BLHELI_SETTINGS_DESCRIPTIONS = {
    // BLHeli_S
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
                        name: 'PWM_DITHER', type: 'enum', options: [
                            { value: '1', label: 'Off' }, { value: '2', label: '7' },
                            { value: '3', label: '15' }, { value: '4', label: '31' },
                            { value: '5', label: '63' }
                        ],
                        label: 'escPWMOutputDither'
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
                        name: 'PWM_DITHER', type: 'enum', options: [
                            { value: '1', label: '1' }, { value: '2', label: '3' },
                            { value: '3', label: '7' }, { value: '4', label: '15' },
                            { value: '5', label: '31' }
                        ],
                        label: 'escPWMOutputDither'
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

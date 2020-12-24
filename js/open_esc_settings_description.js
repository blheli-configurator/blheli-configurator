'use strict';

var OPEN_ESC_SETTINGS_LAYOUT_0 = [
    {
        name: 'SINUSOIDAL_STARTUP', type: 'bool', label: 'escSinusoidalStartup'
    },
    {
        name: 'COMPLEMENTARY_PWM', type: 'bool', label: 'escComplementaryPwm'
    },
    {
        name: 'VARIABLE_PWM_FREQUENCY', type: 'bool', label: 'escVariablePwmFrequency'
    },
    {
        name: 'STUCK_ROTOR_PROTECTION', type: 'bool', label: 'escStuckRotorProtection'
    },
    {
        name: 'STALL_PROTECTION', type: 'bool', label: 'escStallProtection'
    },
    {
        name: 'TIMING_ADVANCE', type: 'number', min: 0, max: 22.5, step: 7.5, label: 'escTimingAdvance', displayFactor: 7.5
    },
    {
        name: 'MOTOR_KV', type: 'number', min: 20, max: 10220, step: 40, label: 'escMotorKv', displayFactor: 40, displayOffset: 20
    },
    {
        name: 'MOTOR_POLES', type: 'number', min: 2, max: 36, step: 1, label: 'escMotorPoles'
    },
    {
        name: 'STARTUP_POWER', type: 'number', min: 50, max: 150, step: 1, label: 'escStartupPower'
    },
    {
        name: 'PWM_FREQUENCY', type: 'number', min: 24, max: 48, step: 1, label: 'escPwmFrequency'
    },
    {
        name: 'BRAKE_ON_STOP', type: 'bool', label: 'escBrakeOnStop'
    },
];

var OPEN_ESC_SETTINGS_DESCRIPTIONS = {
    '0': {
        base: OPEN_ESC_SETTINGS_LAYOUT_0
    },
};

// @todo add validation for min/max throttle
var OPEN_ESC_INDIVIDUAL_SETTINGS = [
    {
        name: 'MOTOR_DIRECTION', type: 'bool', label: 'escDirectionReversed'
    },
    {
        name: 'BIDIRECTIONAL_MODE', type: 'bool', label: 'escBidirectionalMode'
    },
];

var OPEN_ESC_INDIVIDUAL_SETTINGS_DESCRIPTIONS = {
    '0': {
        base: OPEN_ESC_INDIVIDUAL_SETTINGS
    },
};

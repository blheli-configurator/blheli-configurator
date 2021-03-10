'use strict';

var OPEN_ESC_DEFAULTS = {
	'0': {
		MOTOR_DIRECTION: 0,
		BIDIRECTIONAL_MODE: 0,
		SINUSOIDAL_STARTUP: 0,
		COMPLEMENTARY_PWM: 1,
		VARIABLE_PWM_FREQUENCY: 1,
		STUCK_ROTOR_PROTECTION: 1,
		TIMING_ADVANCE: 2,
		PWM_FREQUENCY: 24,
		STARTUP_POWER: 100,
		MOTOR_KV: 55,
		MOTOR_POLES: 14,
		BRAKE_ON_STOP: 1,
		STALL_PROTECTION: 0,
	}
	'1': {
		MOTOR_DIRECTION: 0,
		BIDIRECTIONAL_MODE: 0,
		SINUSOIDAL_STARTUP: 0,
		COMPLEMENTARY_PWM: 1,
		VARIABLE_PWM_FREQUENCY: 1,
		STUCK_ROTOR_PROTECTION: 1,
		TIMING_ADVANCE: 2,
		PWM_FREQUENCY: 24,
		STARTUP_POWER: 100,
		MOTOR_KV: 55,
		MOTOR_POLES: 14,
		BRAKE_ON_STOP: 1,
		STALL_PROTECTION: 0,
        	BEEP_VOLUME: 5, 
        	INTERVAL_TELEMETRY: 0,
        	SERVO_LOW_THRESHOLD: 128,
        	SERVO_HIGH_THRESHOLD: 128,
        	SERVO_NEUTRAL: 128,
        	SERVO_DEAD_BAND: 50,
        	LOW_VOLTAGE_CUTOFF: 0,
       	 	LOW_VOLTAGE_THRESHOLD: 50,
        	RC_CAR_REVERSING:0,
	}

};

'use strict';

// define all the global variables that are uses to hold FC state
var CONFIG;
var ESC_CONFIG;

var FC = {
    resetState: function() {
        CONFIG = {
            apiVersion:    "0.0.0",
            flightControllerIdentifier: '',
            flightControllerVersion: '',
            version:       0,
            buildInfo:     '',
            multiType:     0,
            msp_version:   0, // not specified using semantic versioning
            capability:    0,
            cycleTime:     0,
            i2cError:      0,
            activeSensors: 0,
            mode:          0,
            profile:       0,
            uid:           [0, 0, 0],
            accelerometerTrims: [0, 0]
        };

        ESC_CONFIG = {
            connectedESCs: 0          
        };
    }
};
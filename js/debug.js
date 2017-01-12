'use strict';

var Debug = {
    enabled: false,

    getDummySettings: function(type) {
        var ret = blheliSettingsObject(new Uint8Array(BLHELI_LAYOUT_SIZE).fill(0xFF));

        switch (type) {
            case BLHELI_TYPES.BLHELI_S_SILABS: {
                ret.MAIN_REVISION = 16;
                ret.SUB_REVISION = 5;
                ret.LAYOUT_REVISION = 33;
                ret.MODE = BLHELI_MODES.MULTI;
                ret.LAYOUT = '#A_H_00#';
                ret.MCU = '#BLHELI$EFM8B21#';
                ret.NAME = '';
                break;
            }
            case BLHELI_TYPES.SILABS: {
                ret.MAIN_REVISION = 14;
                ret.SUB_REVISION = 5;
                ret.LAYOUT_REVISION = 21;
                ret.MODE = BLHELI_MODES.MULTI;
                ret.LAYOUT = '#DYS_XM20A#';
                ret.MCU = '#BLHELI#F390#';
                ret.NAME = '';
                break;
            }
            case BLHELI_TYPES.ATMEL: {
                ret.MAIN_REVISION = 14;
                ret.SUB_REVISION = 5;
                ret.LAYOUT_REVISION = 21;
                ret.MODE = BLHELI_MODES.MULTI;
                ret.LAYOUT = '#DYS_SN20A#';
                ret.MCU = '#BLHELI#Am8A#';
                ret.NAME = '';
                break;
            }
            default: throw new Error('Logic error');
        }

        return ret;
    },

    getDummyMetainfo: function(type) {
        var ret = { available: true, interfaceMode: _4way_modes.SiLBLB };

        switch (type) {
            case BLHELI_TYPES.BLHELI_S_SILABS: ret.signature = 0xE8B2; break;
            case BLHELI_TYPES.SILABS: ret.signature = 0xF390; break;
            case BLHELI_TYPES.ATMEL: ret.signature = 0x9307; break;
            default: throw new Error('Logic error');
        }

        return ret;
    },

    
};

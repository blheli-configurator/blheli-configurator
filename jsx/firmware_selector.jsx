'use strict';

var BLHELI_TYPES = {
    BLHELI_S_SILABS: 'BLHeli_S SiLabs',
    SILABS: 'SiLabs',
    ATMEL: 'Atmel'
};

var FirmwareSelector = React.createClass({
    getInitialState: function() {
        const escHint = this.props.escHint;

        var selectedEsc;
        if (BLHELI_S_SILABS_ESCS.hasOwnProperty(escHint) ||
            BLHELI_SILABS_ESCS.hasOwnProperty(escHint) ||
            BLHELI_ATMEL_ESCS.hasOwnProperty(escHint)) {
            selectedEsc = escHint;
        }

        var type;
        if (BLHELI_S_SILABS_MCUS.find(x => x.signature === this.props.signatureHint)) {
            type = BLHELI_TYPES.BLHELI_S_SILABS;
        } else if (BLHELI_SILABS_MCUS.find(x => x.signature === this.props.signatureHint)) {
            type = BLHELI_TYPES.SILABS;
        } else if (BLHELI_ATMEL_MCUS.find(x => x.signature === this.props.signatureHint)) {
            type = BLHELI_TYPES.ATMEL;
        } else {
            throw new Error('Unknown MCU signature: ' + this.props.signatureHint.toString(0x10));
        }

        return {
            selectedEsc: selectedEsc,
            selectedMode: this.props.modeHint,
            selectedVersion: -1,
            selectedUrl: null,
            type: type
        };
    },
    render: function() {
        return (
            <div className="centerWrapper">
                <div className="gui_box grey">
                    <div className="gui_box_titlebar">
                        <div className="spacer_box_title">Select Target</div>
                    </div>
                    <div className="spacer_box">
                        {this.renderEscSelect()}
                        {this.renderModeSelect()}
                        {this.renderVersionSelect()}
                        <div className="default_btn">
                            <a
                                href="#"
                                className={
                                    this.state.selectedEsc &&
                                    (this.state.type === BLHELI_TYPES.BLHELI_S_SILABS || this.state.selectedMode) &&
                                    this.state.selectedVersion !== -1 ? "" : "disabled"
                                }
                                onClick={this.onlineFirmwareSelected}
                            >
                                {chrome.i18n.getMessage('escButtonSelect')}
                            </a>
                        </div>
                        <div className="default_btn">
                            <a
                                href="#"
                                onClick={this.localFirmwareSelected}
                            >
                                {chrome.i18n.getMessage('escButtonSelectLocally')}
                            </a>
                        </div>
                        <div className="default_btn">
                            <a
                                href="#"
                                onClick={this.props.onCancel}
                            >
                                {chrome.i18n.getMessage('buttonCancel')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    },
    renderEscSelect: function() {
        var description;
        switch (this.state.type) {
            case BLHELI_TYPES.BLHELI_S_SILABS: description = BLHELI_S_SILABS_ESCS; break;
            case BLHELI_TYPES.SILABS: description = BLHELI_SILABS_ESCS; break;
            case BLHELI_TYPES.ATMEL: description = BLHELI_ATMEL_ESCS; break;
        }

        var escs = [
            <option className="hidden" disabled selected>Select ESC</option>
        ];

        for (const layout in description) {
            if (description.hasOwnProperty(layout)) {
                const ESC = description[layout];
                escs.push(
                    <option value={layout}>{ESC.name}</option>
                );
            }
        }

        return (
            <div className="select">
                <label>
                    <select onChange={this.escSelected} value={this.state.selectedEsc}>
                        {escs}
                    </select>
                    <span>ESC</span>
                </label>
            </div>
        );
    },
    renderModeSelect: function() {
        // Display only for BLHeli
        if (this.state.type !== BLHELI_TYPES.BLHELI_S_SILABS) {
            var modes = [
                <option className="hidden" disabled selected>Select Mode</option>
            ];

            for (const mode in BLHELI_MODES) {
                if (BLHELI_MODES.hasOwnProperty(mode)) {
                    modes.push(
                        <option value={mode}>{mode}</option>
                    );
                }
            }

            return (
                <div className="select">
                    <label>
                        <select onChange={this.modeSelected} value={this.state.selectedMode}>
                            {modes}
                        </select>
                        <span>Mode</span>
                    </label>
                </div>
            );
        }
    },
    renderVersionSelect: function() {
        var versions;

        switch (this.state.type) {
            case BLHELI_TYPES.BLHELI_S_SILABS: versions = BLHELI_S_SILABS_VERSIONS; break;
            case BLHELI_TYPES.SILABS: versions = BLHELI_SILABS_VERSIONS; break;
            case BLHELI_TYPES.ATMEL: versions = BLHELI_ATMEL_VERSIONS; break;
        }

        var options = [];
        versions.forEach((version, idx) => {
            if (version.multishot && this.state.selectedMode !== blheliModeToString(BLHELI_MODES.MULTI)) {
                return;
            }

            options.push(
                <option value={idx}>{version.name}</option>
            );
        });

        return (
            <div className="select">
                <label>
                    <select onChange={this.versionSelected} value={this.state.selectedVersion}>
                        <option className="hidden" disabled selected value="-1">Select Version</option>
                        {options}
                    </select>
                    <span>Version</span>
                </label>
            </div>
        );
    },
    escSelected: function(e) {
        this.setState({
            selectedEsc: e.target.value
        });
    },
    modeSelected: function(e) {
        this.setState({
            selectedMode: e.target.value,
            selectedVersion: -1
        });
    },
    versionSelected: function(e) {
        this.setState({
            selectedVersion: e.target.value
        });
    },
    onlineFirmwareSelected: async function() {
        var versions, escs;

        switch (this.state.type) {
            case BLHELI_TYPES.BLHELI_S_SILABS: versions = BLHELI_S_SILABS_VERSIONS; escs = BLHELI_S_SILABS_ESCS; break;
            case BLHELI_TYPES.SILABS: versions = BLHELI_SILABS_VERSIONS; escs = BLHELI_SILABS_ESCS; break;
            case BLHELI_TYPES.ATMEL: versions = BLHELI_ATMEL_VERSIONS; escs = BLHELI_ATMEL_ESCS; break;
        }

        const version = versions[this.state.selectedVersion];

        const url = version.url.format(
            version.commit,
            escs[this.state.selectedEsc].name.replace(/\s/g, '_').toUpperCase(),
            this.state.selectedMode,
            version.version.replace(/\./g, '_')
        );

        try {
            const hex = await getFromCache(version.key, url);
            var eep;
            if (this.state.type === BLHELI_TYPES.ATMEL) {
                eep = await getFromCache(version.key + 'EEP', url.replace('Hex files', 'Eeprom files').replace('.HEX', '.EEP'));
            }

            googleAnalytics.sendEvent('ESC', 'RemoteFirmwareLoaded', version.key);

            this.props.onFirmwareLoaded(hex, eep);
        } catch (error) {
            GUI.log('Could not load firmware for {0} {1} {2}: <span style="color: red">{3}</span>'.format(
                escs[this.state.selectedEsc].name,
                this.state.selectedMode,
                version.version,
                error.message
            ));

            googleAnalytics.sendEvent('ESC', 'RemoteFirmwareLoadFailed', version.key);
        }
    },
    localFirmwareSelected: async function() {
        try {
            const hex = await selectFile('hex');
            var eep;
            if (this.state.type === BLHELI_TYPES.ATMEL) {
                eep = await selectFile('eep');
            }

            googleAnalytics.sendEvent('ESC', 'LocalFirmwareLoaded');

            this.props.onFirmwareLoaded(hex, eep);
        } catch (error) {
            GUI.log('Could not load local firmware: ' + error.message);
        }
    },
});

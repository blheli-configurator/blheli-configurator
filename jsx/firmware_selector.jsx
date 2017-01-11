'use strict';

var FirmwareSelector = React.createClass({
    getInitialState: function() {
        const escHint = this.props.escHint;

        var selectedEsc;
        if (this.props.supportedESCs.layouts[BLHELI_TYPES.BLHELI_S_SILABS].hasOwnProperty(escHint) ||
            this.props.supportedESCs.layouts[BLHELI_TYPES.SILABS].hasOwnProperty(escHint) ||
            this.props.supportedESCs.layouts[BLHELI_TYPES.ATMEL].hasOwnProperty(escHint)) {
            selectedEsc = escHint;
        }

        var type;
        if (findMCU(this.props.signatureHint, this.props.supportedESCs.signatures[BLHELI_TYPES.BLHELI_S_SILABS])) {
            type = BLHELI_TYPES.BLHELI_S_SILABS;
        } else if (findMCU(this.props.signatureHint, this.props.supportedESCs.signatures[BLHELI_TYPES.SILABS])) {
            type = BLHELI_TYPES.SILABS;
        } else if (findMCU(this.props.signatureHint, this.props.supportedESCs.signatures[BLHELI_TYPES.ATMEL])) {
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
    componentWillMount: function() {
        fetchJSON(BLHELI_VERSIONS_KEY, BLHELI_VERSIONS_REMOTE, BLHELI_VERSIONS_LOCAL)
        .then(json => this.setState({ versions: json }));
    },
    render: function() {
        if (!this.state.versions) return null;

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
        const description = this.props.supportedESCs.layouts[this.state.type];

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
        const versions = this.state.versions[this.state.type];

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
        const versions = this.state.versions[this.state.type];
        const version = versions[this.state.selectedVersion];
        const escs = this.props.supportedESCs.layouts[this.state.type];

        const url = version.url.format(
            escs[this.state.selectedEsc].name.replace(/\s/g, '_').toUpperCase(),
            this.state.selectedMode
        );

        const cacheKey = this.state.type === BLHELI_TYPES.BLHELI_S_SILABS ?
            version.key + '_' + this.state.selectedEsc :
            version.key + '_' + this.state.selectedEsc + '_' + this.state.selectedMode;

        try {
            const hex = await getFromCache(cacheKey, url);
            var eep;
            if (this.state.type === BLHELI_TYPES.ATMEL) {
                eep = await getFromCache(cacheKey + 'EEP', url.replace('Hex files', 'Eeprom files').replace('.HEX', '.EEP'));
            }

            googleAnalytics.sendEvent('ESC', 'RemoteFirmwareLoaded', cacheKey);

            console.log(hex.length);
            //this.props.onFirmwareLoaded(hex, eep);
        } catch (error) {
            GUI.log('Could not load firmware for {0} {1} {2}: <span style="color: red">{3}</span>'.format(
                escs[this.state.selectedEsc].name,
                this.state.selectedMode,
                version.name,
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

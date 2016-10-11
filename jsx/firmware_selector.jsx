'use strict';

var FirmwareSelector = React.createClass({
    getInitialState: function() {
        return {
            selectedEsc: this.props.escHint,
            selectedMode: this.props.modeHint,
            selectedVersion: null
        };
    },
    render: function() {
        return (
            <div className="centerWrapper">
                {this.renderHardwareList()}
            </div>
        );
    },
    renderHardwareList: function() {
        var escs = [
            <option className="hidden" disabled selected>Select ESC</option>
        ];

        for (const layout in BLHELI_SILABS_ESCS) {
            if (BLHELI_SILABS_ESCS.hasOwnProperty(layout)) {
                const ESC = BLHELI_SILABS_ESCS[layout];
                escs.push(
                    <option value={layout}>{ESC.name}</option>
                );
            }
        }

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
            <div className="gui_box grey">
                <div className="gui_box_titlebar">
                    <div className="spacer_box_title">Select Target</div>
                </div>
                <div className="spacer_box">
                    <div className="select">
                        <label>
                            <select onChange={this.escSelected} value={this.props.escHint}>
                                {escs}
                            </select>
                            <span>ESC</span>
                        </label>
                    </div>
                    <div className="select">
                        <label>
                            <select onChange={this.modeSelected} value={this.props.modeHint}>
                                {modes}
                            </select>
                            <span>Mode</span>
                        </label>
                    </div>
                    <div className="select">
                        <label>
                            <select onChange={this.versionSelected}>
                                <option className="hidden" disabled selected>Select Version</option>
                                {BLHELI_SILABS_VERSIONS.map(
                                    version => <option value={version.version}>{version.version}</option>)
                                }
                            </select>
                            <span>Version</span>
                        </label>
                    </div>
                    <div className="default_btn">
                        <a
                            href="#"
                            className={
                                this.state.selectedEsc &&
                                this.state.selectedMode &&
                                this.state.selectedVersion ? "" : "disabled"
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
        );
    },
    escSelected: function(e) {
        this.setState({
            selectedEsc: e.target.value
        });
    },
    modeSelected: function(e) {
        this.setState({
            selectedMode: e.target.value
        });
    },
    versionSelected: function(e) {
        this.setState({
            selectedVersion: e.target.value
        });
    },
    onlineFirmwareSelected: async function() {
        const url = BLHELI_SILABS_BASE_URL.format(
            BLHELI_SILABS_VERSIONS.find(version => version.version === this.state.selectedVersion).commit,
            BLHELI_SILABS_ESCS[this.state.selectedEsc].name.replace(/\s/g, '_').toUpperCase(),
            this.state.selectedMode,
            this.state.selectedVersion.replace(/\./g, '_')
        );

        try {
            const hex = await getFileFromCache(url);
            // @todo also EEP for Atmel
            this.props.onFirmwareLoaded(hex);
        } catch (error) {
            GUI.log('Could not load firmware for {0} {1} {2}: {3}'.format(
                BLHELI_SILABS_ESCS[this.state.selectedEsc].name,
                this.state.selectedMode,
                this.state.selectedVersion,
                error.message
            ));
        }
    },
    localFirmwareSelected: async function() {
        try {
            const hex = await selectFile('hex');
            var eep;
            if (false) {
                eep = await selectFile('eep');
            }

            this.props.onFirmwareLoaded(hex, eep);
        } catch (error) {
            GUI.log('Could not load local firmware: ' + error.message);
        }
    },
});

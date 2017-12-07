'use strict';

TABS.esc = {
    initialize: function initialize(callback) {
        if (GUI.active_tab != 'esc') {
            GUI.active_tab = 'esc';
            googleAnalytics.sendAppView('ESC');
        }

        ReactDOM.render(React.createElement(Configurator, { escCount: ESC_CONFIG.connectedESCs }), document.getElementById('content'));

        GUI.content_ready(callback);
    },

    cleanup: function cleanup(callback) {
        if (!CONFIGURATOR.connectionValid || !CONFIGURATOR.escActive) {
            if (callback) callback();
            return;
        }

        // tell 4-way interface to return control to MSP server
        _4way.exit().catch(function () {})
        // now we can return control to MSP or CLI handlers
        .finally(function () {
            ReactDOM.unmountComponentAtNode(document.getElementById('content'));

            CONFIGURATOR.escActive = false;

            if (callback) callback();
        }).done();
    }
};

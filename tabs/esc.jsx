'use strict';

TABS.esc = {
    initialize: function (callback) {
        if (GUI.active_tab != 'esc') {
            GUI.active_tab = 'esc';
            googleAnalytics.sendAppView('ESC');
        }

        ReactDOM.render(
            <Configurator escCount={ESC_CONFIG.connectedESCs} />,
            document.getElementById('content')
        );

        GUI.content_ready(callback);
    },

    cleanup: function (callback) {
        if (!CONFIGURATOR.connectionValid || !CONFIGURATOR.escActive) {
            if (callback) callback();
            return;
        }

        // tell 4-way interface to return control to MSP server
        _4way.exit()
        .catch(() => {})
        // now we can return control to MSP or CLI handlers
        .finally(() => {
            CONFIGURATOR.escActive = false;
            if (callback) callback();
        })
        .done();
    }
};

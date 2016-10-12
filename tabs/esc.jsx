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
        // now we can return control to MSP or CLI handlers
        .then(() => CONFIGURATOR.escActive = false)
        .done()

        if (callback) {
            GUI.timeout_add('waiting_4way_if_exit', callback, 100);
        }
    }
};

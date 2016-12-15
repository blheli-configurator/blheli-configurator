/*
    If an id is also specified and a window with a matching id has been shown before, the remembered bounds of the window will be used instead.
*/
'use strict';

function startApplication() {
    var applicationStartTime = new Date().getTime();

    chrome.app.window.create('main.html', {
        id: 'main-window',
        frame: 'chrome',
        innerBounds: {
            minWidth: 1024,
            minHeight: 550
        }
    }, function (createdWindow) {
        createdWindow.contentWindow.addEventListener('load', function () {
            createdWindow.contentWindow.catch_startup_time(applicationStartTime);
        });

        createdWindow.onClosed.addListener(function() {
            // automatically close the port when application closes
            // save connectionId in separate variable before createdWindow.contentWindow is destroyed
            var connectionId = createdWindow.contentWindow.serial.connectionId,
                valid_connection = createdWindow.contentWindow.CONFIGURATOR.connectionValid;

            if (connectionId && valid_connection) {
                // Desperately attempt to exit 4way-if mode with a hand-tailored command
                var interfaceExitCmd = new Uint8Array([ 0x2f, 0x34, 0, 0, 1, 0, 0x46, 0xd2 ]);

                chrome.serial.send(connectionId, interfaceExitCmd.buffer, sendInfo => {
                    chrome.serial.disconnect(connectionId, result => {
                        console.log('SERIAL: Connection closed - ' + result);
                    });
                });
            } else if (connectionId) {
                chrome.serial.disconnect(connectionId, function (result) {
                    console.log('SERIAL: Connection closed - ' + result);
                });
            }
        });
    });
}

chrome.app.runtime.onLaunched.addListener(startApplication);

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == 'update') {
        var previousVersionArr = details.previousVersion.split('.'),
            currentVersionArr = chrome.runtime.getManifest().version.split('.');

        // only fire up notification sequence when one of the major version numbers changed
        if (currentVersionArr[0] > previousVersionArr[0] || currentVersionArr[1] > previousVersionArr[1]) {
            chrome.storage.local.get('update_notify', function (result) {
                if (result.update_notify === 'undefined' || result.update_notify) {
                    var manifest = chrome.runtime.getManifest();
                    var options = {
                        priority: 0,
                        type: 'basic',
                        title: manifest.name,
                        message: chrome.i18n.getMessage('notifications_app_just_updated_to_version', [manifest.version]),
                        iconUrl: '/images/icon_128.png',
                        buttons: [{'title': chrome.i18n.getMessage('notifications_click_here_to_start_app')}]
                    };

                    chrome.notifications.create('blheli_configurator_update', options, function (notificationId) {
                        // empty
                    });
                }
            });
        }
    }
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
    if (notificationId == 'blheli_configurator_update') {
        startApplication();
    }
});
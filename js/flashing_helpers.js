'use strict';

function compare(lhs_array, rhs_array) {
    if (lhs_array.byteLength != rhs_array.byteLength) {
        return false;
    }

    for (var i = 0; i < lhs_array.byteLength; ++i) {
        if (lhs_array[i] !== rhs_array[i]) {
            return false;
        }
    }

    return true;
}

function ascii2buf(str) {
    var view = new Uint8Array(str.length);

    for (var i = 0; i < str.length; ++i) {
        view[i] = str.charCodeAt(i);
    }

    return view;
}

function buf2ascii(buf) {
    return String.fromCharCode.apply(null, buf);
}

function parseHex(data) {
    // parsing hex in different thread
    var worker = new Worker('./js/workers/hex_parser.js'),
        deferred = Q.defer();

    worker.onmessage = function (event) {
        return deferred.resolve(event.data);
    };
    // send data over for processing
    worker.postMessage(data);

    return deferred.promise;
}

function selectFile(ext) {
    var deferred = Q.defer();

    // Open file dialog
    chrome.fileSystem.chooseEntry({
        type: 'openFile',
        accepts: [{ extensions: [ext] }]
    }, function (fileEntry) {
        if (chrome.runtime.lastError) {
            deferred.reject(new Error(chrome.runtime.lastError.message));
            return;
        }

        chrome.fileSystem.getDisplayPath(fileEntry, function (path) {
            GUI.log('Loading file from ' + path);

            fileEntry.file(function (file) {
                var reader = new FileReader();

                reader.onprogress = function (e) {
                    if (e.total > 32 * 1024) {
                        // 32 KiB
                        deferred.reject('File size limit of 32 KiB exceeded');
                    }
                };

                reader.onloadend = function (e) {
                    if (e.total !== 0 && e.total === e.loaded) {
                        GUI.log('Loaded file ' + path);

                        deferred.resolve(e.target.result);
                    } else {
                        deferred.reject(new Error('Failed to load ' + path));
                    }
                };

                reader.readAsText(file);
            });
        });
    });

    return deferred.promise;
}

function saveFile(str) {
    // Save file dialog
    chrome.fileSystem.chooseEntry({
        type: 'saveFile',
        suggestedName: 'Log',
        accepts: [{ extensions: ['txt'] }]
    }, function (fileEntry) {
        if (chrome.runtime.lastError) {
            return;
        }

        fileEntry.createWriter(function (writer) {
            writer.onwriteend = function () {
                if (writer.length === 0) {
                    writer.write(new Blob([str], { type: 'text/plain' }));
                } else {
                    GUI.log('Log file written');
                }
            };

            writer.truncate(0);
        });
    });
}

// Fills a memory image of ESC MCU's address space with target firmware
function fillImage(data, size) {
    var image = new Uint8Array(size).fill(0xFF);

    data.data.forEach(function (block) {
        // Check preconditions
        if (block.address >= image.byteLength) {
            // if (block.address == BLHELI_SILABS_BOOTLOADER_ADDRESS) {
            //     GUI.log('Block at 0x' + block.address.toString(0x10) + ' of 0x' + block.bytes.toString(0x10) + ' bytes contains bootloader, skipping\n');
            // } else {
            //     GUI.log('Block at 0x' + block.address.toString(0x10) + ' is outside of target address space\n');
            // }

            return;
        }

        if (block.address + block.bytes >= image.byteLength) {}
        // GUI.log('Block at 0x' + block.address.toString(0x10) + ' spans past the end of target address space\n');


        // block.data may be too large, select maximum allowed size
        var clamped_length = Math.min(block.bytes, image.byteLength - block.address);
        image.set(block.data.slice(0, clamped_length), block.address);
    });

    return image;
}

// @todo add Local Storage quota management?
function getFromCache(key, url) {
    // Look into Local Storage first
    return getFromLocalStorage(key).catch(function (error) {
        var deferred = Q.defer();

        // File is not present in Local Storage, try GET it
        $.get(url, function (content) {
            // Cache file for further use
            setToLocalStorage(key, content).then(function () {
                return deferred.resolve(content);
            }).done();
        }).fail(function () {
            return deferred.reject(new Error('File is unavailable'));
        });

        return deferred.promise;
    });
}

function getFromLocalStorage(key) {
    var deferred = Q.defer();

    chrome.storage.local.get(key, function (result) {
        var content = result[key];
        if (content) {
            deferred.resolve(content);
        } else {
            deferred.reject(new Error('Not found'));
        }
    });

    return deferred.promise;
}

function setToLocalStorage(key, content) {
    var deferred = Q.defer();

    var cacheEntry = {};
    cacheEntry[key] = content;
    chrome.storage.local.set(cacheEntry, function () {
        return deferred.resolve();
    });

    return deferred.promise;
}
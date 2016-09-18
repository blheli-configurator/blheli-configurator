'use strict';

async function getLocalFirmware(isAtmel) {
    var result = {};

    const maxFlashSize = isAtmel ? BLHELI_ATMEL_BLB_ADDRESS_8 : BLHELI_SILABS_ADDRESS_SPACE_SIZE;

    // Ask user to select HEX
    const hexContent = await selectFile('hex');
    const parsedHex = await parseHex(hexContent);
    if (parsedHex) {
        GUI.log('Loaded local firmware: ' + parsedHex.bytes_total + ' bytes');
        result.flash = fillImage(parsedHex, maxFlashSize);

        // sanity check
        const MCU = buf2ascii(result.flash.subarray(BLHELI_SILABS_EEPROM_OFFSET).subarray(BLHELI_LAYOUT.MCU.offset).subarray(0, BLHELI_LAYOUT.MCU.size));
        if (!MCU.includes('#BLHELI#')) {
            throw new Error('HEX does not look like a valid SiLabs BLHeli flash file')
        }
    } else {
        throw new Error('HEX file corrupt')
    }

    // Ask EEP on Atmel
    if (isAtmel) {
        const eepContent = await selectFile('eep');
        const parsedEep = await parseHex(eepContent);
        if (parsedEep) {
            GUI.log('Loaded local EEprom: ' + parsedEep.bytes_total + 'bytes');
            result.eeprom = fillImage(parsedEep, BLHELI_ATMEL_EEPROM_SIZE);

            // sanity check
            const MCU = buf2ascii(result.eeprom.subarray(BLHELI_LAYOUT.MCU.offset).subarray(0, BLHELI_LAYOUT.MCU.size));
            if (!MCU.includes('#BLHELI#')) {
                throw new Error('EEP does not look like a valid Atmel BLHeli EEprom file');
            }
        } else {
            throw new Error('EEP file corrupt')
        }
    }

    return result;
}

function parseHex(data) {
    // parsing hex in different thread
    var worker = new Worker('./js/workers/hex_parser.js'),
        deferred = Q.defer()

    worker.onmessage = event => deferred.resolve(event.data)
    // send data over for processing
    worker.postMessage(data)

    return deferred.promise
}

function selectFile(ext) {
    var deferred = Q.defer()

    // Open file dialog
    chrome.fileSystem.chooseEntry({
        type: 'openFile',
        accepts: [ { extensions: [ ext ] } ]
    }, fileEntry => {
        if (chrome.runtime.lastError) {
            deferred.reject(new Error(chrome.runtime.lastError.message))
            return
        }

        chrome.fileSystem.getDisplayPath(fileEntry, path => {
            GUI.log('Loading file from ' + path)

            fileEntry.file(file => {
                var reader = new FileReader

                reader.onprogress = e => {
                    if (e.total > 32 * 1024) { // 32 KiB
                        deferred.reject('File size limit of 32 KiB exceeded')
                    }
                }

                reader.onloadend = e => {
                    if (e.total !== 0 && e.total === e.loaded) {
                        GUI.log('Loaded file ' + path)

                        deferred.resolve(e.target.result)
                    } else {
                        deferred.reject(new Error('Failed to load ' + path))
                    }
                }

                reader.readAsText(file)
            })
        })
    })

    return deferred.promise
}

// Fills a memory image of ESC MCU's address space with target firmware
function fillImage(data, size) {
    var image = new Uint8Array(size).fill(0xFF)

    data.data.forEach(function(block) {
        // Check preconditions
        if (block.address >= image.byteLength) {
            if (block.address == BLHELI_SILABS_BOOTLOADER_ADDRESS) {
                GUI.log('Block at 0x' + block.address.toString(0x10) + ' of 0x' + block.bytes.toString(0x10) + ' bytes contains bootloader, skipping\n');
            } else {
                GUI.log('Block at 0x' + block.address.toString(0x10) + ' is outside of target address space\n');
            }

            return;
        }

        if (block.address + block.bytes >= image.byteLength) {
            GUI.log('Block at 0x' + block.address.toString(0x10) + ' spans past the end of target address space\n');
        }

        // block.data may be too large, select maximum allowed size
        var clamped_length = Math.min(block.bytes, image.byteLength - block.address);
        image.set(block.data.slice(0, clamped_length), block.address);
    })

    return image
}
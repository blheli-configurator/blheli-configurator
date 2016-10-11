# blheli-configurator

Google Chrome application for BLHeli firmware flashing and configuration.

## Disclaimer

This software is in development, use it at your own risk. **ALWAYS REMOVE THE PROPELLERS** and power your ESCs via a **current-limiting** device or a power supply. If you're not willing to take these precautions seriously and not ready to use Arduino for recovery in case your ESC gets "bricked" - **DO NOT USE THIS SOFTWARE**.

## Features

* Only BLHeli passthrough supported at the moment, hence only **CleanFlight** and **BetaFlight**
* Changing settings for any BLHeli_S, BLHeli SiLabs and BLHeli Atmel ESCs with bootloader
* Flashing BLHeli and BLHeli_S to SiLabs ESCs

## Future plans

* Flashing BLHeli to Atmel ESCs, it's already there but not yet tested
* Full-featured 4-way interface support via BLHeli boxes, with C2-interface support
* Electron/NW.js wrapper with auto-update
* Android/iOS version based on the same code-base

## Building

This project uses ReactJS, JSX and some modern ECMAScript extensions and depends on `npm` for building.
Following the initial checkout, you have to run:
```
npm install
```
After that, to actually compile all the required .jsx files, run:
```
npm run build
```

## Usage

Having enabled Developer Mode in Chrome, navigate to chrome://extensions/ and use **Load unpacked extension...**, providing path to the root directory of your working copy.

Launch the application, plug your flight controller into a USB port, press **Connect**.
If you run into problems while working with the program, make sure to copy Developer's Console output as well as save log using the **Save Log** button.

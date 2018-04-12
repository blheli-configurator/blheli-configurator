# blheli-configurator

Google Chrome application for BLHeli firmware flashing and configuration.

## Disclaimer

This software is provided as is, use it at your own risk. **ALWAYS REMOVE THE PROPELLERS** and power your ESCs via a **current-limiting** device or power supply.

## Features

* Only BLHeli passthrough supported at the moment, hence only **CleanFlight**,  **BetaFlight**, **INAV** and **TriFlight**
* Changing settings for any BLHeli_S, BLHeli SiLabs and BLHeli Atmel ESCs with bootloader
* Flashing BLHeli and BLHeli_S to SiLabs and Atmel ESCs

## Future plans

* Add declarative UI description for MAIN and MULTI modes
* Full-featured 4-way interface support via BLHeli boxes, with C2-interface support
* ~~Electron/NW.js wrapper with auto-update~~
* Android/iOS version based on the same code-base

## Adding a new BLHeli revision or new supported ESC

You can submit pull requests to js/blheli_versions.json and js/blheli_escs.json files, user installations of BLHeli Configurator will see the changes shortly.

## Installing BLHeli Configurator

### Standalone

Download the appropriate installer for your platform from [Releases](https://github.com/blheli-configurator/blheli-configurator/releases).

### Via Chrome Web Store

[![available in the Chrome web store](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png)](https://chrome.google.com/webstore/detail/blheli-configurator/mejfjggmbnocnfibbibmoogocnjbcjnk)

 1. Visit [Chrome Web Store](https://chrome.google.com/webstore/detail/blheli-configurator/mejfjggmbnocnfibbibmoogocnjbcjnk)
 2. Click + **Add to Chrome**

## Building (Chrome App)

This project uses ReactJS, JSX and some modern ECMAScript extensions and depends on `npm` for building.
Following the initial checkout, you have to run:
```
npm install
```
After that, to actually compile all the required .jsx files, run:
```
npm run build
```

## Native app build via NW.js

### Development

1. Install node.js
2. Change to project folder and run `npm install`.
3. Run `npm start` to build & run the debug flavor.

### App build and release

The tasks are defined in `gulpfile.js` and can be run either via `gulp <task-name>` (if the command is in PATH or via `../node_modules/gulp/bin/gulp.js <task-name>`:

1. Install babel-cli `npm install --global babel-cli`. 
2. Install gulp `npm install --global gulp-cli`.
4. Run `gulp <taskname> [[platform] [platform] ...]`.

List of possible values of `<task-name>`:
* **dist** copies all the JS and CSS files in the `./dist` folder.
* **apps** builds the apps in the `./apps` folder [1].
* **debug** builds debug version of the apps in the `./debug` folder [1].
* **release** zips up the apps into individual archives in the `./release` folder [1]. 

[1] Running this task on macOS or Linux requires Wine, since it's needed to set the icon for the Windows app (build for specific platform to avoid errors).

#### Build or release app for one specific platform
To build or release only for one specific platform you can append the plaform after the `task-name`.
If no platform is provided, all the platforms will be done in sequence.

* **MacOS** use `gulp <task-name> --osx64`
* **Linux** use `gulp <task-name> --linux64`
* **Windows** use `gulp <task-name> --win32`
* **ChromeOS** use `gulp <task-name> --chromeos`

You can also use multiple platforms e.g. `gulp <taskname> --osx64 --linux64`.


## Usage

Having enabled Developer Mode in Chrome, navigate to chrome://extensions/ and use **Load unpacked extension...**, providing path to the root directory of your working copy.

Launch the application, plug your flight controller into a USB port, press **Connect**, power your ESCs.
If you run into problems while working with the program, make sure to copy Developer's Console output as well as save log using the **Save Log** button.

## Thanks

This software started as a tab in [Cleanflight Configurator](https://github.com/cleanflight/cleanflight-configurator), hence my deep appreciation to all of you who contributed to it's development.

Special thanks to everyone who helped me with development, testing, collecting of logs and ideas and all other stuff:
* *Stefan van der Ende*
* *Nathan*
* *Steffen Windoffer*
* *Steven R. Lilly*
* *Tuomas Kuosmanen*
* *Robyn Bachofer*
* *ByeJon* from the IntoFPV forum for drawing an icon :-)

This list is extended as the development goes on and I remember all the names :)

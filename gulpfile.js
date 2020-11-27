'use strict';

var pkg = require('./package.json');

var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var archiver = require('archiver');
var del = require('del');
var NwBuilder = require('nw-builder');

var gulp = require('gulp');
var concat = require('gulp-concat');
var install = require("gulp-install");
var runSequence = require('run-sequence');
var os = require('os');
var exec = require('child_process').exec;

var distDir = './dist/';
var appsDir = './apps/';
var debugDir = './debug/';
var releaseDir = './release/';
var jsBuildDir = './js/build/'

const nwVersion = '0.49.1';

// -----------------
// Helper functions
// -----------------

// Get platform from commandline args
// #
// # gulp <task> [<platform>]+        Run only for platform(s) (with <platform> one of --linux64, --linux32, --osx64, --win32, --win64, or --chromeos)
// # 
function getPlatforms(includeChromeOs) {
    var supportedPlatforms = ['linux64', 'linux32', 'osx64', 'win32', 'win64'];
    var platforms = [];
    var regEx = /--(\w+)/;
    for (var i = 3; i < process.argv.length; i++) {
        var arg = process.argv[i].match(regEx)[1];
        if (supportedPlatforms.indexOf(arg) > -1) {
             platforms.push(arg);
        } else if (arg === 'chromeos') {
            if (includeChromeOs) {
                platforms.push(arg);
            }
        } else {
            console.log(`Your current platform (${os.platform()}) is not a supported build platform. Please specify platform to build for on the command line.`);
            process.exit();
        }
    }  

    if (platforms.length === 0) {
        switch (os.platform()) {
        case 'darwin':
            platforms.push('osx64');

            break;
        case 'linux':
            platforms.push('linux64');

            break;
        case 'win32':
            platforms.push('win32');

            break;

        default:
            break;
        }
    }

    console.log('Building for platform(s): ' + platforms + '.');

    return platforms;
}

function getRunDebugAppCommand() {
    switch (os.platform()) {
    case 'darwin':
        return 'open ' + path.join(debugDir, pkg.name, 'osx64', pkg.name + '.app');

        break;
    case 'linux':
        return path.join(debugDir, pkg.name, 'linux64', pkg.name);

        break;
    case 'win32':
        return path.join(debugDir, pkg.name, 'win32', pkg.name + '.exe');

        break;

    default:
        return '';

        break;
    }
}

function get_release_filename(platform, ext) {
    return 'BLHeli-Configurator_' + platform + '_' + pkg.version + '.' + ext;
}

// -----------------
// Tasks
// -----------------

gulp.task('clean', function () { 
    return runSequence('clean-dist', 'clean-build-js', 'clean-apps', 'clean-debug', 'clean-release');
});

gulp.task('clean-dist', function () { 
    return del([distDir + '**'], { force: true }); 
});

gulp.task('clean-build-js', function() {
    return del([jsBuildDir + '*.js'], { force: true }); 
});

gulp.task('clean-apps', function () { 
    return del([appsDir + '**'], { force: true }); 
});

gulp.task('clean-debug', function () { 
    return del([debugDir + '**'], { force: true }); 
});

gulp.task('clean-release', function () { 
    return del([releaseDir + '**'], { force: true }); 
});

gulp.task('clean-nwjs-cache', function () { 
    return del(['./cache/**'], { force: true }); 
});

gulp.task('clean-node-modules', function () { 
    return del(['./node_modules/**'], { force: true }); 
});

// Real work for dist task. Done in another task to call it via
// run-sequence.
gulp.task('dist', ['clean-dist', 'build-js'], function () {
    var distSources = [
        // CSS files
        './main.css',
        './js/libraries/jquery.nouislider.min.css',
        './js/libraries/jquery.nouislider.pips.min.css',
        './tabs/landing.css',
        './tabs/esc.css',
        './css/opensans_webfontkit/fonts.css',
        './css/dropdown-lists/css/style_lists.css',
        './js/libraries/switchery/switchery.css',
        './js/libraries/jbox/jBox.css',
        './js/libraries/react-input-range.min.css',

        // JavaScript
        './js/libraries/polyfill.min.js',
        './js/libraries/react.min.js',
        './js/libraries/react-dom.min.js',
        './js/libraries/react-input-range.min.js',
        './js/libraries/q.js',
        './js/libraries/google-analytics-bundle.js',
        './js/libraries/jquery-2.1.4.min.js',
        './js/libraries/jquery-ui-1.11.4.min.js',
        './js/libraries/jquery.nouislider.all.min.js',
        './js/libraries/semver.js',
        './js/libraries/jbox/jBox.min.js',
        './js/libraries/switchery/switchery.js',
        './js/workers/hex_parser.js',
        './js/debug.js',
        './js/flashing_helpers.js',
        './js/port_handler.js',
        './js/port_usage.js',
        './js/serial.js',
        './js/gui.js',
        './js/data_storage.js',
        './js/serial_backend.js',
        './js/fc.js',
        './js/msp.js',
        './js/localization.js',
        './js/_4way_if.js',
        './js/blheli_eeprom_layout.js',
        './js/blheli_settings_description.js',
        './js/blheli_escs.js',
        './js/blheli_escs.json',
        './js/blheli_versions.js',
        './js/blheli_versions.json',
        './js/blheli_defaults.js',
        './js/open_esc_escs.js',
        './js/open_esc_escs.json',
        './js/open_esc_versions.js',
        './js/open_esc_versions.json',
        './js/open_esc_defaults.js',
        './js/open_esc_eeprom_layout.js',
        './js/open_esc_settings_description.js',
        './js/fetch_json.js',
        // Configurator components
        './js/build/*.js',
        // Tabs
        './main.js',
        './tabs/landing.js',
        './tabs/esc.js',

        // everything else
        './package.json', // For NW.js
        './manifest.json', // For Chrome app
        './eventPage.js',
        './*.html',
        './tabs/*.html',
        './images/**/*',
        './_locales/**/*',
        './css/opensans_webfontkit/*.{eot,svg,ttf,woff,woff2}'
    ];
    return gulp.src(distSources, { base: '.' })
        .pipe(gulp.dest(distDir))
        .pipe(install({
            npm: '--production --ignore-scripts'
        }));;
});

// Build JS with Babel
gulp.task('build-js',  function(done) {
    fs.mkdir(jsBuildDir, '0775', function(err) {
        if (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
    });
    exec('npm run build', function(err) {
        if (err) {
            console.log('Error building NW apps: ' + err);
            runSequence('clean-apps', function() {
                process.exit(1);
            });
        }
        done()
    });
});

// Create runable app directories in ./apps
gulp.task('apps', ['dist', 'clean-apps'], function (done) {
    var platforms = getPlatforms();
    console.log('Release build.');

    var builder = new NwBuilder({
        version: nwVersion,
        files: './dist/**/*',
        buildDir: appsDir,
        platforms: platforms,
        flavor: 'normal',
        macIcns: './images/icon_128.icns',
        macPlist: { 'CFBundleDisplayName': 'BLHeli Configurator'},
        winIco: './images/icon_128.ico',
    });
    builder.on('log', console.log);
    builder.build(function (err) {
        if (err) {
            console.log('Error building NW apps: ' + err);
            runSequence('clean-apps', function() {
                process.exit(1);
            });
        }
        done();
    });
});

// Create debug app directories in ./debug
gulp.task('debug', ['dist', 'clean-debug'], function (done) {
    var platforms = getPlatforms();
    console.log('Debug build.');

    var builder = new NwBuilder({
        version: nwVersion,
        files: './dist/**/*',
        buildDir: debugDir,
        platforms: platforms,
        flavor: 'sdk',
        macIcns: './images/icon_128.icns',
        macPlist: { 'CFBundleDisplayName': 'BLHeli Configurator'},
        winIco: './images/icon_128.ico',
    });
    builder.on('log', console.log);
    builder.build(function (err) {
        if (err) {
            console.log('Error building NW apps: ' + err);
            runSequence('clean-debug', function() {
                process.exit(1);
            });
        }
        var run = getRunDebugAppCommand();
        console.log('Starting debug app (' + run + ')...');
        exec(run);
        done();
    });
});

// Create distribution package for windows and linux platforms
function release(arch) {
    var src = path.join(appsDir, pkg.name, arch);
    var output = fs.createWriteStream(path.join(releaseDir, get_release_filename(arch, 'zip')));
    var archive = archiver('zip', {
        zlib: { level: 9 }
    });
    archive.on('warning', function (err) { throw err; });
    archive.on('error', function (err) { throw err; });
    archive.pipe(output);
    archive.directory(src, 'BLHeli Configurator');
    return archive.finalize();
}

// Create distribution package for chromeos platform
function release_chromeos() {
    var src = distDir;
    var output = fs.createWriteStream(path.join(releaseDir, get_release_filename('chromeos', 'zip')));
    var archive = archiver('zip', {
        zlib: { level: 9 }
    });
    archive.on('warning', function (err) { throw err; });
    archive.on('error', function (err) { throw err; });
    archive.pipe(output);
    archive.directory(src, false);
    return archive.finalize();
}

// Create distribution package for macOS platform
function release_osx64() {
    var appdmg = require('gulp-appdmg');

    return gulp.src([])
        .pipe(appdmg({
            target: path.join(releaseDir, get_release_filename('macOS', 'dmg')),
            basepath: path.join(appsDir, pkg.name, 'osx64'),
            specification: {
                title: 'BLHeli Configurator',
                contents: [
                    { 'x': 448, 'y': 342, 'type': 'link', 'path': '/Applications' },
                    { 'x': 192, 'y': 344, 'type': 'file', 'path': pkg.name + '.app', 'name': 'BLHeli Configurator.app' }
                ],
                background: path.join(__dirname, 'images/dmg-background.png'),
                format: 'ULFO',
                window: {
                    size: {
                        width: 638,
                        height: 479
                    }
                }
            },
        })
    );
}

// Create distributable .zip files in ./release
gulp.task('release', ['apps', 'clean-release'], function () {
    fs.mkdir(releaseDir, '0775', function(err) {
        if (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
    });

    var platforms = getPlatforms(true);
    console.log('Packing release.');

    if (platforms.indexOf('chromeos') !== -1) {
        release_chromeos();
    }

    if (platforms.indexOf('linux64') !== -1) {
        release('linux64');
    }

    if (platforms.indexOf('linux32') !== -1) {
        release('linux32');
    }
        
    if (platforms.indexOf('osx64') !== -1) {
        release_osx64();
    }

    if (platforms.indexOf('win32') !== -1) {
        release('win32');
    }
    
    if (platforms.indexOf('win64') !== -1) {
        release('win64');
    }
});

gulp.task('default', ['debug']);

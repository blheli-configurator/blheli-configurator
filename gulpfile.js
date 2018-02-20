'use strict';

const pkg = require('./package.json');

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const zip = require('gulp-zip');
const del = require('del');
const NwBuilder = require('nw-builder');
const commandExistsSync = require('command-exists').sync;

const gulp = require('gulp');
const install = require("gulp-install");
const rename = require('gulp-rename');
const runSequence = require('run-sequence');
const os = require('os');
const exec = require('child_process').exec;

const DIST_DIR = './dist/';
const APPS_DIR = './apps/';
const DEBUG_DIR = './debug/';
const RELEASE_DIR = './release/';
const BUILD_DIR = './js/build/';

var nwBuilderOptions = {
    files: './dist/**/*',
    macIcns: './images/icon_128.icns',
    macPlist: { 'CFBundleDisplayName': 'BLHeli Configurator'},
    winIco: './images/icon_128.ico',
};

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
    './js/blheli_versions.js',
    './js/blheli_defaults.js',
    './js/fetch_json.js',
    // Configurator components
    './js/build/*.js',
    // Tabs
    './main.js',
    './tabs/landing.js',

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

//-----------------
//Pre tasks operations
//-----------------
const SELECTED_PLATFORMS = getInputPlatforms();

//-----------------
//Tasks
//-----------------

gulp.task('clean', gulp.parallel(clean_dist, clean_apps, clean_debug, clean_release));

gulp.task('clean-dist', clean_dist);

gulp.task('clean-build-js', clean_build_js);

gulp.task('clean-apps', clean_apps);

gulp.task('clean-debug', clean_debug);

gulp.task('clean-release', clean_release);

gulp.task('clean-cache', clean_cache);

gulp.task('clean-nwjs-cache', clean_nwjs_cache);

gulp.task('clean-node-modules', clean_node_module);

var distBuild = gulp.series(clean_dist, build_js, dist_src);
gulp.task('dist', distBuild);

var appsBuild = gulp.series(gulp.parallel(clean_apps, distBuild), apps, gulp.parallel(listPostBuildTasks(APPS_DIR)));
gulp.task('apps', appsBuild);

var debugBuild = gulp.series(gulp.parallel(clean_debug, distBuild), debug, gulp.parallel(listPostBuildTasks(DEBUG_DIR)), start_debug)
gulp.task('debug', debugBuild);

var releaseBuild = gulp.series(gulp.parallel(clean_release, appsBuild), gulp.parallel(listReleaseTasks()));
gulp.task('release', releaseBuild);

gulp.task('default', debugBuild);

// Build JS with Babel
gulp.task('build-js',  build_js);

// -----------------
// Helper functions
// -----------------

// Get platform from commandline args
// #
// # gulp <task> [<platform>]+        Run only for platform(s) (with <platform> one of --linux64, --linux32, --osx64, --win32, --win64, or --chromeos)
// # 
function getInputPlatforms() {
    var supportedPlatforms = ['linux64', 'linux32', 'osx64', 'win32','win64', 'chromeos'];
    var platforms = [];
    var regEx = /--(\w+)/;
    for (var i = 3; i < process.argv.length; i++) {
        var arg = process.argv[i].match(regEx)[1];
        if (supportedPlatforms.indexOf(arg) > -1) {
             platforms.push(arg);
        } else {
             console.log('Unknown platform: ' + arg);
             process.exit();
        }
    }  

    if (platforms.length === 0) {
        var defaultPlatform = getDefaultPlatform();
        if (supportedPlatforms.indexOf(defaultPlatform) > -1) {
            platforms.push(defaultPlatform);
        } else {
            console.error('Your current platform (' + os.platform()+ ') is not a supported build platform. Please specify platform to build for on the command line.');
            process.exit();
        }
    }

    if (platforms.length > 0) {
        console.log('Building for platform(s): ' + platforms + '.');
    } else {
        console.error('No suitables platforms found.');
        process.exit();
    }

    return platforms;
}

// Gets the default platform to be used
function getDefaultPlatform() {
    var defaultPlatform;
    switch (os.platform()) {
    case 'darwin':
        defaultPlatform = 'osx64';

        break;
    case 'linux':
        defaultPlatform = 'linux64';

        break;
    case 'win32':
        defaultPlatform = 'win32';

        break;

    default:
        defaultPlatform = '';

        break;
    }

    console.log('Building for platform(s): ' + defaultPlatform + '.');

    return defaultPlatform;
}


function getPlatforms() {
    return SELECTED_PLATFORMS.slice();
}

function removeItem(platforms, item) {
    var index = platforms.indexOf(item);
    if (index >= 0) {
        platforms.splice(index, 1);
    }
}

function getRunDebugAppCommand(arch) {
    switch (arch) {
    case 'osx64':
        return 'open ' + path.join(DEBUG_DIR, pkg.name, arch, pkg.name + '.app');

        break;
    case 'linux64':
    case 'linux32':
        return path.join(DEBUG_DIR, pkg.name, arch, pkg.name);

        break;
    case 'win32':
    case 'win64':
        return path.join(DEBUG_DIR, pkg.name, arch, pkg.name + '.exe');

        break;

    default:
        return '';

        break;
    }
}

function getReleaseFilename(platform, ext) {
    return 'BLHeli-Configurator_' + platform + '_' + pkg.version + '.' + ext;
}

function clean_dist() {
    return del([DIST_DIR + '**'], { force: true });
};

function clean_apps() {
    return del([APPS_DIR + '**'], { force: true });
};

function clean_debug() {
    return del([DEBUG_DIR + '**'], { force: true });
};

function clean_release() {
    return del([RELEASE_DIR + '**'], { force: true });
};

function clean_cache() {
    return del(['./cache/**'], { force: true }); 
};

function clean_build_js() {
    return del([BUILD_DIR + '*.js'], { force: true });
};

function clean_nwjs_cache() {
    return del(['./cache/**'], { force: true });
};

function clean_node_module() {
    return del(['./node_modules/**'], { force: true });
};

// Real work for dist task. Done in another task to call it via
// run-sequence.
function dist_src() {
    return gulp.src(distSources, { base: '.' })
        .pipe(gulp.dest(DIST_DIR))
        .pipe(install({
            npm: '--production --ignore-scripts'
        }));
};

// Build JS with Babel
function build_js(done) {
    fs.mkdir(BUILD_DIR, '0775', function(err) {
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
};

// Create runable app directories in ./apps
function apps(done) {
    var platforms = getPlatforms();
    removeItem(platforms, 'chromeos');

    buildNWApps(platforms, 'normal', APPS_DIR, done);
};

function listPostBuildTasks(folder, done) {

    var platforms = getPlatforms();

    var postBuildTasks = [];

    if (platforms.indexOf('linux32') != -1) {
        postBuildTasks.push(function post_build_linux32(done){ return post_build('linux32', folder, done) });
    }

    if (platforms.indexOf('linux64') != -1) {
        postBuildTasks.push(function post_build_linux64(done){ return post_build('linux64', folder, done) });
    }

    // We need to return at least one task, if not gulp will throw an error
    if (postBuildTasks.length == 0) {
        postBuildTasks.push(function post_build_none(done){ done() });
    }
    return postBuildTasks;
}

function post_build(arch, folder, done) {

    if ((arch =='linux32') || (arch == 'linux64')) {
        // Copy Ubuntu launcher scripts to destination dir
        var launcherDir = path.join(folder, pkg.name, arch);
        console.log('Copy Ubuntu launcher scripts to ' + launcherDir);
        return gulp.src('assets/linux/**')
                   .pipe(gulp.dest(launcherDir));
    }

    return done();
}

// Create debug app directories in ./debug
function debug(done) {
    var platforms = getPlatforms();
    removeItem(platforms, 'chromeos');

    buildNWApps(platforms, 'sdk', DEBUG_DIR, done);
}

function buildNWApps(platforms, flavor, dir, done) {

    if (platforms.length > 0) {
        var builder = new NwBuilder(Object.assign({
            buildDir: dir,
            platforms: platforms,
            flavor: flavor
        }, nwBuilderOptions));
        builder.on('log', console.log);
        builder.build(function (err) {
            if (err) {
                console.log('Error building NW apps: ' + err);
                clean_debug();
                process.exit(1);
            }
            done();
        });
    } else {
        console.log('No platform suitable for NW Build')
        done();
    }
}


function start_debug(done) {

    var platforms = getPlatforms();

    var exec = require('child_process').exec;
    if (platforms.length === 1) {
        var run = getRunDebugAppCommand(platforms[0]);
        console.log('Starting debug app (' + run + ')...');
        exec(run);
    } else {
        console.log('More than one platform specified, not starting debug app');
    }
    done();
}

// Create installer package for windows platforms
function release_win(arch, done) {
    var makensis = require('makensis');

    // Check if makensis exists
    if (!commandExistsSync('makensis')) {
        console.warn('makensis command not found, not generating win package for ' + arch);
        return done();
    }

    // The makensis does not generate the folder correctly, manually
    createDirIfNotExists(RELEASE_DIR);

    // Parameters passed to the installer script
    const options = {
            verbose: 2,
            define: {
                'VERSION': pkg.version,
                'PLATFORM': arch,
                'DEST_FOLDER': RELEASE_DIR
            }
        }

    var output = makensis.compileSync('./assets/windows/installer.nsi', options);

    if (output.status !== 0) {
        console.error('Installer for platform ' + arch + ' finished with error ' + output.status + ': ' + output.stderr);
    }

    done();
}

// Create distribution package (zip) for windows and linux platforms
function release_zip(arch) {
    var src = path.join(APPS_DIR, pkg.name, arch, '**');
    var output = getReleaseFilename(arch, 'zip');
    var base = path.join(APPS_DIR, pkg.name, arch);

    return compressFiles(src, base, output, 'blheli Configurator');
}

// Create distribution package for chromeos platform
function release_chromeos() {
    var src = path.join(DIST_DIR, '**');
    var output = getReleaseFilename('chromeos', 'zip');
    var base = DIST_DIR;

    return compressFiles(src, base, output, '.');
}

// Compress files from srcPath, using basePath, to outputFile in the RELEASE_DIR
function compressFiles(srcPath, basePath, outputFile, zipFolder) {
    return gulp.src(srcPath, { base: basePath })
               .pipe(rename(function(actualPath){ actualPath.dirname = path.join(zipFolder, actualPath.dirname) }))
               .pipe(zip(outputFile))
               .pipe(gulp.dest(RELEASE_DIR));
}

function release_deb(arch, done) {

    var deb = require('gulp-debian');

    // Check if dpkg-deb exists
    if (!commandExistsSync('dpkg-deb')) {
        console.warn('dpkg-deb command not found, not generating deb package for ' + arch);
        return done();
    }

    return gulp.src([path.join(APPS_DIR, pkg.name, arch, '*')])
        .pipe(deb({
             package: pkg.name,
             version: pkg.version,
             section: 'base',
             priority: 'optional',
             architecture: getLinuxPackageArch('deb', arch),
             maintainer: pkg.author,
             description: pkg.description,
             postinst: ['xdg-desktop-menu install /opt/blheli/blheli-configurator/blheli-configurator.desktop'],
             prerm: ['xdg-desktop-menu uninstall blheli-configurator.desktop'],
             depends: 'libgconf-2-4',
             changelog: [],
             _target: 'opt/blheli/blheli-configurator',
             _out: RELEASE_DIR,
             _copyright: 'assets/linux/copyright',
             _clean: true
    }));
}

function release_rpm(arch, done) {
    var buildRpm = require('rpm-builder');

    // Check if dpkg-deb exists
    if (!commandExistsSync('rpmbuild')) {
        console.warn('rpmbuild command not found, not generating rpm package for ' + arch);
        return done();
    }

    // The buildRpm does not generate the folder correctly, manually
    createDirIfNotExists(RELEASE_DIR);

    var options = {
             name: pkg.name,
             version: pkg.version,
             buildArch: getLinuxPackageArch('rpm', arch),
             vendor: pkg.author,
             summary: pkg.description,
             license: 'GNU General Public License v3.0',
             requires: 'libgconf-2-4',
             prefix: '/opt',
             files:
                 [ { cwd: path.join(APPS_DIR, pkg.name, arch),
                     src: '*',
                     dest: '/opt/blheli/blheli-configurator' } ],
             postInstallScript: ['xdg-desktop-menu install /opt/blheli/blheli-configurator/blheli-configurator.desktop'],
             preUninstallScript: ['xdg-desktop-menu uninstall blheli-configurator.desktop'],
             tempDir: path.join(RELEASE_DIR,'tmp-rpm-build-' + arch),
             keepTemp: false,
             verbose: false,
             rpmDest: RELEASE_DIR
    };

    buildRpm(options, function(err, rpm) {
        if (err) {
          console.error("Error generating rpm package: " + err);
        }
        done();
    });
}

function getLinuxPackageArch(type, arch) {
    var packArch;

    switch (arch) {
    case 'linux32':
        packArch = 'i386';
        break;
    case 'linux64':
        if (type == 'rpm') {
            packArch = 'x86_64';
        } else {
            packArch = 'amd64';
        }
        break;
    default:
        console.error("Package error, arch: " + arch);
        process.exit(1);
        break;
    }

    return packArch;
}
// Create distribution package for macOS platform
function release_osx64() {
    var appdmg = require('gulp-appdmg');

    // The appdmg does not generate the folder correctly, manually
    createDirIfNotExists(RELEASE_DIR);

    // The src pipe is not used
    return gulp.src(['.'])
        .pipe(appdmg({
            target: path.join(RELEASE_DIR, getReleaseFilename('macOS', 'dmg')),
            basepath: path.join(APPS_DIR, pkg.name, 'osx64'),
            specification: {
                title: 'BLHeli Configurator',
                contents: [
                    { 'x': 448, 'y': 342, 'type': 'link', 'path': '/Applications' },
                    { 'x': 192, 'y': 344, 'type': 'file', 'path': pkg.name + '.app', 'name': 'BLHeli Configurator.app' }
                ],
                background: path.join(__dirname, 'assets/osx/dmg-background.png'),
                format: 'UDZO',
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

// Create the dir directory, with write permissions
function createDirIfNotExists(dir) {
    fs.mkdir(dir, '0775', function(err) {
        if (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
    });
}

// Create a list of the gulp tasks to execute for release
function listReleaseTasks(done) {

    var platforms = getPlatforms();

    var releaseTasks = [];

    if (platforms.indexOf('chromeos') !== -1) {
        releaseTasks.push(release_chromeos);
    }

    if (platforms.indexOf('linux64') !== -1) {
        releaseTasks.push(function release_linux64_zip(){ return release_zip('linux64') });
        releaseTasks.push(function release_linux64_deb(done){ return release_deb('linux64', done) });
        releaseTasks.push(function release_linux64_rpm(done){ return release_rpm('linux64', done) });
    }

    if (platforms.indexOf('linux32') !== -1) {
        releaseTasks.push(function release_linux32_zip(){ return release_zip('linux32') });
        releaseTasks.push(function release_linux32_deb(done){ return release_deb('linux32', done) });
        releaseTasks.push(function release_linux32_rpm(done){ return release_rpm('linux32', done) });
    }

    if (platforms.indexOf('osx64') !== -1) {
        releaseTasks.push(release_osx64);
    }

    if (platforms.indexOf('win32') !== -1) {
        releaseTasks.push(function release_win32(done){ return release_win('win32', done) });
    }

    if (platforms.indexOf('win64') !== -1) {
        releaseTasks.push(function release_win64(done){ return release_win('win64', done) });
    }

    return releaseTasks;
}

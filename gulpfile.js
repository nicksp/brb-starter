'use strict';

// Utility dependencies
var gulp = require('gulp');
var gutil = require('gulp-util');
var notify = require('gulp-notify');
var runSequence = require('run-sequence');
var del = require('del');
var header = require('gulp-header');
var plumber = require('gulp-plumber');
var packageFile = require('./package.json');

// Core dependencies
var watchify = require('watchify');
var browserify = require('browserify');
var babelify = require('babelify'); // Babelify includes JSX transpiling
var source = require('vinyl-source-stream'); // converts a Browserify stream into a stream that Gulp actually understands
var streamify = require('gulp-streamify');
var buffer = require('vinyl-buffer'); // converts a streaming vinyl file object to a buffered vinyl files objects
var browserSync = require('browser-sync').create();

// Optional dependencies
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var CacheBuster = require('gulp-cachebust');
var cachebust = new CacheBuster();
var historyApiFallback = require('connect-history-api-fallback');

/*
  Options for the directory structure of your project
*/

// The folder location of the compiled scripts and assets
const DIST_DIR = './dist';

// The source folder for scripts and assets
const SRC_DIR = './src';

// The relative location of all JavaScript / CoffeeScript source files
//   e.g. If your files live at './src/js', this option should be 'js'
const SCRIPTS_FOLDER = 'scripts';

// The relative location of all style source files
//   e.g. If your files live at './src/styles', this option should be 'styles'
const CSS_FOLDER = 'css';

// The relative location of all image source files
//   e.g. If your files live at './src/img', this option should be 'img'
const IMAGES_FOLDER = 'images';

// The relative location of the main 'entry point' of your app
//     - This specifies where browserify will start to read its dependency graph
//    and include files in your finalized javascript file
//
// e.g. If the entry point in your app is './src/js/app.js', this option
//      should be app.js
const ENTRY_FILE = 'main.js';

/**
 * Template for banner to add to file headers
 */
var banner = [
  '/*! ',
    '<%= package.name %> ',
    'v<%= package.version %> | ',
    '(c) ' + new Date().getFullYear() + ' <%= package.author %> |',
    ' <%= package.homepage %>',
  ' */',
  '\n'
].join('');

/*
 * Custom functions
 */

function handleErrors() {
  var args = Array.prototype.slice.call(arguments);

  // Send error to notification center with gulp-notify
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args);

  // Keep gulp from hanging on this task
  if (typeof this.emit === 'function') {
    this.emit('end');
  }
}

function buildScript(file, watch) {

  var babelifyTransform = babelify.configure({
    stage: 0
  });

  var props = {
    entries: [`${SRC_DIR}/${SCRIPTS_FOLDER}/` + file],
    debug: true,
    cache: {},
    packageCache: {},
    transform: [babelifyTransform]
  };

  var baseBundler = browserify(props);

  // watchify() if watch requested, otherwise run browserify() once
  var bundler = watch ? watchify(baseBundler) : baseBundler;

  function rebundle() {
    var stream = bundler.bundle();

    return stream.on('error', handleErrors)
      .pipe(source(file))
      .pipe(buffer())
      .pipe(cachebust.resources())
      .pipe(sourcemaps.init())
      .pipe(streamify(uglify()))
      .pipe(header(banner, {package: packageFile}))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(`${DIST_DIR}/${SCRIPTS_FOLDER}`))
      .pipe(browserSync.stream());
  }

  gulp.task('rebundle', ['clean-scripts'], rebundle);

  // Listen for an update and run rebundle
  bundler.on('update', function() {
    runSequence('lint', 'rebundle', 'build-html');
    gutil.log('Rebundle...');
  });

  // Run it once the first time buildScript is called
  return rebundle();
}

/**
 * Gulp Tasks
 */

gulp.task('clean', function() {
  del.sync([`${DIST_DIR}/**`], function() {
    notify('Cleaned build dir.');
  });
});

gulp.task('clean-scripts', function() {
  del.sync([`${DIST_DIR}/${SCRIPTS_FOLDER}/**`, `!${DIST_DIR}/${SCRIPTS_FOLDER}`]);
});

gulp.task('clean-styles', function() {
  del.sync([`${DIST_DIR}/${CSS_FOLDER}/**`, `!${DIST_DIR}/${CSS_FOLDER}`]);
});

/*
  Linting
*/
gulp.task('lint', function() {
  gulp.src(['gulpfile.js', `${SRC_DIR}/${SCRIPTS_FOLDER}/**/*`])
    .pipe(plumber())
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

/*
  Compile JS to distribution directory
*/
gulp.task('build-js', function() {
  // This will run once because we set watch to false
  return buildScript(ENTRY_FILE, false);
});

/*
  Copy HTML to distribution directory
*/
gulp.task('build-html', function() {
  gulp.src(`${SRC_DIR}/**/*.html`)
    .pipe(cachebust.references())
    .pipe(gulp.dest(DIST_DIR))
    .pipe(browserSync.stream());
});

/*
  Styles task
*/
gulp.task('build-css', function() {
  // Move over fonts
  gulp.src(`${SRC_DIR}/${CSS_FOLDER}/fonts/**.*`)
    .pipe(gulp.dest(`${DIST_DIR}/${CSS_FOLDER}/fonts`));

  // Compiles CSS
  return gulp.src(`${SRC_DIR}/${CSS_FOLDER}/**/*.{scss,sass}`)
    .pipe(sass({
      outputStyle: 'compressed',
      sourceComments: true
    }))
    .pipe(autoprefixer('last 2 versions', '> 1%', 'ie 8'))
    .pipe(header(banner, { package : packageFile }))
    // insert other transforms here
    .pipe(cachebust.resources())
    .pipe(gulp.dest(`${DIST_DIR}/${CSS_FOLDER}`))
    .pipe(browserSync.stream());
});

/*
  Move images to distribution directory
*/
gulp.task('images', function() {
  gulp.src(`${SRC_DIR}/${IMAGES_FOLDER}/**`)
    .pipe(gulp.dest(`${DIST_DIR}/${IMAGES_FOLDER}`))
    .pipe(browserSync.stream());
});

/*
  Browser Sync
*/
gulp.task('browser-sync', function() {
  browserSync.init({
    // We need to disable clicks, scrolls and forms for when we test multiple rooms
    server: {
      baseDir: DIST_DIR,
      middleware : [historyApiFallback()]
    },
    ghostMode: false
  });
});

/*
  Watch
*/
gulp.task('watch', function() {

  gulp.watch(`${SRC_DIR}/**/*.html`, ['build-html']);
  gulp.watch(`${SRC_DIR}/${CSS_FOLDER}/**/*`, function() {
    runSequence('clean-styles', 'build-css', 'build-html');
  });
  gulp.watch(`${SRC_DIR}/${IMAGES_FOLDER}/**/*`, ['images',]);

  // Browserify watch for JS changes
  return buildScript(ENTRY_FILE, true);
});

/**
 * Custom Tasks
 */

gulp.task('build', ['clean'], function() {
  runSequence(
    'lint',
    ['images', 'build-css', 'build-js'],
    'build-html'
  );
});

gulp.task('default', [
  'build',
  'browser-sync',
  'watch'
]);

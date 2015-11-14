# Gulp.js Boilerplate
Opinionated `Gulp` build environment for frontend web development using `Browserify` to produce bundles for scripts, `React/JSX` and `Browsersync` to create a streamlined development process with minimal additional configuration required. Using the `Babel`'s `Babelify` transform, `ES6` code is transpiled to work in all browsers.

### Dependencies

Make sure these are installed first.

* [Node.js](http://nodejs.org)
* [Gulp](http://gulpjs.com) `npm i -g gulp`

### Getting Up and Running

1. Clone this repo from `https://github.com/nicksp/brb-starter.git`
2. Run `npm install` from the root directory
3. Run `gulp`
4. Your browser will automatically be opened and directed to the browser-sync proxy address

Now that `gulp` is running, the server is up as well and serving files from the `./dist` directory. Any changes in the `./src` directory will be automatically processed by Gulp and the changes will be injected to any open browsers pointed at the proxy address.

/*
 * MyApp
 * Root controller view for entire app
 * <MyApp />
 */

/* jshint ignore:start */

'use strict';

const React = require('react');

let MyApp = React.createClass({
  render: function() {
    return (
      <div>
        <h1>MyApp component main view.</h1>
      </div>
    );
  }
});

module.exports = MyApp;

/* jshint ignore:end */

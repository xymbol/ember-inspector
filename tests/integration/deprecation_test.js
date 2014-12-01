/*globals findByLabel, clickByLabel */
import Ember from "ember";
import { test } from 'ember-qunit';
import startApp from '../helpers/start-app';
var App;

var port, message, name;

module('Deprecation Tab', {
  setup: function() {
    App = startApp({ adapter: 'basic' });
    port = App.__container__.lookup('port:main');
    port.reopen({
      send: function(n, m) {
        name = n;
        message = m;
      }
    });
  },
  teardown: function() {
    name = null;
    message = null;
    Ember.run(App, App.destroy);
  }
});

//test('No source map');

//test('With source map, source not found');

//test("With source map, source found, can't open resource");

//test("With source map, source found, can open resource");

//test('With source map, source found, url provided');


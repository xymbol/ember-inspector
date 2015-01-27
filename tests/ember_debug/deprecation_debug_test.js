import Ember from "ember";
/*globals require */
var EmberDebug = require("ember-debug/main")["default"];

var port, name, message, RSVP = Ember.RSVP;
var EmberDebug;
var run = Ember.run;
var App;

function setupApp(){
  App = Ember.Application.create();
  App.injectTestHelpers();
  App.setupForTesting();
}

module("Deprecation Debug", {
  setup: function() {
    EmberDebug.Port = EmberDebug.Port.extend({
      init: function() {},
      send: function(n, m) {
        name = n;
        message = m;
      }
    });
    run(function() {
      setupApp();
      EmberDebug.set('application', App);
    });
    Ember.run(EmberDebug, 'start');
    port = EmberDebug.port;
    EmberDebug.deprecationDebug.reopen({
      fetchSourceMap: function() {},
      emberCliConfig: null
    });
  },
  teardown: function() {
    name = null;
    message = null;
    EmberDebug.destroyContainer();
    Ember.run(App, 'destroy');
  }
});

test("deprecations are caught and sent", function() {
  var messages = [];
  port.reopen({
    send: function(name, message) {
      messages.push({
        name: name,
        message: message
      });
    }
  });
  App.ApplicationRoute = Ember.Route.extend({
    setupController: function() {
      Ember.deprecate('Deprecation 1');
      Ember.deprecate('Deprecation 2');
      Ember.deprecate('Deprecation 1');
    }
  });

  visit('/');
  andThen(function() {
    var deprecations = messages.findBy('name', 'deprecation:deprecationsAdded').message.deprecations;
    equal(deprecations.length, 2);
  });

});


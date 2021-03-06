import PortMixin from 'ember-debug/mixins/port-mixin';
import PromiseAssembler from 'ember-debug/libs/promise-assembler';
var Ember = window.Ember;
var readOnly = Ember.computed.readOnly;

var PromiseDebug = Ember.Object.extend(PortMixin, {
  namespace: null,
  port: readOnly('namespace.port'),
  objectInspector: readOnly('namespace.objectInspector'),
  adapter: readOnly('namespace.adapter'),
  portNamespace: 'promise',

  // created on init
  promiseAssembler: null,

  releaseMethods: Ember.computed(function() { return Ember.A(); }),

  init: function() {
    this._super();
    if (PromiseAssembler.supported()) {
      this.set('promiseAssembler', PromiseAssembler.create());
      this.get('promiseAssembler').set('promiseDebug', this);
      this.get('promiseAssembler').start();
    }
  },

  delay: 100,

  willDestroy: function() {
    this.releaseAll();
    this.get('promiseAssembler').destroy();
    this.set('promiseAssembler', null);
    this._super();
  },

  messages: {
    getAndObservePromises: function() {
      this.getAndObservePromises();
    },

    supported: function() {
      this.sendMessage('supported', {
        supported: PromiseAssembler.supported()
      });
    },

    releasePromises: function() {
      this.releaseAll();
    },

    sendValueToConsole: function(message) {
      var promiseId = message.promiseId;
      var promise = this.get('promiseAssembler').find(promiseId);
      var value = promise.get('value');
      if (value === undefined) {
        value = promise.get('reason');
      }
      this.get('objectInspector').sendValueToConsole(value);
    },

    tracePromise: function(message) {
      var id = message.promiseId;
      var promise = this.get('promiseAssembler').find(id);
      // Remove first two lines and add label
      var stack = promise.get('stack');
      if (stack) {
        stack = stack.split("\n");
        stack.splice(0, 2, ['Ember Inspector (Promise Trace): ' + (promise.get('label') || '')]);
        this.get("adapter").log(stack.join("\n"));
      }
    },

    setInstrumentWithStack: function(message) {
      Ember.RSVP.configure('instrument-with-stack', message.instrumentWithStack);
    }
  },

  releaseAll: function() {
    this.get('releaseMethods').forEach(function(fn) {
      fn();
    });
    this.set('releaseMethods', Ember.A());
  },

  getAndObservePromises: function() {
    this.get('promiseAssembler').on('created', this, this.promiseUpdated);
    this.get('promiseAssembler').on('fulfilled', this, this.promiseUpdated);
    this.get('promiseAssembler').on('rejected', this, this.promiseUpdated);
    this.get('promiseAssembler').on('chained', this, this.promiseChained);

    this.get('releaseMethods').pushObject(function() {

      this.get('promiseAssembler').off('created', this, this.promiseUpdated);
      this.get('promiseAssembler').off('fulfilled', this, this.promiseUpdated);
      this.get('promiseAssembler').off('rejected', this, this.promiseUpdated);
      this.get('promiseAssembler').off('fulfilled', this, this.promiseChained);

    }.bind(this));

    this.promisesUpdated(this.get('promiseAssembler').find());
  },

  updatedPromises: Ember.computed(function() { return Ember.A(); }),

  promisesUpdated: function(uniquePromises) {
    if (!uniquePromises) {
      uniquePromises = Ember.A();
      this.get('updatedPromises').forEach(function(promise) {
        uniquePromises.addObject(promise);
      });
    }
    // Remove inspector-created promises
    uniquePromises = uniquePromises.filter(function(promise) {
      return promise.get('label') !== 'ember-inspector';
    });
    var serialized = this.serializeArray(uniquePromises);
    this.sendMessage('promisesUpdated', {
      promises: serialized
    });
    this.set('updatedPromises', Ember.A());
  },

  promiseUpdated: function(event) {
    this.get('updatedPromises').pushObject(event.promise);
    Ember.run.debounce(this, 'promisesUpdated', this.delay);
  },

  promiseChained: function(event) {
    this.get('updatedPromises').pushObject(event.promise);
    this.get('updatedPromises').pushObject(event.child);
    Ember.run.debounce(this, 'promisesUpdated', this.delay);
  },

  serializeArray: function(promises) {
    return promises.map(function(item) {
      return this.serialize(item);
    }.bind(this));
  },

  serialize: function(promise) {
    var serialized = {};
    serialized.guid = promise.get('guid');
    serialized.state = promise.get('state');
    serialized.label = promise.get('label');
    if (promise.get('children')) {
      serialized.children = this.promiseIds(promise.get('children'));
    }
    serialized.parent = promise.get('parent.guid');
    serialized.value = this.inspectValue(promise.get('value'));
    serialized.reason = this.inspectValue(promise.get('reason'));
    if (promise.get('createdAt')) {
      serialized.createdAt = promise.get('createdAt').getTime();
    }
    if (promise.get('settledAt')) {
      serialized.settledAt = promise.get('settledAt').getTime();
    }
    serialized.hasStack = !!promise.get('stack');
    return serialized;
  },

  promiseIds: function(promises) {
    return promises.map(function(promise) {
      return promise.get('guid');
    });
  },

  inspectValue: function(value) {
    var objectInspector = this.get('objectInspector'),
        inspected = objectInspector.inspectValue(value);

    if (inspected.type === 'type-ember-object' || inspected.type === "type-array") {
      inspected.objectId = objectInspector.retainObject(value);
      this.get('releaseMethods').pushObject(function() {
        objectInspector.releaseObject(inspected.objectId);
      });
    }
    return inspected;
  }

});

export default PromiseDebug;

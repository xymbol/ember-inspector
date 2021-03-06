import Ember from "ember";
export default Ember.Route.extend({

  setupController: function() {
    this.controllerFor('mixinStack').set('model', []);
    this.get('port').on('objectInspector:updateObject', this, this.updateObject);
    this.get('port').on('objectInspector:updateProperty', this, this.updateProperty);
    this.get('port').on('objectInspector:droppedObject', this, this.droppedObject);
  },

  deactivate: function() {
    this.get('port').off('objectInspector:updateObject', this, this.updateObject);
    this.get('port').off('objectInspector:updateProperty', this, this.updateProperty);
    this.get('port').off('objectInspector:droppedObject', this, this.droppedObject);

  },

  updateObject: function(options) {
    var details = options.details,
      name = options.name,
      property = options.property,
      objectId = options.objectId;

    Ember.NativeArray.apply(details);
    details.forEach(arrayize);

    var controller = this.get('controller');

    if (options.parentObject) {
      controller.pushMixinDetails(name, property, objectId, details);
    } else {
      controller.activateMixinDetails(name, details, objectId);
    }

    this.send('expandInspector');
  },

  updateProperty: function(options) {
    var detail = this.controllerFor('mixinDetails').get('mixins').objectAt(options.mixinIndex);
    var property = Ember.get(detail, 'properties').findProperty('name', options.property);
    Ember.set(property, 'value', options.value);
  },

  droppedObject: function(message) {
    var controller = this.get('controller');
    controller.droppedObject(message.objectId);
  },

  actions: {
    expandInspector: function() {
      this.set("controller.inspectorExpanded", true);
    },
    toggleInspector: function() {
      this.toggleProperty("controller.inspectorExpanded");
    },
    inspectObject: function(objectId) {
      if (objectId) {
        this.get('port').send('objectInspector:inspectById', { objectId: objectId });
      }
    },
    setIsDragging: function (isDragging) {
      this.set('controller.isDragging', isDragging);
    },
    refreshPage: function() {
      // If the adapter defined a `reloadTab` method, it means
      // they prefer to handle the reload themselves
      if (typeof this.get('adapter').reloadTab === 'function') {
        this.get('adapter').reloadTab();
      } else {
        // inject ember_debug as quickly as possible in chrome
        // so that promises created on dom ready are caught
        this.get('port').send('general:refresh');
        this.get('adapter').willReload();
      }
    }
  }
});

function arrayize(mixin) {
  Ember.NativeArray.apply(mixin.properties);
}

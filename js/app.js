/*jshint asi: true*/
'use strict';

window.app = angular.module('presenter', ['ngRoute', 'ngTouch', 'segmentio']);

require('./routes')

require('./config')
app.config(
  ['$httpProvider', function($httpProvider) {
    return delete $httpProvider.defaults.headers.common['X-Requested-With'];
  }]
)

app.run(['$rootScope', 'envConfig', function(root, config) { root.cdn = config.cdn }])

require('./factories')
require('./filters')

require('./controllers/object')
require('./controllers/story')
require('./controllers/notes')
require('./controllers/main')
require('./controllers/goldweights')

require('./directives/flatmap')
require('./directives/note')
require('./directives/scroll')
require('./directives/onPlay')

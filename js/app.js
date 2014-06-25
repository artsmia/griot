/**
 * Set up application and load modules.
 */

/*jshint asi: true*/
'use strict';

window.app = angular.module('griot', ['ngRoute', 'ngTouch', 'segmentio']);

require('./routes')

require('./config')
app.config(
  ['$httpProvider', function($httpProvider) {
    return delete $httpProvider.defaults.headers.common['X-Requested-With'];
  }]
)

app.run(['$rootScope', 'envConfig', 'miaMediaMetaAdapter', 'miaObjectMetaAdapter', 'miaThumbnailAdapter', function( root, config, mediaMeta, objectMeta, objectThumb ) { 
	root.cdn = config.cdn;

	// If adapters are enabled, retrieve and prepare alternate data
	if( config.miaMediaMetaActive ) {
		mediaMeta.build( config.miaMediaMetaSrc );
	}
	if( config.miaObjectMetaActive ) {
		objectMeta.build( config.miaObjectMetaSrc );
	}
	if( config.miaThumbnailActive ) {
		objectThumb.init( config.miaThumbnailSrc );
	}
}])

require('./factories')
require('./adapters')

require('./controllers/object')
require('./controllers/story')
require('./controllers/notes')
require('./controllers/main')
require('./controllers/goldweights')

require('./directives/flatmap')
require('./directives/note')
require('./directives/vcenter')
require('./directives/transparentize')
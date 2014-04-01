app.factory('contents', ['$http', 'envConfig', function($http, config) {
  return function() {
    return $http.get(config.contents, {cache: true}).then(function(result) { return result.data; })
  }
}])

app.factory('tilesaw', ['$http', 'envConfig', function($http, config) {
  return { get: function(image) {
    return $http.get(config.tilesaw + image + '.tif', {cache: true}).then(function(result) { return result.data; })
  }}
}])

app.factory('notes', ['$http', 'envConfig', function($http, config) {
  return function() {
    // TODO: how do we want to cache/bundle the JSON? WP is slow
    // also cache it within ng so we aren't requesting/parsing it on each request
    return $http.get(config.crashpad, {cache: true}).then(function(result) {
      return result.data;
    })
  }
}])

/**
 * fetchMediaMeta
 * 
 * Grabs media metadata from an external source and massages it into a hash
 * connecting a media ID/URL to a single block of text containing a description 
 * and/or credit line. The default implementation is specific to the MIA; you 
 * should overwrite this adapter if you'd like to use your own service to pull
 * media metadata. If you'd rather manually enter metadata using GriotWP, simply  
 * set config.mediaMetaUrl to null.
 */
app.factory( 'fetchMediaMeta', [ '$http', 'envConfig', function( $http, config ) {

  return function() {

    return $http.get( config.mediaMetaUrl, { cache: true } ).then( function( rawResult ) {

      var result = rawResult.data;
      var mediaMeta = {};

      for( var id in result ) {
        var description = result[ id ].description ? result[id].description + "\n" : '';
        var credit = result[ id ].credit || '';
        mediaMeta[ id ] = description + credit;
      }

      return mediaMeta;

    });

  };

}]);


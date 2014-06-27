/**
 * Retrieve external data.
 */

// Tile data
app.factory('tilesaw', ['$http', 'envConfig', function($http, config) {
  return { get: function(image) {
    return $http.get(config.tilesaw + image + '.tif', {cache: true}).then(function(result) { return result.data; })
  }}
}])

// Application content
app.factory('notes', ['$http', 'envConfig', function($http, config) {
  return function() {
    // TODO: how do we want to cache/bundle the JSON? WP is slow
    // also cache it within ng so we aren't requesting/parsing it on each request
    return $http.get(config.crashpad, {cache: true}).then(function(result) {
      return result.data;
    })
  }
}])

app.factory('email', ['$http', 'envConfig', function($http, config) {
  return {
    share: function(email, params) {
      return $http.post(config.emailServer + email, params).success(function(response) {
        return response
      })
    }
  }
}])

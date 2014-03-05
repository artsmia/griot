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

app.factory('credits', ['$http', 'envConfig', function($http, config) {
  return function() {
    return $http.get(config.cdn + 'credits.json', {cache: true}).then(function(result) {
      return result.data;
    })
  }
}])


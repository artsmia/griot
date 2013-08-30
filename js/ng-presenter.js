(function() {
  'use strict'
  window.app = angular.module('presenter', []);

  app.config(
    ['$routeProvider', function($routeProvider) {
      return $routeProvider.when('/', {
        templateUrl: 'views/index.html',
        controller: 'MainCtrl'
      }).when('/o/:id', {
        templateUrl: 'views/object.html',
        controller: 'ObjectCtrl'
      }).otherwise({
        redirectTo: '/'
      })
    }]
  )
  app.config(
    ['$httpProvider', function($httpProvider) {
      return delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }]
  )

  app.factory('objects', ['$http', function($http) {
    return { get: function() {
      return $http.get('/objects.json').then(function(result) { return result.data; })
    }}
  }])
  app.factory('tilesaw', ['$http', function($http) {
    return { get: function(image) {
      return $http.get('//tilesaw.dx.artsmia.org/'+image+'.tif').then(function(result) { return result.data; })
    }}
  }])
  app.controller('MainCtrl', ['$scope', '$route', '$routeParams',
    function($scope, $route, $routeParams) {
    }
  ])

  app.controller('ObjectCtrl', ['$scope', '$route', '$routeParams', 'objects', 'tilesaw',
    function($scope, $route, $routeParams, objects, tilesaw) {
      $scope.id = $routeParams.id
      objects.get().then(function(data) {
        $scope.json = data[$scope.id]
        tilesaw.get('1937').then(function(tileJson) {
          $scope.zoom = Zoomer.zoom_image({container: 'flat_image', tileURL: tileJson.tiles[0], imageWidth: tileJson.width, imageHeight: tileJson.height})
        })
        $scope.objects = data
      })
      $scope.next = function(direction) {
        console.log('next', direction)
      }
      $scope.prev = function(direction) {
        console.log('prev', direction)
      }
      window.$scope = $scope
      window.tilesaw = tilesaw
    }
  ])
})()

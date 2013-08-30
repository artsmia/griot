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

  app.controller('ObjectCtrl', ['$scope', '$route', '$routeParams', '$location', 'objects', 'tilesaw',
    function($scope, $route, $routeParams, $location, objects, tilesaw) {
      $scope.id = $routeParams.id
      objects.get().then(function(data) {
        $scope.json = data[$scope.id]
        tilesaw.get($scope.id).then(function(tileJson) {
          console.log(tileJson)
          console.log("Zoomer.zoom_image({container: 'flat_image', tileURL: '"+ tileJson.tiles[0] +"', imageWidth: "+tileJson.width+", imageHeight: "+tileJson.height+"})")
          $scope.zoom = Zoomer.zoom_image({container: 'flat_image', tileURL: tileJson.tiles[0], imageWidth: tileJson.width, imageHeight: tileJson.height})
          console.log('zoomed')
        })
        $scope.objects = data
      })
      $scope.next = function(direction) {
        var next = $scope.objects.ids[$scope.objects.ids.indexOf(parseInt($scope.id))+1]
        if(next) $location.url('/o/'+next)
      }
      $scope.prev = function(direction) {
        var prev = $scope.objects.ids[$scope.objects.ids.indexOf(parseInt($scope.id))-1]
        if(prev) $location.url('/o/'+prev)
      }
      window.$scope = $scope
      window.tilesaw = tilesaw
    }
  ])
})()

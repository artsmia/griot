(function() {
  'use strict'
  window.app = angular.module('presenter', []);

  app.config(
    ['$routeProvider', function($routeProvider) {
      return $routeProvider.when('/', {
        // templateUrl: 'views/index.html',
        // controller: 'MainCtrl'
        redirectTo: '/o/1937'
      }).when('/o/:id', {
        templateUrl: 'views/object.html',
        controller: 'ObjectCtrl'
      }).when('/a/:id', {
        templateUrl: 'views/annotations.html',
        controller: 'notesCtrl'
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

  app.directive('flatmap', function(tilesaw) {
    return {
      restrict: 'E',
      template: '<div id="{{container}}" class="flatmap"></div>',
      link: function(scope, element, attrs) {
        scope.image = attrs.id
        scope.container = 'zoom-' + scope.image

        tilesaw.get(scope.image).then(function(tileJson) {
          console.log(tileJson)
          scope.zoom = Zoomer.zoom_image({container: scope.container, tileURL: tileJson.tiles[0], imageWidth: tileJson.width, imageHeight: tileJson.height})
        })
      }
    }
  })

  app.controller('ObjectCtrl', ['$scope', '$route', '$routeParams', '$location', 'objects', 'tilesaw', 'wp',
    function($scope, $route, $routeParams, $location, objects, tilesaw, wp) {

      $scope.id = $routeParams.id
      objects().then(function(data) {
        $scope.json = data[$scope.id]
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

  app.controller('notesCtrl', ['$scope', '$routeParams',
    function($scope, $routeParams) {
      $scope.id = $routeParams.id
    }
  ])
})()

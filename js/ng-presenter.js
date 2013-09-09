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
    return function() {
      return $http.get('/objects.json').then(function(result) { return result.data; })
    }
  }])
  app.factory('tilesaw', ['$http', function($http) {
    return { get: function(image) {
      return $http.get('//tilesaw.dx.artsmia.org/'+image+'.tif').then(function(result) { return result.data; })
    }}
  }])
  app.factory('notes', ['$http', function($http) {
    return function() {
      // why doesn't
      // $http.get('http://wp/crashpad/json/')
      // work?
      var g = $.getJSON('http://wp/crashpad/json/')
      return g.then(function(result) { return result; })
    }
  }])

  app.directive('flatmap', function(tilesaw) {
    return {
      restrict: 'E',
      scope: {
        json: '@',
        image: '@'
      },
      template: '<div id="{{container}}" class="flatmap"></div>',
      link: function(scope, element, attrs) {
        scope.container = 'zoom-' + scope.image + '-' + new Date().getUTCMilliseconds()

        tilesaw.get(scope.image).then(function(tileJson) {
          scope.zoom = Zoomer.zoom_image({container: scope.container, tileURL: tileJson.tiles[0], imageWidth: tileJson.width, imageHeight: tileJson.height})

          if(scope.json) {
            var _geometry = L.GeoJSON.geometryToLayer(JSON.parse(scope.json))
            scope.zoom.map.fitBounds(_geometry.getBounds())
            scope.zoom.map.addLayer(_geometry)
          }
        })
      }
    }
  })

  app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', 'objects',
    function($scope, $routeParams, $location, objects) {
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
      window.$routeParams = $routeParams
    }
  ])

  app.controller('notesCtrl', ['$scope', '$routeParams', 'notes',
    function($scope, $routeParams, getNotes) {
      $scope.id = $routeParams.id
      getNotes().then(function(_notes) {
        $scope.notes = _notes[$scope.id]
        $scope.$apply()
      })
    }
  ])

  app.controller('MainCtrl', ['$scope', '$routeParams', 'objects',
    function($scope, $routeParams, objects) {
      objects().then(function(data) {
        $scope.objects = data
        window.$scope = $scope
      })
    }
  ])
})()

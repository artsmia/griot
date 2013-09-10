/*jshint asi: true*/

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

          // This is weird. `notes.json` is set on the parent scope, then passed through into the directive scope as scope.json.
          // It doesn't update though, so I have to `scope.watch` the parent scope…
          // Oh and this only works beacuse I have window.$scope = $scope. Bad
          $scope.$watch('notes.json', function() {
            if(scope.json) {
              if(scope.jsonLayer) scope.zoom.map.removeLayer(scope.jsonLayer)
              var _geometry = scope.jsonLayer = L.GeoJSON.geometryToLayer(JSON.parse(scope.json))
              scope.zoom.map.fitBounds(_geometry.getBounds())
              scope.zoom.map.addLayer(_geometry)
            }
          }, true)

        })
      }
    }
  })

  app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', 'objects', 'notes',
    function($scope, $routeParams, $location, objects, wp) {
      $scope.id = $routeParams.id
      objects().then(function(data) {
        $scope.json = data[$scope.id]
        $scope.objects = data
      })
      wp().then(function(_wp) {
        wp = $scope.wp = _wp.objects[$scope.id]
        $scope.notes = wp.views
        $scope.$apply()
      })

      $scope.next = function(direction) {
        var next = $scope.objects.ids[$scope.objects.ids.indexOf(parseInt($scope.id))+1]
        if(next) $location.url('/o/'+next)
      }
      $scope.prev = function(direction) {
        var prev = $scope.objects.ids[$scope.objects.ids.indexOf(parseInt($scope.id))-1]
        if(prev) $location.url('/o/'+prev)
      }

      $scope.toggleView = function(about_or_annotations) {
        if(about_or_annotations && about_or_annotations.match('annotations')) {
          $scope.activeSection = 'annotations'
        } else {
          $scope.activeSection = 'about'
        }
      }
      $scope.toggleView()

      $scope.activateNote = function(note, view) {
        angular.forEach(view.annotations, function(ann) { ann.active = false })
      }

      $scope.toggleSixbar = function(element) {
        $scope.sixBarClosed = !$scope.sixBarClosed
        // TODO: somehow trigger zoomer centerImageAtExtents inside the flatmap directive?
      }

      window.$scope = $scope
      window.$routeParams = $routeParams
    }
  ])

  app.controller('notesCtrl', ['$scope', '$routeParams', 'notes',
    function($scope, $routeParams, wp) {
      $scope.id = $routeParams.id
      wp().then(function(_wp) {
        window._wp = _wp
        $scope.notes = _wp.objects[$scope.id].views
        $scope.$apply()
      })
      window.$scope = $scope
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

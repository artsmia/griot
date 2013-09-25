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
      return $http.get('objects.json').then(function(result) { return result.data; })
    }
  }])
  app.factory('tilesaw', ['$http', function($http) {
    return { get: function(image) {
      return $http.get('//tilesaw.dx.artsmia.org/'+image+'.tif').then(function(result) { return result.data; })
    }}
  }])
  app.factory('notes', ['$http', function($http) {
    return function() {
      // TODO: how do we want to cache/bundle the JSON? WP is slow
      // also cache it within ng so we aren't requesting/parsing it on each request
      return $http.get('http://new.artsmia.org/crashpad/json/').then(function(result) {
        return result.data;
      })
    }
  }])

  app.directive('flatmap', function(tilesaw) {
    return {
      restrict: 'E',
      scope: {
        json: '@',
        image: '@'
      },
      replace: true,
      transclude: true,
      template: '<div id="{{container}}" class="flatmap"><div ng-transclude></div></div>',
      controller: function($scope) {
        var scope = $scope

        var loadImage = function(image) {
          scope.viewChanging = true
          scope.currentImage = image
          tilesaw.get(image).then(function(tileJson) {
            $('#'+scope.container).find('.leaflet-tile-pane').css('visibility', 'visible') // why is this necessary? when I re-init a zoomer it's visibility is hidden.
            var tileUrl = tileJson.tiles[0].replace('http://0', 'http://{s}')
            scope.zoom = Zoomer.zoom_image({container: scope.container, tileURL: tileUrl, imageWidth: tileJson.width, imageHeight: tileJson.height})
            scope.$broadcast('viewChanged')
          })
        }
        loadImage(scope.image)

        var annotateAndZoom = function(geometry) {
          if(scope.jsonLayer) removeJsonLayer()
          if(geometry) scope.jsonLayer = L.GeoJSON.geometryToLayer(geometry)
          if(scope.viewChanging) return // hold off until the view changes, resulting in `viewChanged` triggering this again
          if(scope.jsonLayer) {
            scope.$parent.$broadcast('showAnnotationsPanel', 'annotations')
            scope.jsonLayer.setStyle({stroke: true, fill: false, weight: 2, color: '#eee', opacity: '0.5'})
            scope.zoom.map.addLayer(scope.jsonLayer)
            scope.zoom.map.fitBounds(scope.jsonLayer.getBounds())
          }
        }

        var removeJsonLayer = function() {
          scope.zoom.map.removeLayer(scope.jsonLayer)
        }

        scope.$on('changeGeometry', function(event, geometry) { annotateAndZoom(geometry) }, true)
        scope.$on('viewChanged', function(event, message) { scope.viewChanging = false; annotateAndZoom() }, true)
        scope.$on('changeView', function(event, message) {
          if(message.image != scope.currentImage) loadImage(message.image)
        })

        return {
          loadImage: loadImage,
          annotateAndZoom: annotateAndZoom,
          removeJsonLayer: removeJsonLayer,
          scope: scope
        }
      },
      link: function(scope, element, attrs) {
        scope.container = 'zoom-' + scope.image + '-' + new Date().getUTCMilliseconds()
      }
    }
  })

  app.directive('note', function() {
    var divIcon = L.divIcon({className: 'noteMarker'})
    return {
      restrict: 'E',
      // scope: {note: '=', view: '='},
      controller: function($scope) {},
      require: '^flatmap',
      link: function(scope, element, attrs, flatmapCtrl)  {
        window.noteScope = scope
        scope.flatmapCtrl = flatmapCtrl
        scope.map = scope.flatmapCtrl.scope.zoom.map
        scope.jsonLayer = L.GeoJSON.geometryToLayer(scope.note.firebase.geometry)
        scope.note.index = scope.$parent.$index + scope.$index + 1
        divIcon.options.html = "<span>" + scope.note.index + "</span>"
        scope.marker = L.marker(scope.jsonLayer.getBounds().getCenter(), {icon: divIcon})

        var zoomNote = function() {
          flatmapCtrl.scope.$broadcast('changeView', scope.view)
          flatmapCtrl.scope.$broadcast('changeGeometry', scope.note.firebase.geometry)
          scope.$apply(function() { scope.note.active = true })
        }
        var toggleNoteZoom = function() {
          if(scope.note.active) {
            flatmapCtrl.removeJsonLayer()
            // TODO: reset back to main view? Show view changing chrome?
            scope.map.zoomOut(100)
            scope.$apply(function() { scope.note.active = false })
          } else {
            zoomNote()
            var lastNote = flatmapCtrl.scope.lastActiveNote
            if(lastNote) lastNote.active = false
          }
          flatmapCtrl.scope.lastActiveNote = scope.note
        }

        scope.marker.addTo(scope.map).on('click', toggleNoteZoom)
      }
    }
  })

  app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', 'objects', 'notes',
    function($scope, $routeParams, $location, objects, notes) {
      $scope.id = $routeParams.id
      objects().then(function(data) {
        $scope.json = data[$scope.id]
        $scope.objects = data
      })
      notes().then(function(_wp) {
        $scope.wp = _wp.objects[$scope.id]
        if($scope.wp) {
          $scope.notes = $scope.wp.views
          $scope.$$phase || $scope.$apply()
        }
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
      $scope.$on('showAnnotationsPanel', function(view) {
        $scope.activeSection = 'annotations'
      })

      function activateAnnotationAndChangeImageIfNeccessary(note, view) {
        note.active = true
        $scope.$broadcast('changeView', view)
        $scope.$broadcast('changeGeometry', note.firebase.geometry)
      }

      $scope.activateNote = function(note, view) {
        // TODO: bubble this up into the directive so it works when clicking markers
        var shouldActivate = !note.active
        angular.forEach(view.annotations, function(ann) { ann.active = false })
        if(shouldActivate) activateAnnotationAndChangeImageIfNeccessary(note, view)
      }

      $scope.toggleSixbar = function(element) {
        $scope.sixBarClosed = !$scope.sixBarClosed
        setTimeout(Zoomer.windowResized, 0)
      }
    }
  ])

  app.controller('notesCtrl', ['$scope', '$routeParams', 'notes',
    function($scope, $routeParams, wp) {
      $scope.id = $routeParams.id
      wp().then(function(_wp) {
        $scope.notes = _wp.objects[$scope.id].views
        $scope.$apply()
      })
    }
  ])

  app.controller('MainCtrl', ['$scope', '$routeParams', 'objects',
    function($scope, $routeParams, objects) {
      objects().then(function(data) {
        $scope.objects = data
      })
    }
  ])
})()

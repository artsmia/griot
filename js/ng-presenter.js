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

        var removeJsonLayer = function() {
          if(scope.jsonLayer) scope.zoom.map.removeLayer(scope.jsonLayer)
        }

        var loadImage = function(image) {
          scope.viewChanging = true
          scope.image = image
          removeJsonLayer(); scope.jsonLayer = null
          tilesaw.get(image).then(function(tileJson) {
            $('#'+scope.container).find('.leaflet-tile-pane').css('visibility', 'visible') // why is this necessary? when I re-init a zoomer it's visibility is hidden.
            var tileUrl = tileJson.tiles[0].replace('http://0', 'http://{s}')
            scope.zoom = Zoomer.zoom_image({container: scope.container, tileURL: tileUrl, imageWidth: tileJson.width, imageHeight: tileJson.height})
            scope.$broadcast('viewChanged')
          })
        }
        loadImage(scope.image)

        var annotateAndZoom = function(geometry) {
          removeJsonLayer()
          if(geometry) scope.jsonLayer = L.GeoJSON.geometryToLayer(geometry)
          if(scope.viewChanging) return // hold off until the view changes, resulting in `viewChanged` triggering this again
          if(scope.jsonLayer) {
            scope.$parent.$broadcast('showAnnotationsPanel', 'annotations')
            scope.jsonLayer.setStyle({stroke: true, fill: false, weight: 2, color: '#eee', opacity: '0.5'})
            scope.zoom.map.addLayer(scope.jsonLayer)
            scope.zoom.map.fitBounds(scope.jsonLayer.getBounds())
          }
        }

        scope.$on('changeGeometry', function(event, geometry) { annotateAndZoom(geometry) }, true)
        scope.$on('viewChanged', function(event, message) { scope.viewChanging = false; annotateAndZoom() }, true)
        scope.$on('changeView', function(event, message) {
          if(message.image != scope.image) loadImage(message.image)
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
        scope.flatmapCtrl = flatmapCtrl
        scope.map = scope.flatmapCtrl.scope.zoom.map
        scope.jsonLayer = L.GeoJSON.geometryToLayer(scope.note.firebase.geometry)
        scope.note.index = scope.$parent.$index + scope.$index + 1
        divIcon.options.html = "<span>" + scope.note.index + "</span>"
        scope.marker = L.marker(scope.jsonLayer.getBounds().getCenter(), {icon: divIcon})
        scope.note.active = false

        var zoomNote = function() {
          flatmapCtrl.scope.$broadcast('changeView', scope.view)
          flatmapCtrl.scope.$broadcast('changeGeometry', scope.note.firebase.geometry)
          scope.note.active = true
        }
        var toggleNoteZoom = function() {
          scope.$apply(function() { scope.note.active = !scope.note.active })
        }

        scope.$watch('note.active', function(newVal, oldVal) {
          if(!newVal && oldVal && scope.note == flatmapCtrl.scope.lastActiveNote) {
            flatmapCtrl.removeJsonLayer()
            scope.map.zoomOut(100)
          } else if(newVal && !oldVal) {
            var lastNote = flatmapCtrl.scope.lastActiveNote
            if(lastNote) lastNote.active = false
            zoomNote()
            flatmapCtrl.scope.lastActiveNote = scope.note
          }
        })

        flatmapCtrl.scope.$watch('image', function(newVal, oldVal) {
          // scope.marker.setOpacity(newVal == scope.$parent.view.image ? 1 : 0)
          if(newVal == scope.$parent.view.image) {
            scope.marker.setOpacity(1)
            scope.marker.on('click', toggleNoteZoom)
          } else {
            scope.marker.setOpacity(0)
            scope.marker.off('click', toggleNoteZoom)
          }
        })

        scope.marker.addTo(scope.map)
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

      $scope.toggleView = function(nextView) {
        $scope.activeSection = nextView || 'about'
      }
      $scope.toggleView()
      $scope.$on('showAnnotationsPanel', function(view) {
        $scope.activeSection = 'annotations'
      })

      $scope.activateNote = function(note, view) {
        note.active = !note.active
      }

      $scope.deactivateAllNotes = function() {
        angular.forEach($scope.notes, function(view) {
          angular.forEach(view.annotations, function(ann) { ann.active = false; })
        })
        $scope.$$phase || $scope.$apply()
      }

      $scope.activateView = function(view) {
        // TODO: encapsulate active view the same way I do notes, with view.active?
        $scope.deactivateAllNotes()
        $scope.$broadcast('changeView', view)
      }
      $scope.activateViewAndShowFirstAnnotation = function(view) {
        $scope.activateView(view)
        var note = view.annotations[0]
        if(note) activateNote(note)
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

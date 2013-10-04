/*jshint asi: true*/

(function() {
  'use strict'
  window.app = angular.module('presenter', ['ngRoute']);

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

  app.constant('envConfig', {
    objects: 'objects.json',
    tilesaw: '//tilesaw.dx.artsmia.org/', // '//localhost:8887/'
    tileUrlSubdomain: function(tileUrl) {
      return tileUrl.replace('http://0.', 'http://') //{s}')
    },
    crashpad: 'fallback/crashpad.json' // 'http://new.artsmia.org/crashpad/json/'
  })

  app.factory('objects', ['$http', 'envConfig', function($http, config) {
    return function() {
      return $http.get(config.objects).then(function(result) { return result.data; })
    }
  }])
  app.factory('tilesaw', ['$http', 'envConfig', function($http, config) {
    return { get: function(image) {
      return $http.get(config.tilesaw + image + '.tif').then(function(result) { return result.data; })
    }}
  }])
  app.factory('notes', ['$http', 'envConfig', function($http, config) {
    return function() {
      // TODO: how do we want to cache/bundle the JSON? WP is slow
      // also cache it within ng so we aren't requesting/parsing it on each request
      return $http.get(config.crashpad).then(function(result) {
        return result.data;
      })
    }
  }])

  app.directive('flatmap', function(tilesaw, envConfig) {
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
            var tileUrl = envConfig.tileUrlSubdomain(tileJson.tiles[0])
            scope.zoom = Zoomer.zoom_image({container: scope.container, tileURL: tileUrl, imageWidth: tileJson.width, imageHeight: tileJson.height})
            scope.$emit('viewChanged')
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
            var map = scope.zoom.map
            map.addLayer(scope.jsonLayer)
            map.zoomOut(100) // zoom all the way out and back in. Leaflet is misbehaving when zooming outside the current bounds, and this is a bit sketchy of a fix
            setTimeout(function() { map.fitBounds(scope.jsonLayer.getBounds()) }, 500)
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

  app.filter('titleCase', function () {
    return function (input) {
      var words = input.split(' ');
      for (var i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
      }
      return words.join(' ');
    } // https://gist.github.com/maruf-nc/5625869
  });

  app.directive('tombstone', function() {
    return {
      restrict: 'E',
      // scope: {info: '='},
      controller: function($scope) {},
      require: '',
      replace: true,
      template: '<dl><dt ng-repeat-start="field in fields">{{field | titleCase}}</dt><dd ng-repeat-end="">{{json[field]}}</dd></dl>',
      link: function(scope, element, attrs)  {
        scope.fields = ['medium', 'culture', 'dated', 'country', 'continent', 'style',
          'dimension', 'description', 'text', 'creditline', 'marks', 'room']
      }
    }
  })

  app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', '$sce', 'objects', 'notes',
    function($scope, $routeParams, $location, $sce, objects, notes) {
      $scope.id = $routeParams.id
      objects().then(function(data) {
        $scope.json = data[$scope.id]
        $scope.json.trustedDescription = $sce.trustAsHtml($scope.json.description)
        $scope.objects = data
      })
      notes().then(function(_wp) {
        $scope.wp = _wp.objects[$scope.id]
        if($scope.wp) {
          $scope.wp.trustedDescription = $sce.trustAsHtml($scope.wp.description)
          $scope.$on('viewChanged', function() {
            $scope.notes = $scope.wp.views
            angular.forEach($scope.notes, function(view) {
              angular.forEach(view.annotations, function(ann) {
                ann.trustedDescription = $sce.trustAsHtml(ann.description)
              })
            })
            $scope.$$phase || $scope.$apply()
          })
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

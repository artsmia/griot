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
      }).when('/stories/:id', {
        templateUrl: 'views/story.html',
        controller: 'storyCtrl'
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
    crashpad: 'http://cdn.dx.artsmia.org/crashpad.json'
  })

  app.factory('objects', ['$http', 'envConfig', function($http, config) {
    return function() {
      return $http.get(config.objects, {cache: true}).then(function(result) { return result.data; })
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
          if(scope.inverseLayer) scope.zoom.map.removeLayer(scope.inverseLayer)
        }

        var showJsonLayer = function(fadeAfter, inverse) {
          if(!scope.jsonLayer) return
          var layerStyle = {stroke: true, fill: false, weight: 2, color: '#eee', opacity: '0.5'},
            addLayer = null

          if(inverse) {
            scope.inverseLayer = L.polygon([scope.zoom.imageBounds.toPolygon()._latlngs, scope.jsonLayer._latlngs])
            scope.inverseLayer.setStyle({fill: true, fillColor: '#000', fillOpacity: '0.5', stroke: false})
            addLayer = scope.inverseLayer
          } else {
            scope.jsonLayer.setStyle(layerStyle)
            addLayer = scope.jsonLayer
          }
          scope.zoom.map.addLayer(addLayer)
          // if(fadeAfter) setTimeout(removeJsonLayer, fadeAfter)
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
            var map = scope.zoom.map
            map.zoomOut(100) // zoom all the way out and back in. Leaflet is misbehaving when zooming outside the current bounds, and this is a bit sketchy of a fix
            setTimeout(function() { map.fitBounds(scope.jsonLayer.getBounds()) }, 500)
            showJsonLayer(3000, true)
          }
        }

        scope.$on('changeGeometry', function(event, geometry) { annotateAndZoom(geometry) }, true)
        scope.$on('viewChanged', function(event, message) { scope.viewChanging = false; annotateAndZoom() }, true)
        scope.$on('changeView', function(event, message) {
          if(message.image != scope.image) loadImage(message.image)
        })

        scope.$on('viewChanged', function() {
          scope.zoom.map.on('zoomedBeyondMin', function(e) {
            if(scope.$parent && scope.$parent.changeZoomerForViews)
              scope.$parent.changeZoomerForViews(this, scope)
          })
        })

        return {
          loadImage: loadImage,
          annotateAndZoom: annotateAndZoom,
          removeJsonLayer: removeJsonLayer,
          showJsonLayer: showJsonLayer,
          scope: scope
        }
      },
      link: function(scope, element, attrs) {
        scope.container = 'zoom-' + scope.image + '-' + new Date().getUTCMilliseconds()
        element.attr('id', scope.container)
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
        scope.note.index = scope.$parent.$parent.noteCount = (scope.$parent.$parent.noteCount || 0) + 1
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
      var words = input.replace('_', ' ').split(' ');
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
          'dimension', 'description', 'text', 'creditline', 'marks', 'room', 'accession_number']
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
        $scope.relatedStories = []
        angular.forEach($scope.wp.relatedStories, function(story_id){
          $scope.relatedStories.push({
            'id':story_id,
            'title':_wp.stories[story_id].title
          })
        })
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

          // $scope.notes = $scope.wp.views
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

      $scope.viewEnabled = function(nextView, debug) {
        return (nextView == 'more' && $scope.relatedStories && $scope.relatedStories.length > 0 ||
          nextView == 'annotations' && $scope.notes && $scope.notes.length > 0 ||
          nextView == 'about')
      }

      $scope.toggleView = function(nextView) {
        nextView = nextView || 'about'
        if(!$scope.viewEnabled(nextView)) return
        if(nextView == 'annotations') {
          if(!$scope.notes) $scope.notes = $scope.wp.views
          var view = $scope.notes && $scope.notes[0], firstNote = view && view.annotations && view.annotations[0]
          if(firstNote) {
            $scope.activateNote(firstNote, $scope.notes[0])
            setTimeout(function() {
              document.querySelector('ol#annotations').scrollIntoView()
            }, 0)
          }
        }
        $scope.activeSection = nextView
      }
      $scope.toggleView()
      $scope.$on('showAnnotationsPanel', function(view) {
        $scope.activeSection = 'annotations'
      })
      $scope.changeZoomerForViews = function(map, flatmapScope) {
        $scope.$apply(function() { $scope.showViews = true })
      }


      $scope.activateNote = function(note, view) {
        $scope.activeView = view
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
        $scope.showViews = false
        $scope.activeView = view
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

  app.controller('storyCtrl', ['$scope', '$routeParams', '$sce', 'notes', function($scope, $routeParams, $sce, wp) {
    wp().then(function(wordpress) {
      window.$scope = $scope
      $scope.id = $routeParams.id
      window.wordpress = wordpress
      $scope.story = wordpress.stories[$scope.id]
      $scope.relatedObjects = [];
      angular.forEach($scope.story.relatedObjects, function(id){
        $scope.relatedObjects.push({
          'id':id,
          'title':wordpress.objects[id].title,
          'image':wordpress.objects[id].views[0].image
        })
      })

      angular.forEach($scope.story.pages, function(page) {
        page.trustedText = $sce.trustAsHtml(page.text.replace(/<p>(&nbsp;)?<\/p>/,''))
        page.trustedVideo = $sce.trustAsResourceUrl(page.video)
        page.poster = $sce.trustAsResourceUrl(page.video + '.jpg')
        page.storyCaptionOpen = true;
        page.toggleStoryCaption = function(){
          this.storyCaptionOpen = !this.storyCaptionOpen;
        }
        /* Deprecated
        page.updateActivePage = function($index){
          $scope.activePage = $index;
        }
        */
      })

      $scope.storyMenuOpen = false
      $scope.toggleStoryMenu = function(){
        $scope.storyMenuOpen = !$scope.storyMenuOpen
      }

      $scope.activePage = 0
      $scope.updateActivePage = function(newPage){
        if((newPage > -1) && (newPage < $scope.story.pages.length)){
          $scope.activePage = newPage
        }
      }
      $scope.backToObject=function(){
        history.go(-1);
      }
    })

  }])

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

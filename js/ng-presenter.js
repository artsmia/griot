/*jshint asi: true*/

(function() {
  'use strict'
  window.app = angular.module('presenter', ['ngRoute', 'ngTouch', 'segmentio']);

  app.config(
    ['$routeProvider', function($routeProvider) {
      return $routeProvider.when('/', {
        templateUrl: 'views/index.html',
        controller: 'mainCtrl'
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
      return tileUrl.replace('http://0.', 'http://{s}.')
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
  app.factory('credits', ['$http', 'envConfig', function($http, config) {
    return function() {
      return $http.get('http://cdn.dx.artsmia.org/credits.json', {cache: true}).then(function(result) {
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
      template: '<div id="{{container}}" class="flatmap" ng-class="{zoomed: zoomed}"><div ng-transclude></div><p class="hint">Pinch to zoom</p></div>',
      controller: function($scope) {
        var scope = $scope
        scope.$parent.flatmapScope = scope

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
            scope.$parent.$parent.tileJson = tileJson
            scope.$parent.$parent.imageAspectRatio = tileJson.width / tileJson.height
            scope.zoom = Zoomer.zoom_image({container: scope.container, tileURL: tileUrl, imageWidth: tileJson.width, imageHeight: tileJson.height})
            scope.$emit('viewChanged')
            scope.$parent.mapLoaded = true
            var watchForZoom = scope.zoom.map.on('zoomstart', function() {
              scope.$apply(function() { scope.zoomed = true })
              scope.zoom.map.off(watchForZoom)
            })
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

        // TODO: get this working better
        // scope.$on('viewChanged', function() {
        //   scope.zoom.map.on('zoomedBeyondMin', function(e) {
        //     if(scope.$parent && scope.$parent.changeZoomerForViews)
        //       scope.$parent.changeZoomerForViews(this, scope)
        //   })
        // })

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

  app.directive('note', function(segmentio) {
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
          scrollNoteTextIntoView()
        }
        var scrollNoteTextIntoView = function() { // this is hacky
          var noteEl = $('#annotations li.note:nth-child(' + (scope.$index+1) + ')')[0]
          if(noteEl) noteEl.scrollIntoViewIfNeeded() || noteEl.scrollIntoView()
        }
        var toggleNoteZoom = function() {
          scope.$apply(function() { scope.note.active = !scope.note.active })
        }

        scope.$watch('note.active', function(newVal, oldVal) {
          var openedOrClosed = undefined
          if(!newVal && oldVal && scope.note == flatmapCtrl.scope.lastActiveNote) {
            flatmapCtrl.removeJsonLayer()
            scope.map.zoomOut(100)
            flatmapCtrl.scope.lastActiveNote = null
            openedOrClosed = 'Closed'
          } else if(newVal && !oldVal) {
            var lastNote = flatmapCtrl.scope.lastActiveNote, note = scope.note
            if(lastNote) lastNote.active = false
            zoomNote()
            flatmapCtrl.scope.lastActiveNote = scope.note
            openedOrClosed = 'Opened'
          }
          if(openedOrClosed) segmentio.track(openedOrClosed + ' a Detail', {title: scope.note.title, index: scope.note.index, id: flatmapCtrl.scope.$parent.id})

          var layer = scope.jsonLayer
          scope.marker.setLatLng(newVal ? layer._latlngs[0] : layer.getBounds().getCenter())
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

  app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', '$sce', 'objects', 'notes', 'segmentio', '$rootScope', 'credits',
    function($scope, $routeParams, $location, $sce, objects, notes, segmentio, $rootScope, credits) {
      $scope.id = $routeParams.id
      $rootScope.lastObjectId = $scope.id = $routeParams.id
      objects().then(function(data) {
        $scope.json = data[$scope.id]
        $scope.json.trustedDescription = $sce.trustAsHtml($scope.json.description)
        $scope.objects = data
        segmentio.track('Browsed an Object', {id: $scope.id, name: $scope.json.title})
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
          $scope.$on('viewChanged', loadDetails)
          if($scope.mapLoaded) loadDetails()

          // $scope.notes = $scope.wp.views
          $scope.$$phase || $scope.$apply()
        }
      })

      credits().then(function(_credits) { $scope.credits = _credits })

      var loadDetails = function() {
        $scope.notes = $scope.wp.views
        angular.forEach($scope.notes, function(view) {
          angular.forEach(view.annotations, function(ann) {
            ann.trustedDescription = $sce.trustAsHtml(ann.description)
          })
        })
        $scope.$$phase || $scope.$apply()
      }

      $scope.currentAttachment = null

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

      $scope.toggleView = function(nextView, dontTrack) {
        if(!dontTrack) segmentio.track('Changed Sections within an Object', {view: nextView})
        nextView = nextView || 'about'
        if(!$scope.viewEnabled(nextView)) return
        if(nextView == 'annotations') {
          if(!$scope.notes) $scope.notes = $scope.wp.views
          var view = $scope.notes && $scope.notes[0], firstNote = view && view.annotations && view.annotations[0]
          if(firstNote && !$scope.flatmapScope.lastActiveNote) {
            $scope.activateNote(firstNote, $scope.notes[0])
            setTimeout(function() {
              document.querySelector('ol#annotations').scrollIntoView()
            }, 0)
          } else if($scope.flatmapScope.lastActiveNote) {
            // If there's an active annotation, center the map over it.
            if(!$scope.flatmapScope.zoom.map.getBounds().contains($scope.flatmapScope.jsonLayer.getBounds())) {
              $scope.$broadcast('changeGeometry', $scope.flatmapScope.lastActiveNote.firebase.geometry)
            }
          }
        }
        $scope.activeSection = nextView
      }

      $scope.toggleAttachment = function(attachment, closeAttachmentIfOpen, $event){
        if($scope.currentAttachment==attachment){
          if(!closeAttachmentIfOpen) return;
          $scope.currentAttachment = $scope.showAttachmentCredits = null;
        } else {
          $scope.currentAttachment = attachment;
          $scope.showAttachmentCredits = false
          setTimeout(Zoomer.windowResized, 0);
        }
        if($event) $event.stopPropagation();
      }
      $scope.toggleAttachmentCredits = function(attachment) {
        $scope.showAttachmentCredits = !$scope.showAttachmentCredits
      }

      $scope.toggleView(undefined, true)
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

      $scope.toggleExtendedTombstone = function(event) {
        $scope.showExtendedTombstone = !$scope.showExtendedTombstone
        if(event) event.stopPropagation()
      }
    }
  ])

  app.controller('storyCtrl', ['$scope', '$routeParams', '$sce', 'segmentio', 'notes', 'credits', function($scope, $routeParams, $sce, segmentio, wp, credits) {
    wp().then(function(wordpress) {
      $scope.id = $routeParams.id
      $scope.story = wordpress.stories[$scope.id]
      $scope.relatedObjects = [];
      angular.forEach($scope.story.relatedObjects, function(id){
        $scope.relatedObjects.push({
          'id':id,
          'title':wordpress.objects[id].title,
          'image':wordpress.objects[id].views[0].image
        })
      })

      credits().then(function(_credits) { $scope.credits = _credits })

      angular.forEach($scope.story.pages, function(page) {
        if(page.text) page.trustedText = $sce.trustAsHtml(page.text.replace(/<p>(&nbsp;)?<\/p>/,''))
        page.trustedVideo = $sce.trustAsResourceUrl(page.video)
        page.poster = $sce.trustAsResourceUrl(page.video + '.jpg')
        page.storyCaptionOpen = true;
        page.toggleStoryCaption = function(){
          this.storyCaptionOpen = !this.storyCaptionOpen;
          setTimeout(Zoomer.windowResized, 0)
        }
      })
      segmentio.track('Opened a Story', {id: $scope.id, name: $scope.story.title})

      // setTimeout(Zoomer.windowResized, 0)

      setTimeout(Zoomer.windowResized, 100)
      $scope.storyMenuOpen = false
      $scope.toggleStoryMenu = function(){
        $scope.storyMenuOpen = !$scope.storyMenuOpen
      }

      $scope.activePage = 0
      $scope.updateActivePage = function(newPage){
        if((newPage > -1) && (newPage < $scope.story.pages.length)){
          $scope.activePage = newPage
          segmentio.track('Paged a Story', {id: $scope.id, name: $scope.story.title, page: newPage})
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

  app.controller('mainCtrl', ['$scope', '$routeParams', 'objects', 'segmentio', '$rootScope', '$timeout', 'orderByFilter',
    function($scope, $routeParams, objects, segmentio, $rootScope, $timeout, orderByFilter) {
      window.$rootS = $rootScope
      $scope.orderByFilter = orderByFilter
      objects().then(function(data) {
        if($rootScope.randomizedAll == undefined) {
          $scope.objects = data
          $scope.stories = [ { title: 'Dance', id: 281, poster: 'http://tdx.s3.amazonaws.com/sande-dance-rough.mp4.jpg'}, { title: 'Getatchew Haile on Ethopian Manuscripts', id: 256, poster: 'http://tdx.s3.amazonaws.com/GetatchewFINAL.mp4.jpg'}, { title: 'Making Pots', id: 154 }, { title: 'Real or Fake?', id: 207, poster: 'http://tdx.s3.amazonaws.com/ife-ct-2013.mp4.jpg'}, { title: 'The Tale of the Tusk', id: 233, poster: 'http://cdn.dx.artsmia.org/thumbs/tn_111103_mia348_GH7_3718.jpg'}, { title: 'The Ivory Trade', id: 240, poster: 'http://cdn.dx.artsmia.org/thumbs/tn_2013_TDXAfrica_046_01.jpg'}, { title: 'Ikat Weaving', id: 246, poster: 'http://tdx.s3.amazonaws.com/Ikat-vfa7srYWo4s.mp4.jpg'}, { title: 'Mystery of the Mummy', id: 236 }, { title: 'Making a Mummy', id: 249, poster: 'http://tdx.s3.amazonaws.com/HowtoMakeaMummy-1gFY7ST-Tws.mp4.jpg'}, { title: 'Osiris, God of the Underworld', id: 251 } ]
          var all = []
          angular.forEach($scope.objects.ids, function(id) { all.push(id) })
          angular.forEach($scope.stories, function(story) { all.push(story) })
          $scope.all = $rootScope.randomizedAll = $scope.orderByFilter(all, $scope.random)
        } else {
          $scope.all = $rootScope.randomizedAll
        }

        $scope.loaded = false
        window.$scope = $scope
        $timeout(function() {
          imagesLoaded(document.querySelector('#cover'), function() {
            $scope.p = new Packery(document.querySelector('#cover'), {
              layoutMode: 'horizontal',
              rowHeight:310
            })
            if($rootScope.pageXOffset) {
              window.scrollTo($rootScope.pageXOffset, 0)
            }
          })
        }, 100)
      })

      $scope.random = function() {
        return 0.5 - Math.random()
      }

      if(!$rootScope.identifier) {
        var adjs = ["autumn", "hidden", "bitter", "misty", "silent", "empty", "dry",
          "dark", "summer", "icy", "delicate", "quiet", "white", "cool", "spring",
          "patient", "twilight", "dawn", "crimson", "wispy", "weathered", "blue"]
        , nouns = ["waterfall", "river", "breeze", "moon", "rain", "wind", "sea",
          "morning", "snow", "lake", "sunset", "pine", "shadow", "leaf", "dawn",
          "glitter", "forest", "hill", "cloud", "meadow", "sun", "glade", "bird",
          "brook", "butterfly", "bush", "dew", "dust", "field", "fire", "flower"]
        , number = Math.floor(Math.random()*100)
        , name = adjs[Math.floor(Math.random()*(adjs.length-1))]+"-"+nouns[Math.floor(Math.random()*(nouns.length-1))]+"-"+number
        $rootScope.identifier = name
        segmentio.identify(name)
      }

      segmentio.track('Landed on the homepage')

      $scope.$on("$destroy", function(){
        $rootScope.pageXOffset = window.pageXOffset
      })
    }
  ])

  app.directive("scroll", function ($window) {
    return function(scope, element, attrs) {
      var e = document.querySelector('#info')
      scope._scrollCallback = scope.$eval(attrs['scroll'])
      var scrollCallback = function(event) {
        if(scope.scrollAnimation) window.webkitCancelAnimationFrame(scope.scrollAnimation)
        scope.scrollAnimation = window.webkitRequestAnimationFrame(function() { // TODO: not just -webkit
          scope.scrolled = e.scrollTop >= 100
          scope.pageXOffset = window.pageXOffset
          if(scope._scrollCallback) scope._scrollCallback(element)
          scope.$$phase || scope.$apply()
        })
      },
      hooks = 'touchend touchstart touchmove touchleave touchcancel scroll'

      element.bind(hooks, scrollCallback)
      if(!scope._scrollCallback) return
      // Bug? binding to element doesn't catch horizontal scrolls…
      // use window.addEventListener to cover that.
      Array.prototype.map.call(hooks.split(' '), function(hook) {
        window.addEventListener(hook, scrollCallback)
      })
    }
  })

  app.directive("onPlay", function ($window) {
    return function(scope, element, attrs) {
      element.on('play pause', function() {
        $(this).toggleClass('playing')
      })
      element.on('play', function() {
        var $this = $(this)
        if($this.data('fullscreened') == undefined) {
          this.webkitEnterFullscreen()
          $this.data('fullscreened', true)
        }
      })
    }
  })
})()

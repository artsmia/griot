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
      }).when('/goldweights', {
        templateUrl: 'views/goldweights.html',
        controller: 'goldweightsCtrl'
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
    contents: 'contents.json',
    tilesaw: '//tilesaw.dx.artsmia.org/', // '//localhost:8887/'
    tileUrlSubdomain: function(tileUrl) {
      return tileUrl.replace('http://0.', 'http://{s}.')
    },
    crashpad: 'http://cdn.dx.artsmia.org/crashpad.json'
  })

  app.factory('contents', ['$http', 'envConfig', function($http, config) {
    return function() {
      return $http.get(config.contents, {cache: true}).then(function(result) { return result.data; })
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

  app.directive('flatmap', function(tilesaw, envConfig, $rootScope) {
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
        scope.zoomed = $rootScope.zoomed

        var removeJsonLayer = function() {
          if(scope.jsonLayer) scope.zoom.map.removeLayer(scope.jsonLayer)
          if(scope.inverseLayer) scope.zoom.map.removeLayer(scope.inverseLayer)
        }

        var showJsonLayer = function(fadeAfter, inverse) {
          if(!scope.jsonLayer) return
          var layerStyle = {stroke: true, fill: false, weight: 2, color: '#eee', opacity: '0.5'},
            addLayer = null

          if(inverse) {
            var holes = []
            scope.jsonLayer._latlngs ? holes.push(scope.jsonLayer._latlngs)
              : scope.jsonLayer.eachLayer(function(l) { holes.push(l._latlngs) })
            scope.inverseLayer = L.polygon([scope.zoom.imageBounds.toPolygon()._latlngs].concat(holes))
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
              (scope.$$phase || $rootScope.$$phase) || scope.$apply(function() { $rootScope.zoomed = scope.zoomed = true })
              scope.zoom.map.off(watchForZoom)
            })
          })
        }
        loadImage(scope.image)

        var annotateAndZoom = function(geometry) {
          removeJsonLayer()
          if(geometry) {
            if(geometry._initHooksCalled) { // it's a leaflet object, probably layer
              scope.jsonLayer = geometry
            } else {
              scope.jsonLayer = L.GeoJSON.geometryToLayer(geometry)
            }
          }
          if(scope.viewChanging) return // hold off until the view changes, resulting in `viewChanged` triggering this again
          if(scope.jsonLayer) {
            scope.$parent.$broadcast('showAnnotationsPanel', 'annotations')
            var map = scope.zoom.map,
                mapBounds = map.getBounds(),
                jsonLayerBounds = scope.jsonLayer.getBounds(),
                delay = 0
            if(mapBounds.intersects(jsonLayerBounds) || mapBounds.contains(jsonLayerBounds)) {
            } else {
              // Zoomer is misbehaving when zooming outside the current bounds, plus the zoom all the way out and back in thing is cool
              setTimeout(function() { map.zoomOut(100) }, 300)
              delay = 1000
            }
            setTimeout(function() { showJsonLayer(3000, true) }, delay)
            setTimeout(function() { map.fitBounds(scope.jsonLayer.getBounds()) }, delay+250)
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
        var jsonToLayer = function(note) {
          var geometry, json;
          if(note.type == 'FeatureCollection') {
            json = {type: 'MultiPolygon', coordinates: [].map.call(note.features, function (f) { return [f.geometry.coordinates[0]] })}
          } else {
            json = note.geometry
          }

          return L.GeoJSON.geometryToLayer(json)
        }

        var eachMarker = function(callback) {
          angular.forEach(scope.markers, callback)
        },
        eachLayer = function(layer, callback) {
          layer.eachLayer ? layer.eachLayer(callback) : callback(layer)
        }

        scope.flatmapCtrl = flatmapCtrl
        scope.map = scope.flatmapCtrl.scope.zoom.map
        scope.jsonLayer = jsonToLayer(scope.note.firebase)
        scope.note.index = scope.$parent.$parent.noteCount = (scope.$parent.$parent.noteCount || 0) + 1
        divIcon.options.html = "<span>" + scope.note.index + "</span>"
        scope.markers = []

        eachLayer(scope.jsonLayer, function(layer) {
          scope.markers.push(L.marker(layer.getBounds().getCenter(), {icon: divIcon}))
        })

        scope.note.active = false

        var zoomNote = function() {
          flatmapCtrl.scope.$broadcast('changeView', scope.view)
          flatmapCtrl.scope.$broadcast('changeGeometry', scope.jsonLayer)
          scope.note.active = true
          scope.$$phase || scope.$apply()
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

          var layer = scope.jsonLayer, index = 0
          eachLayer(layer, function(_layer) {
            scope.markers[index].setLatLng(newVal ? _layer._latlngs[0] : _layer.getBounds().getCenter())
            index++
          })
        })

        flatmapCtrl.scope.$watch('image', function(newVal, oldVal) {
          eachMarker(function(marker) {
            if(newVal == scope.$parent.view.image) {
              marker.setOpacity(1)
              marker.on('click', toggleNoteZoom)
            } else {
              marker.setOpacity(0)
              marker.off('click', toggleNoteZoom)
            }
          })
        })

        eachMarker(function(marker) { marker.addTo(scope.map) })
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

  app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', '$sce', 'contents', 'notes', 'segmentio', '$rootScope', 'credits',
    function($scope, $routeParams, $location, $sce, contents, notes, segmentio, $rootScope, credits) {
      $scope.id = $routeParams.id
      $rootScope.lastObjectId = $scope.id = $routeParams.id
      contents().then(function(data) {
        $scope.json = data.objects[$scope.id]
        $scope.json.trustedDescription = $sce.trustAsHtml($scope.json.description)
        $scope.objects = data.objects
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

          // Open the More tab when returning from a story via the 'Back' button
          $rootScope.nextView && ($scope.activeSection = $rootScope.nextView) && ($rootScope.nextView = undefined)
          $rootScope.title = $scope.wp.title
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

  app.controller('storyCtrl', ['$scope', '$routeParams', '$sce', 'segmentio', 'notes', 'credits', '$rootScope', function($scope, $routeParams, $sce, segmentio, wp, credits, $rootScope) {
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

      angular.forEach($scope.story.pages, function(page) {
        if(page.text) {
          var iframe_pattern = /<p>\[(http:\/\/.*)\]<\/p>/,
            match = page.text.match(iframe_pattern)
          if(match && match[1]) {
            page.iframe = $sce.trustAsResourceUrl(match[1])
            page.text = page.text.replace(/<p>\[(http:\/\/.*)\]<\/p>/, '').trim()
          }
          page.trustedText = $sce.trustAsHtml(page.text.replace(/<p>(&nbsp;)?<\/p>/,''))
        }
        page.trustedVideo = $sce.trustAsResourceUrl(page.video)
        page.poster = $sce.trustAsResourceUrl(page.video + '.jpg')
        page.storyCaptionOpen = true;
        page.toggleStoryCaption = function(){
          this.storyCaptionOpen = !this.storyCaptionOpen;
          setTimeout(Zoomer.windowResized, 100)
        }
      })

      $rootScope.title = $scope.story.title
      segmentio.track('Opened a Story', {id: $scope.id, name: $scope.story.title})
    })

    credits().then(function(_credits) { $scope.credits = _credits })

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
      setTimeout(Zoomer.windowResized, 200)
    }
    $scope.backToObject=function(){
      $rootScope.nextView = 'more'
      history.go(-1);
    }
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

  app.controller('mainCtrl', ['$scope', '$routeParams', 'contents', 'segmentio', '$rootScope', '$timeout', 'orderByFilter',
    function($scope, $routeParams, contents, segmentio, $rootScope, $timeout, orderByFilter) {
      $rootScope.nextView = undefined
      $scope.orderByFilter = orderByFilter
      contents().then(function(data) {
        if($rootScope.randomizedAll == undefined) {
          $scope.objects = data.objects
          $scope.stories = data.stories
          $scope.lockup = data.lockup
          var all = []
          angular.forEach($scope.objects.ids, function(id) { all.push(id) })
          angular.forEach($scope.stories, function(story) { all.push(story) })
          $scope.all = $rootScope.randomizedAll = $scope.orderByFilter(all, $scope.random)
          $scope.all.push($scope.lockup);
        } else {
          $scope.all = $rootScope.randomizedAll
        }

        var $cover = document.querySelector('#cover')
        var initPackery = function() {
          $scope.p = new Packery($cover, {layoutMode: 'horizontal', rowHeight:310})
          $scope.p.unbindResize()
          document.body.scrollWidth < 4000 ? $timeout(initPackery, 300) : ($scope.loaded = true)
        }
        $timeout(function() {
          initPackery()
          if($rootScope.pageXOffset) { window.scrollTo($rootScope.pageXOffset, 0) }
        }, 0)
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
        var $this = $(this), _ended
        if($this.data('fullscreened') == undefined) { // only force fullscreen once
          this.webkitEnterFullscreen()
          $this.data('fullscreened', true)
        }
        // return to the normal screen when video ends
        _ended || element.on('ended', function() {
          this.webkitExitFullScreen()
        })
      })
    }
  })

  app.controller('goldweightsCtrl', ['$scope', '$sce', 'segmentio', 'notes', 'contents', function($scope, $sce, segmentio, wp, contents) {
    wp().then(function(wordpress) {
      window.$scope = $scope
      Zoomer.windowResized()
      $scope.goldweights = wordpress.objects['196']
      $scope.showDescription = true

      var loadNotes = function() {
        $scope.notes = $scope.goldweights.views
        angular.forEach($scope.notes, function(view) {
          angular.forEach(view.annotations, function(ann) {
            var proverbLinkPattern = /\n?<p>\[(PR\d+)\]<\/p>/, match = ann.description.match(proverbLinkPattern), proverbId = match && match[1]
            ann.proverb = proverbId
            ann.trustedAudio = $sce.trustAsResourceUrl('//cdn.dx.artsmia.org/goldweights/'+proverbId+'.mp3')
            ann.trustedDescription = $sce.trustAsHtml(ann.description.replace(proverbLinkPattern, ''))
          })
        })
        $scope.$$phase || $scope.$apply()
      }
      $scope.$on('viewChanged', loadNotes)
      if($scope.mapLoaded) loadNotes()
    })

    contents().then(function(_contents) {
      $scope.objects = _contents.objects
      $scope.$$phase || $scope.$apply()
    })

    $scope.play = function(scope, $event) {
      $('audio').each(function() { this.pause() })
      var audio = $event.target.querySelector('audio')
      audio.paused ? audio.play() : audio.pause()
      scope.playing = !audio.paused
      audio.addEventListener('ended', function() {
        scope.playing = false
        scope.$apply()
      })
    }

    $scope.toggle = function(scope) {
      $scope.popupWeight = ($scope.popupWeight == scope ?  undefined : scope)
    }

    $scope.toggleInfo = function(scope) {
      $scope.showInfo = !$scope.showInfo
    }

    if(window.location.href.match(/west/)) {
      $('body').addClass('west')
      setTimeout(function() {
        window.scrollTo(0, document.body.scrollHeight)
      }, 1000)
    }

    $scope.home = function() {
      angular.forEach($scope.notes[0].annotations, function(note) { note.active = false })
      $scope.$apply()
    }
  }])

  app.directive('ngPoster', function() {
    return {
      priority: 99, // it needs to run after the attributes are interpolated
      link: function(scope, element, attr) {
        attr.$observe('ngPoster', function(value) {
          if (!value) return;
          attr.$set('poster', value);
        })
      }
    }
  }) // https://github.com/angular/angular.js/blob/v1.2.0/src/ng/directive/booleanAttrs.js#L86
})()

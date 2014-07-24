(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Adapters (MIA-specific)
 *
 * These adapters are specific to the MIA's implementation of Griot. You should
 * overwrite them if you'd like to use your own service to pull data. If you'd
 * rather pull all data from GriotWP or another service, set 
 * config.miaMediaMetaActive, config.miaObjectMetaActive, and 
 * config.miaThumbnailAdapterActive to false in config.js.
*/

/**
 * miaMediaMetaAdapter
 * 
 * Grabs media metadata from an external source and provides a method for
 * retrieving that metadata by ID.
 */
app.service( 'miaMediaMetaAdapter', function( $http, $sce ) {

  var _this = this;

  this.isActive = false;

  this.metaHash = {};

  this.get = function( id ) {
    return _this.metaHash[ id ] || false;
  }

  this.build = function( src ){

    $http.get( src, { cache: true } ).success( function( result ) {

      _this.isActive = true;
      
      for( var id in result ) {
        var description = result[ id ].description ? result[id].description + "<br />" : '';
        var credit = result[ id ].credit || '';
        _this.metaHash[ id ] = $sce.trustAsHtml( description + credit );
      }

    });

  }

});

/**
 * miaObjectMetaAdapter
 * 
 * Grabs object metadata from an external source and provides a method for
 * retrieving metadata reformatted into a particular grouping, i.e. to match
 * the groups in GriotWP.
 */
app.service( 'miaObjectMetaAdapter', function( $http, $sce ) {

  var _this = this;

  this.isActive = false;

  this.metaHash = {};  

  this.get = function( id, grouping ) {
    try{
      return _this.metaHash[ id ][ grouping ];
    } catch(e) {
      return null;
    }
  }

  this.build = function( src ) {

    $http.get( src, { cache: true } ).success( function( result ) {

      _this.isActive = true;

      for( var id in result ) {

        var groupings = {}, 
            artist, 
            culture, 
            country, 
            dated, 
            medium, 
            dimension, 
            creditline, 
            accession_number, 
            trustedDescription;

        // Skip ID listing
        if( 'ids' === id ) {
          continue;
        }

        artist = result[id].artist || 'Artist unknown';
        culture = result[id].culture || '';
        country = result[id].country || '';
        dated = result[id].dated || '';
        medium = result[id].medium || '';
        dimension = result[id].dimension || '';
        creditline = result[id].creditline || '';
        accession_number = result[id].accession_number || '';
        trustedDescription = $sce.trustAsHtml( result[id].description );

        groupings.meta1 = artist + ', ' + ( culture && culture + ', ' ) + country;
        groupings.meta2 = dated;
        groupings.meta3 = $sce.trustAsHtml( ( medium && medium + "<br />" ) + ( dimension && dimension + "<br />" ) + ( creditline && creditline + "<br />" ) + accession_number );

        // Special editions for goldweights
        groupings.gw_title = $sce.trustAsHtml( result[id].title );
        groupings.gw_meta2 = $sce.trustAsHtml( ( creditline && creditline + "<br />" ) + accession_number );

        _this.metaHash[id] = groupings;

      }

    });
  }

});

/**
 * miaThumbnailAdapter
 * 
 * Provides a method for retrieving an image thumbnail from an external source,
 * given an image ID.
 */
app.service( 'miaThumbnailAdapter', function() {

  var _this = this;

  this.isActive = false;

  this.cdn = '';

  this.init = function( cdn ) {
    _this.isActive = true;
    _this.cdn = cdn;
  }

  this.get = function( id ) {
    var trimmed_id = id.replace( '.tif', '' );
    return _this.cdn + 'thumbs/tn_' + trimmed_id + '.jpg';
  }

});
},{}],2:[function(require,module,exports){
/**
 * Set up application and load modules.
 */

/*jshint asi: true*/
'use strict';

window.app = angular.module('griot', ['ngRoute', 'ngTouch', 'segmentio']);

require('./routes')

require('./config')
app.config(
  ['$httpProvider', function($httpProvider) {
    return delete $httpProvider.defaults.headers.common['X-Requested-With'];
  }]
)

app.run(['$rootScope', 'envConfig', 'miaMediaMetaAdapter', 'miaObjectMetaAdapter', 'miaThumbnailAdapter', function( root, config, mediaMeta, objectMeta, objectThumb ) {
	root.cdn = config.cdn;

	// If adapters are enabled, retrieve and prepare alternate data
	if( config.miaMediaMetaActive ) {
		mediaMeta.build( config.miaMediaMetaSrc );
	}
	if( config.miaObjectMetaActive ) {
		objectMeta.build( config.miaObjectMetaSrc );
	}
	if( config.miaThumbnailActive ) {
		objectThumb.init( config.miaThumbnailSrc );
	}
}])

require('./factories')
require('./adapters')

require('./controllers/object')
require('./controllers/story')
require('./controllers/notes')
require('./controllers/main')
require('./controllers/goldweights')

require('./directives/flatmap')
require('./directives/note')
require('./directives/vcenter')
require('./directives/ngPoster')
require('./directives/transparentize')
require('./directives/drawerify')
require('./directives/recalculateDrawerStates')
require('./directives/share')

},{"./adapters":1,"./config":3,"./controllers/goldweights":4,"./controllers/main":5,"./controllers/notes":6,"./controllers/object":7,"./controllers/story":8,"./directives/drawerify":9,"./directives/flatmap":10,"./directives/ngPoster":11,"./directives/note":12,"./directives/recalculateDrawerStates":13,"./directives/share":14,"./directives/transparentize":15,"./directives/vcenter":16,"./factories":17,"./routes":18}],3:[function(require,module,exports){
/**
 * Configure application.
 */

app.constant('envConfig', {

  // Location of tile server; used in flatmap directive
  tilesaw: '//tilesaw.dx.artsmia.org/', // '//localhost:8887/'
  tileUrlSubdomain: function(tileUrl) {
    return tileUrl.replace('http://0.', 'http://{s}.')
  },

  // Location of content
  crashpad: 'http://new.artsmia.org/crashpad/griot/',

  // CDN for Goldweights audio (specific to MIA implementation)
  cdn: 'http://cdn.dx.artsmia.org/',

  miaEmailSharingActive: true,
  emailServer: 'http://10.1.8.115:33445/',

  // Adapters - set to false to use GriotWP for everything.
  miaMediaMetaActive: true,
  miaMediaMetaSrc: 'http://cdn.dx.artsmia.org/credits.json',
  miaObjectMetaActive: true,
  miaObjectMetaSrc: 'mia_object_meta.json',
  miaThumbnailActive: true,
  miaThumbnailSrc: 'http://cdn.dx.artsmia.org/'

});

},{}],4:[function(require,module,exports){
app.controller('goldweightsCtrl', ['$scope', '$sce', 'segmentio', 'notes', 'miaObjectMetaAdapter', 'miaThumbnailAdapter', function($scope, $sce, segmentio, wp, objectMeta, objectThumb ) {
  wp().then(function(wordpress) {
    window.$scope = $scope
    Zoomer.windowResized()
    $scope.goldweights = wordpress.objects['196']
    $scope.goldweights.trustedDescription = $sce.trustAsHtml( $scope.goldweights.description );
    $scope.showDescription = true

    var loadNotes = function() {
      $scope.notes = $scope.goldweights.views
      angular.forEach($scope.notes, function(view) {
        angular.forEach(view.annotations, function(ann) {
          var proverbLinkPattern = /\n?<p>\[(PR\d+)\]<\/p>/, match = ann.description.match(proverbLinkPattern), proverbId = match && match[1]
          ann.proverb = proverbId
          ann.trustedAudio = $sce.trustAsResourceUrl($scope.cdn+'goldweights/'+proverbId+'.mp3')
          ann.trustedDescription = $sce.trustAsHtml(ann.description.replace(proverbLinkPattern, ''))
          angular.forEach(ann.attachments, function(att) {
            var mash = att.image_id.split(' ');
            att.image_id = mash[0];
            att.object_id = mash[1];
            att.meta1 = att.metaG = '';
            if( objectMeta.isActive ) { // Let's hope it is, because this data does not exist elsewhere
              att.title = objectMeta.get( att.object_id, 'gw_title' );
              att.meta1 = objectMeta.get( att.object_id, 'meta1' );
              att.meta2 = objectMeta.get( att.object_id, 'gw_meta2' );
            }
            if( objectThumb.isActive ) {
              att.thumb = objectThumb.get( att.image_id );
            }
          })
        })
      })
      $scope.$$phase || $scope.$apply()
    }
    $scope.$on('viewChanged', loadNotes)
    if($scope.mapLoaded) loadNotes()
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
    $scope.$$phase || $scope.$apply()
  }

}])
},{}],5:[function(require,module,exports){
/**
 * Controller for cover page (index template).
 */
 
app.controller('mainCtrl', ['$scope', '$routeParams', 'notes', 'segmentio', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce',
  function($scope, $routeParams, notes, segmentio, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce) {
    $rootScope.nextView = undefined
    $scope.orderByFilter = orderByFilter
    notes().then(function(data) {
      if($rootScope.randomizedAll == undefined) {
        $scope.objects = data.objects
        $scope.stories = data.stories
        $scope.panels = data.panels
        var all = []
        angular.forEach($scope.objects, function(object) { 
          if( object ) {
            all.push(object);
          }
        });
        angular.forEach($scope.stories, function(story) { 
          if( story ){
            all.push(story);
          }
        });
        angular.forEach($scope.panels, function(panel) {
          if( panel && panel.position == 'random' ) {
            all.push(panel);
          }
        })
        $scope.all = $rootScope.randomizedAll = $scope.orderByFilter(all, $scope.random)
      } else {
        $scope.all = $rootScope.randomizedAll
      }

      angular.forEach( $scope.panels, function(panel) {
        panel.trustedContent = $sce.trustAsHtml( panel.content );
        if( panel && panel.position == 'start' ) {
          $scope.all.unshift( panel );
        }
        else if( panel && panel.position == 'end' ) {
          $scope.all.push( panel );
        }
      })

      var initIsotope = function() {

        if( window.innerHeight > window.innerWidth ) {
          return;
        }

        var cover = document.querySelector('#cover');

        $scope.iso = new Isotope( cover, {
          itemSelector:'.isotope-item',
          layoutMode:'masonryHorizontal',
          masonryHorizontal: {
            rowHeight: 300,
            gutter: 10
          },
          containerStyle: null,
          isInitLayout: false
        });

        var centerCover = function(){

          // Get height of container
          var availableHeight = $('.cover-wrapper').height();

          // Get number of rows - 300px plus 10px gutter.
          var rowCount = Math.floor( availableHeight / 310 ) || 1;

          // Get height that will wrap snugly around rows
          var newHeight = ( rowCount * 310 ) + 1;

          // Get new top for #cover
          var newTop = ( availableHeight - newHeight) / 2;

          // Update cover height and top margin
          $('#cover').css({
            'height': newHeight + 'px',
            'top': newTop + 'px'
          });

        }

        $scope.iso.on( 'layoutComplete', function(){

          centerCover();

          $('.cover-item').css({
            'opacity':1
          });

          $rootScope.loaded = true;

        });

        $(window).on( 'resize', function(){
          centerCover();
        });

        $scope.iso.layout();

      };

      imagesLoaded( document.querySelector('#cover'), function(){
        $timeout( 
          function(){
            initIsotope();
          }, 350 
        );
      });
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

},{}],6:[function(require,module,exports){
/**
 * Controller for notes template.
 */

app.controller('notesCtrl', ['$scope', '$routeParams', 'notes',
  function($scope, $routeParams, wp) {
    $scope.id = $routeParams.id
    wp().then(function(_wp) {
      $scope.notes = _wp.objects[$scope.id].views
      $scope.$apply()
    })
  }
])
},{}],7:[function(require,module,exports){
/**
 * Controller for object template.
 */

app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', '$sce', 'notes', 'segmentio', '$rootScope', 'miaMediaMetaAdapter', 'miaObjectMetaAdapter', 'email', 'envConfig', '$timeout', 
  function($scope, $routeParams, $location, $sce, notes, segmentio, $rootScope, mediaMeta, objectMeta, email, config, $timeout) {

    // Defaults
    $scope.movedZoomer = false;
    $scope.currentAttachment = null;
    $scope.contentMinimized = window.outerWidth < 1024;
    $scope.enableSharing = config.miaEmailSharingActive
    $scope.translucent = false;

    $scope.id = $routeParams.id
    $rootScope.lastObjectId = $scope.id = $routeParams.id
    notes().then(function(_wp) {
      $scope.wp = _wp.objects[$scope.id]
      segmentio.track('Browsed an Object', {id: $scope.id, name: $scope.wp.title})
      
      $scope.wp.meta3 = $sce.trustAsHtml( $scope.wp.meta3 );
  
      // Replace object metadata if using adapter
      if( objectMeta.isActive ) {
        $scope.wp.meta1 = objectMeta.get( $scope.id, 'meta1' ) || $scope.wp.meta1;
        $scope.wp.meta2 = objectMeta.get( $scope.id, 'meta2' ) || $scope.wp.meta2;
        $scope.wp.meta3 = objectMeta.get( $scope.id, 'meta3' ) || $scope.wp.meta3;
      }
      
      $scope.relatedStories = []
      angular.forEach($scope.wp.relatedStories, function(story_id){
        if( _wp.stories[story_id] ) { 
          $scope.relatedStories.push({
            'id':story_id,
            'title':_wp.stories[story_id].title
          })
        }
      })
      if($scope.wp) {
        $scope.wp.trustedDescription = $sce.trustAsHtml($scope.wp.description)
        $scope.$on('viewChanged', loadDetails)
        if($scope.mapLoaded) loadDetails()

        // Open the More tab when returning from a story via the 'Back' button
        if($rootScope.nextView) {
          $scope.activeSection = $rootScope.nextView
          $rootScope.nextView = undefined
          // make sure the drawer is open
          angular.element($('.object-content-container')).scope().drawerify.to('open', 0)
        }
        $scope.$$phase || $scope.$apply()

      }
    })
    
    var loadDetails = function() {
      $scope.notes = $scope.wp.views;
      $scope.allNotes = [];
      $scope.allAttachments = [];
      angular.forEach($scope.notes, function(view) {
        angular.forEach(view.annotations, function(ann) {
          ann.trustedDescription = $sce.trustAsHtml(ann.description)
          ann.view = view;
          $scope.allNotes.push( ann );

          // Replace attachment metadata if using adapter
          angular.forEach( ann.attachments, function(att) {
            if( mediaMeta.isActive ) {
              // Hacky! We need to only trustAsHtml(att.meta) once. Or find a better way generally.
              att.meta = mediaMeta.get( att.image_id ) || ( typeof att.meta === 'object' ? att.meta : $sce.trustAsHtml(att.meta) );
            }
            att.trustedDescription = $sce.trustAsHtml(att.description);
            $scope.allAttachments.push( att );
          })

        })
      })
      $scope.$$phase || $scope.$apply()
    }

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
          $scope.glanceText = $sce.trustAsHtml( "Press to view <span class='annotation-index'>" + $scope.flatmapScope.lastActiveNote.index + "</span>" );
          if(!$scope.flatmapScope.zoom.map.getBounds().contains($scope.flatmapScope.jsonLayer.getBounds())) {
            $scope.$broadcast('changeGeometry', $scope.flatmapScope.lastActiveNote.geoJSON.geometry)
          }
        }
      } else {
        $scope.glanceText = $sce.trustAsHtml( "Press to view object" );
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
      setTimeout(Zoomer.windowResized, 125)
    }

    $scope.toggleView(undefined, true)
    $scope.$on('showAnnotationsPanel', function(view) {
      $scope.activeSection = 'annotations'
    })

    $scope.changeZoomerForViews = function(map, flatmapScope) {
      $scope.$apply(function() { $scope.showViews = true })
    }


    $scope.activateNote = function(note, view) {
      /*
      $scope.translucent = true;
      */
      $scope.showViews = false
      $scope.activeView = view
      note.active = !note.active
      $scope.glanceText = $sce.trustAsHtml( "Press to view <span class='annotation-index'>" + note.index + "</span>" );
      /*
      $timeout( function(){
        $scope.translucent = false;
      }, 1000 );
      */
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

      $scope.flatmapScope.$broadcast('changeView', view)
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
      $scope.$broadcast( 'recalculateCustomDrawerStates' );
      if(event) event.stopPropagation()
    }

    $scope.toggleMinimizeContent = function() {
      $scope.contentMinimized = !$scope.contentMinimized;
      //setTimeout( Zoomer.windowResized, 125); // Zoomer now stays put behind content
    }

    $scope.glanceText = $sce.trustAsHtml( "Press to view object" );
  }
])


},{}],8:[function(require,module,exports){
/**
 * Controller for story template.
 */

app.controller('storyCtrl', ['$scope', '$routeParams', '$sce', 'segmentio', 'notes', 'miaMediaMetaAdapter', '$rootScope', 
  function($scope, $routeParams, $sce, segmentio, wp, mediaMeta, $rootScope ) {
 
    wp().then(function(wordpress) {
      $scope.id = $routeParams.id
      $scope.usingMediaAdapter = false;
      $scope.story = wordpress.stories[$scope.id];
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
        page.contentMinimized = false;
        page.toggleMinimizeContent = function(){
          this.contentMinimized = !this.contentMinimized;
          setTimeout(Zoomer.windowResized, 100)
        }
        page.meta = $sce.trustAsHtml( page.meta );
        page.metaB = $sce.trustAsHtml( page.metaB );

        if( mediaMeta.isActive ) {
          // Identify the key - media URL for videos, media ID for zoomers.
          var key = null, keyB = null;
          switch( page.type ) {
            case 'text':
              break;
            case 'video':
              key = page.video;
              break;
            case 'image':
              key = page.image;
              break;
            case 'comparison':
              key = page.image;
              keyB = page.imageB;
              break;
          }
          // Look up in mediaMeta hash or fall back to GriotWP value.
          if( key ) {
            page.meta = mediaMeta.get( key ) || page.meta;
          }
          if( keyB ) {
            page.metaB = mediaMeta.get( keyB ) || page.metaB;
          }
        }

        // Glance Text
        switch( page.type ){
          case 'video':
            page.glanceText = 'Tap to play video';
            break;
          case 'image':
            page.glanceText = 'Press to view image';
            break;
          case 'comparison':
            page.glanceText = 'Press to view images';
            break;
          default:
            page.glanceText = 'Press to view';
        }

      });

      segmentio.track('Opened a Story', {id: $scope.id, name: $scope.story.title})
    })

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
      if(history.length > 1) {
        history.back();
      } else {
        window.location = window.location.origin + window.location.pathname
      }
    }
  }
])
},{}],9:[function(require,module,exports){
/**
 * Drawerify directive
 * 
 * Converts the contents of a container to a sliding drawer.
 */
app.directive( 'drawerify', function( $timeout ){
	return {
		restrict: 'A',
		transclude: true,
		replace: true,
		template: "<div class='drawerify-drawer' ng-class=\"{'drawerify-horizontal':drawerify.orientation == 'horizontal', 'drawerify-vertical':drawerify.orientation == 'vertical', 'drawerify-full':drawerify.fullWidth, 'drawerify-open': drawerify.activeState == 'open', 'drawerify-closed':drawerify.activeState == 'closed' }\">" +
				"<div class='drawerify-content' ng-transclude></div>" +
				"<a class='drawerify-handle' ng-class=\"{'drawerify-collapsed':drawerify.collapseHandle && drawerify.states[ drawerify.activeState ].handleState == 'collapsed' } \"></a>" +
			"</div>",
		controller: function( $scope, $element, $attrs ){

			var _this = this;

			$scope.drawerify = this;

			/************************************************************************
			 INTERNAL UTILITIES
			 ************************************************************************/

			/**
			 * chooseBreakpoint
			 * 
			 * Cycle through defined breakpoints and get the properties that apply
			 * to the current container width, then set them in the model. Breakpoints 
			 * are interpreted as min-width media queries.
			 */
			this._chooseBreakpoint = function(){

				// Arbitrarily huge number so we start wider than any actual screen
				var currentBpInt = 10000;

				var windowWidth = window.outerWidth;
				var breakpoint = 'default';

				for( var userBreakpoint in this.breakpoints ){
					var bpInt = parseInt( userBreakpoint );
					if( bpInt >= windowWidth && bpInt < currentBpInt ){
						currentBpInt = bpInt;
						breakpoint = userBreakpoint;
					}
				}

				return breakpoint;
			}


			/**
			 * getDrawerWidth
			 */
			this._getDrawerWidth = function(){

				// If maxWidth is wider than container, use container width
				var widthLimit = Math.min( this.containerWidth, this.maxWidth );

				// If maxWidth is narrower than container, but not narrow enough to
				// accommodate the handle, recalculate
				if( 'horizontal' == this.orientation && ( widthLimit + this.handleWidth ) > this.containerWidth ){
					widthLimit = this.containerWidth - this.handleWidth - 10;
				}

				return widthLimit;
			}


			/**
			 * getDrawerHeight
			 */
			this._getDrawerHeight = function(){

				var heightLimit = this.containerHeight;

				// Default height is 100% of container, but in vertical, we need to
				// make room for the handle
				if( 'vertical' == this.orientation ){
					heightLimit = this.containerHeight - this.handleHeight - 10;
				}

				return heightLimit;
			}


			/**
			 * _getDrawerStaticStyles
			 *
			 * Calculate CSS for drawer that won't change with state.
			 */
			this._getDrawerStaticStyles = function(){

				var drawerStyles = {
					// Show drawer, which is set to visibility:hidden in CSS to avoid FOUC
					position: 'absolute',
					visibility: 'visible',
					width: this.drawerWidth + 'px',
					height: this.drawerHeight + 'px',
					'z-index': 1000
				}

				// Sacrificing dryness for the sake of simplicity ...

				if( 'vertical' == this.orientation && 'left' == this.attachTo ){
					drawerStyles.top = 'auto';
					drawerStyles.right = 'auto';
					// drawerStyles.bottom is dynamic
					drawerStyles.left = '0';
				}
				else if( 'vertical' == this.orientation && 'right' == this.attachTo ){
					drawerStyles.top = 'auto';
					drawerStyles.right = '0';
					// drawerStyles.bottom is dynamic
					drawerStyles.left = 'auto';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					drawerStyles.top = '0';
					drawerStyles.right = 'auto';
					drawerStyles.bottom = '0';
					// drawerStyles.left is dynamic
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					drawerStyles.top = '0';
					// drawerStyles.right is dynamic
					drawerStyles.bottom = '0';
					drawerStyles.left = 'auto';
				}

				return drawerStyles;

			}

			/**
			 * _getHandleStaticStyles
			 *
			 * Calculate CSS for handle that won't change.
			 */
			this._getHandleStaticStyles = function(){

				var handleStyles = { display: 'block' };

				if( 'vertical' == this.orientation && 'left' == this.attachTo ){
					// handleStyles.top is dynamic
					handleStyles.right = 'auto';
					handleStyles.bottom = 'auto';
					handleStyles.left = '0';
				}
				else if( 'vertical' == this.orientation && 'right' == this.attachTo ){
					// handleStyles.top is dynamic
					handleStyles.right = '0';
					handleStyles.bottom = 'auto';
					handleStyles.left = 'auto';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					handleStyles.top = 'auto';
					handleStyles.right = 'auto';
					handleStyles.bottom = '0';
					// handleStyles.left is dynamic		
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					handleStyles.top = 'auto';
					handleStyles.right = this.drawerWidth + 'px';
					handleStyles.bottom = '0';
					// handleStyles.left is dynamic		
				}

				return handleStyles;

			}


			/**
			 * _getHandleStates
			 *
			 * Calculate CSS for handle that will change based on handle state.
			 */
			this._getHandleStates = function(){

				var handleStates;

				if( 'vertical' == this.orientation ){
					handleStates = {
						collapsed: {
							top: '0'
						},
						expanded: {
							top: '-' + this.handleHeight + 'px'
						}
					};
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					handleStates = {
						collapsed: {
							left: this.drawerWidth - this.handleWidth + 'px'	
						},
						expanded: {
							left: this.drawerWidth + 'px'
						}
					};
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					handleStates = {
						collapsed: {
							right: this.drawerWidth - this.handleWidth + 'px'
						},
						expanded: {
							right: this.drawerWidth + 'px'
						}
					}
				}

				return handleStates;
			}


			/**
			 * _getOpenState
			 *
			 * Calculate values for OPEN drawer state.
			 */
			this._getOpenState = function(){

				var pageLocation, openStyles = {};

				if( 'vertical' == this.orientation ){
					pageLocation = this.containerBottom - this.drawerHeight;
					openStyles.bottom = '0';

				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					pageLocation = this.containerLeft + this.drawerWidth;
					openStyles.left = '0';
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					pageLocation = this.containerRight - this.drawerWidth;
					openStyles.right = '0';
				}

				return {
					css: openStyles,
					pageLocation: pageLocation,
					handleState: 'collapsed'
				};
			}


			/**
			 * _getClosedState
			 *
			 * Calculate CSS for CLOSED drawer state.
			 */
			this._getClosedState = function(){

				var pageLocation, closedStyles = {};

				if( 'vertical' == this.orientation ){
					pageLocation = this.containerBottom;
					closedStyles.bottom = '-' + this.drawerHeight + 'px';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					pageLocation = this.containerLeft;
					closedStyles.left = '-' + this.drawerWidth + 'px';
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					pageLocation = this.containerRight;
					closedStyles.right = '-' + this.drawerWidth + 'px';
				}

				return {
					css: closedStyles,
					pageLocation: pageLocation,
					handleState: 'expanded'
				};
			}

			/**
			 * _getCustomState
			 *
			 * Calculate CSS for CUSTOM drawer states.
			 */
			this._getCustomState = function( stateName, initial ){

				var initial = typeof initial !== 'undefined' ? initial : false;

				var pageLocation, customStyles, handleState;

				// ISSUE: This early in load, height() is untrustworthy because some
				// elements haven't rendered yet.
				var selector = this.customStates[stateName];
				var $el = $( selector );
				var elPosition = $el.position().top;
				var elHeight = $el.outerHeight();
				var elTotalHeight = elPosition + elHeight + 10; // Some padding
				var heightDifference = this.drawerHeight - elTotalHeight;

				pageLocation = this.containerBottom - elTotalHeight;

				customStyles = {
					bottom: '-' + heightDifference + 'px'
				}

				handleState = elTotalHeight < this.handleHeight ? 'expanded' : 'collapsed';

				if( initial ){
					var cancel = $scope.$watch( function(){
						// Merely a dumb way to watch both properties at once
						return $el.height() + $el.position().top; 
					}, function(){
						$scope.drawerify.states[ stateName ] = $scope.drawerify._getCustomState( stateName, false );
						if( $scope.drawerify.activeState == stateName ){
							$scope.drawerify.to( stateName );
						}
					});
					$scope.$on( 'drawerTouched', function(){
						cancel();
					});
				}

				return {
					css: customStyles,
					pageLocation: pageLocation,
					handleState: handleState
				};
			}

			/**
			 * _getDragLimits
			 *
			 * Returns an object representing min and max pageX/pageY values,
			 * depending on orientation and attachment side.
			 */
			this._getDragLimits = function(){

				var limits = {};

				// NOTE: We use drawerHeight and drawerWidth here because they factor
				// in the size of the handle.

				if( 'vertical' == this.orientation ){
					limits.minPageY = this.containerBottom - this.drawerHeight;
					limits.maxPageY = this.containerBottom;
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					limits.minPageX = this.containerLeft;
					limits.maxPageX = this.containerLeft + this.drawerWidth;
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					limits.minPageX = this.containerRight - this.drawerWidth;
					limits.maxPageX = this.containerRight;
				}

				return limits;
			}

			/**
			 * _track
			 *
			 * Syncs drawer movement to touch.
			 */
			this._track = function( touch ){

				this.isMoving = true;
				this.activeState = null;

				var trackStyles = {};

				if( 'vertical' == this.orientation ){

					if( touch.pageY < this.limits.minPageY || touch.pageY > this.limits.maxPageY ){
						return;
					}

					trackStyles.bottom = '-' + ( this.drawerHeight - ( this.containerBottom - touch.pageY ) ) + 'px';

				}
				else if( 'horizontal' == this.orientation ){

					if( touch.pageX < this.limits.minPageX || touch.pageX > this.limits.maxPageX ){
						return;
					}

					if( 'left' == this.attachTo ){
						trackStyles.left = touch.pageX - this.drawerWidth;
					}
					else if( 'right' == this.attachTo ){
						trackStyles.right = '-' + ( this.drawerWidth - ( this.containerRight - touch.pageX ) ) + 'px';
					}
				}

				this.drawer.css( trackStyles );
			}

			/**
			 * _untrack
			 *
			 * Stop tracking drawer and animate to closest state.
			 */
			this._untrack = function( touch ){

				this.isMoving = false;

				var closestStateDistance = null;
				var key = this.orientation == 'vertical' ? 'pageY' : 'pageX';
				var position = touch[key];

				this.toNearestState( position );

			}


			/************************************************************************
			 CALLABLE FUNCTIONS
			 ************************************************************************/

			/**
			 * init
			 *
			 * Initialize drawer.
			 */
			this.init = function(){

				var props;

				this.drawer = $( $element[0] );
				this.handle = this.drawer.children( '.drawerify-handle' );
				this.container = this.drawer.offsetParent();
				
				this.breakpoints = $scope.$eval( $attrs.drawerify );
				this.activeBreakpoint = this._chooseBreakpoint();
				props = this.breakpoints[ this.activeBreakpoint ] || 'disabled';
				if( 'disabled' == props ){
					this.disable();
					return;
				}

				this.orientation = props.orientation || 'vertical';
				this.attachTo = props.attachTo || 'right';
				this.startingState = props.startingState || 'open';
				this.maxWidth = props.maxWidth || -1;
				this.customStates = props.customStates || null;
				this.collapseHandle = props.collapseHandle || false;

				this.containerWidth = this.container.width();
				this.containerHeight = this.container.height();
				this.containerTop = this.container.offset().top;
				this.containerBottom = this.containerTop + this.containerHeight;
				this.containerLeft = this.container.offset().left;
				this.containerRight = this.containerLeft + this.containerWidth;
				this.defaultSpeed = 300;
				this.handleWidth = 70;
				this.handleHeight = 70;
				this.drawerWidth = this._getDrawerWidth();
				this.fullWidth = this.orientation == 'vertical' && this.drawerWidth == this.containerWidth;
				this.drawerHeight = this._getDrawerHeight();
				this.limits = this._getDragLimits();

				// Define element positions
				this.drawer.css( this._getDrawerStaticStyles() );
				this.handle.css( this._getHandleStaticStyles() );

				// Define how drawer position will change based on state
				this.states = {
					open: this._getOpenState(),
					closed: this._getClosedState()
				};
				if( 'vertical' == this.orientation ){
					for( stateName in this.customStates ){
						this.states[ stateName ] = this._getCustomState( stateName, true );
					}
				}

				// Define how handle position will change based on handleState
				this.handleStates = this._getHandleStates();

				// Go to initial state
				this.to( this.startingState, 0 );

				$scope.$broadcast( 'drawerInitialized', this.drawer );
				$scope.$emit( 'drawerInitialized', this.drawer );

			}


			/**
			 * recalculateCustomStates
			 *
			 * Recalculate the positions of custom states. This is useful if an
			 * element that is used to define a custom state appears or changes size.
			 */
			this.recalculateCustomStates = function(){
				if( 'vertical' == this.orientation ){

					for( stateName in this.customStates ){
						this.states[ stateName ] = this._getCustomState( stateName );
					}

				}
			}


			/**
			 * to
			 *
			 * Transition from one state to another.
			 */
			this.to = function( state, transition ){

   			var transition = typeof transition !== 'undefined' ? transition : this.defaultSpeed;

				this.drawer.animate( this.states[ state ].css, transition );

				if( this.collapseHandle ){
					this.handle.animate( this.handleStates[ this.states[ state ].handleState ], 100 );
				} else {
					this.handle.animate( this.handleStates[ 'expanded' ], 100 );
				}
				this.activeState = state;
			}


			/**
			 * toNearestState
			 *
			 * Go to state nearest to the current location of the drawer. Useful for
			 * resetting the drawer after the DOM changes.
			 */
			this.toNearestState = function( position ){

				var distanceToClosestState = null;

				for( var state in this.states ){
					var distance = Math.abs( position - this.states[state].pageLocation );
					if( ! distanceToClosestState || distance < distanceToClosestState ){
						closestState = state;
						distanceToClosestState = distance;
					}
				}

				this.to( closestState );

			}


			/**
			 * toggle
			 *
			 * Toggle between open and closed transitions
			 */
			this.toggle = function(){

				if( this.activeState == 'open' ){
					this.to( 'closed' );
				} 
				else {
					this.to( 'open' );
				}

			}


			/**
			 * disable
			 *
			 * Turn off drawerify and reset controlled elements to original CSS.
			 */
			this.disable = function(){
				this.handle.hide();
				this.managedProperties = [ 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'z-index' ];
				angular.forEach( this.managedProperties, function( property ){
					$scope.drawerify.drawer.css( property, '' );
				});
			}


		},
		link: function( scope, elem, attrs ){

			scope.drawerify.init();

			/**
			 * Touchstart listener
			 */
			scope.drawerify.container.on( 'touchstart mousedown', function(){
				scope.$broadcast('drawerTouched');
			});

			/**
			 * Touchmove listener
			 */
			scope.drawerify.handle.on( 'touchmove', function(e){

				var touch = e.originalEvent.targetTouches[0];
				scope.drawerify._track( touch );

			});

			/**
			 * Touchend listener
			 */
			scope.drawerify.handle.on( 'touchend mouseup', function(e){

				// Get mouse events out of the way
				if( e.originalEvent instanceof MouseEvent ){
					scope.$apply( function(){
						scope.drawerify.toggle();
					});
					return;
				}

				var touch = e.originalEvent.changedTouches[0];

				// Drag
				if( scope.drawerify.isMoving ){
					scope.$apply( function(){
						scope.drawerify._untrack( touch );
					});
				} 
				// Click
				else {
					scope.$apply( function(){
						scope.drawerify.toggle();
					});
				}

				e.preventDefault();

			});

			/**
			 * Resize listener
			 */
			$(window).on( 'resize orientationchange', function(){
				scope.drawerify.init();
			});

		}
	}
});
},{}],10:[function(require,module,exports){
/**
 * Creates a zoomable image element.
 */

app.directive('flatmap', function(tilesaw, envConfig, $rootScope) {
  return {
    restrict: 'E',
    scope: {
      json: '@',
      image: '@'
    },
    replace: true,
    transclude: true,
    template: '<div id="{{container}}" class="flatmap" ng-class="{zoomed: zoomed}"><div ng-transclude></div></div>',
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


},{}],11:[function(require,module,exports){
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


},{}],12:[function(require,module,exports){
/**
 * Creates and controls annotation markers on a zoomable image (flatmap).
 */

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
      scope.jsonLayer = jsonToLayer(scope.note.geoJSON)
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
        if(noteEl) noteEl.scrollIntoViewIfNeeded && noteEl.scrollIntoViewIfNeeded() || noteEl.scrollIntoView()
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

        // The active marker goes to the SW (lower-left) corner of bounds
        // inactive markers, center of bounds
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


},{}],13:[function(require,module,exports){
app.directive( 'recalculateDrawerStates', function( $timeout ){
	return {
		restrict: 'A',
		require: '^drawerify',
		link: function( scope, elem, attrs, drawerify ){
			elem.on( 'touchend', function(){
				if( 'vertical' === drawerify.orientation ){
					$timeout( function(){
						drawerify.recalculateCustomStates();
						if( 'open' !== drawerify.activeState ){
							drawerify.to('info');
						}
					}, 50 );
				}
			});
		}
	}
});
},{}],14:[function(require,module,exports){
app.directive('share', function(email) {
  var template = '<form name="share" ng-submit="sendEmail()">' +
    '<input id="shareEmail" type="email" ng-model="email" required></input>' +
    '<input type="submit" ng-disabled="!share.$valid" value="Email this page" ng-click="sendEmail()"></input>' +
    '</form>'

  return {
    restrict: 'A',
    template: template,
    link: function(scope, element, attrs) {
      scope.showEmail = false
      scope.el = element
      var emailI = scope.el.find('input')[0]

      scope.toggleEmail = function(e) {
        if((e.toElement || e.currentTarget).nodeName == 'A') scope.showEmail = !scope.showEmail
        emailI.focus()
      }

      scope.sendEmail = function() {
        email.share(scope.email, {subject: scope.wp.title, body: window.location.href})
        scope.email = ''
        scope.showEmail = false
        emailI.blur()
      }
    }
  }
})

},{}],15:[function(require,module,exports){
/**
 * Turn a parent element transparent on touchstart.
 */

app.directive( 'transparentize', function($timeout){

	return {
		restrict:'A',
		require:'^?drawerify',
		link: function( scope, elem, attrs, drawerify ) {

			var $target = jQuery( attrs.transparentize );

			elem.on( 'touchstart mousedown', function(){
				if( attrs.hasOwnProperty( 'transparentizeAction' ) ){
					switch( attrs.transparentizeAction ){
						
						case 'playVideo':
							// Close drawer in case we're not on a device that automatically
							// full-screens the video
							if( drawerify ){
								drawerify.to('closed');
								$timeout( function(){
									var $video = $('video[src="' + scope.page.video + '"]');
									$video[0].play();
								}, 150 );
							}
							else {
								var $video = $('video[src="' + scope.page.video + '"]');
								$video[0].play();
							}
							break;
							

						default:
							$target.addClass('transparentized');
					}
				} 
				else {
					$target.addClass('transparentized');
				}
			});

			elem.on( 'touchend mouseup', function(e){
				$target.addClass('detransparentized');
				$target.removeClass('transparentized');
				$timeout(function() {
				  $target.removeClass('detransparentized');
				}, 300)
			});

		}
	}

});

},{}],16:[function(require,module,exports){
/**
 * Vertically centers an element within a container. Apply 'vcenter' class to 
 * element to be centered and make sure parent is positioned.
 */

app.directive( 'vcenter', function(){

	return{
		restrict: 'C',
		transclude: true,
		template: "<div class='vcenter-table'><div class='vcenter-cell' ng-transclude></div></div>",
		link: function( scope, elem, attrs ) {

			scope.container = jQuery( elem );

			if( scope.container.find( 'video' ).length ) {

				var unwatch = scope.$watch( 
					function(){
						return scope.container.height();
					}, 
					function(){
						setTimeout( function(){
							// Use post-transition height (not the one returned by $watch)
							var finalHeight = scope.container.height();
							scope.container.find( '.vcenter-cell' ).children('video').css( 'max-height', finalHeight );
						}, 150 );
					}
				);

				scope.$on("$destroy", function(){
	        unwatch();
	    	});

			}
		}
	}

});
},{}],17:[function(require,module,exports){
/**
 * Retrieve external data.
 */

// Tile data
app.factory('tilesaw', ['$http', 'envConfig', function($http, config) {
  return { get: function(image) {
    return $http.get(config.tilesaw + image + '.tif', {cache: true}).then(function(result) { return result.data; })
  }}
}])

// Application content
app.factory('notes', ['$http', 'envConfig', function($http, config) {
  return function() {
    // TODO: how do we want to cache/bundle the JSON? WP is slow
    // also cache it within ng so we aren't requesting/parsing it on each request
    return $http.get(config.crashpad, {cache: true}).then(function(result) {
      return result.data;
    })
  }
}])

app.factory('email', ['$http', 'envConfig', function($http, config) {
  return {
    share: function(email, params) {
      return $http.post(config.emailServer + email, params).success(function(response) {
        return response
      })
    }
  }
}])

},{}],18:[function(require,module,exports){
/**
 * Application routing
 */

app.config(['$routeProvider', function($routeProvider) {
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
}])


},{}]},{},[2])
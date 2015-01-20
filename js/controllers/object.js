/**
 * Controller for object template.
 */

app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', '$sce', 'notes', 'segmentio', '$rootScope', 'miaMediaMetaAdapter', 'miaObjectMetaAdapter', 'miaThumbnailAdapter', 'email', 'envConfig', '$timeout', 'resolvedObjectMeta',
  function($scope, $routeParams, $location, $sce, notes, segmentio, $rootScope, mediaMeta, objectMetaAdapter, miaThumbs, email, config, $timeout, objectMeta) {

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
      if( objectMetaAdapter.isActive ) {
        $scope.wp.meta1 = $scope.wp.meta1 || objectMeta.meta1;
        $scope.wp.meta2 = $scope.wp.meta2 || objectMeta.meta2;
        $scope.wp.meta3 = $scope.wp.meta3 || objectMeta.meta3;
        $scope.wp.location = objectMeta.location;
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
            att.thumbnail = miaThumbs.get(att.image_id)
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
          $scope.glanceText = $sce.trustAsHtml( "Press to view detail <span class='annotation-index'>" + $scope.flatmapScope.lastActiveNote.index + "</span>" );
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
      $scope.glanceText = $sce.trustAsHtml( "Press to view detail <span class='annotation-index'>" + note.index + "</span>" );
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


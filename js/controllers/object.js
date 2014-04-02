app.controller('ObjectCtrl', ['$scope', '$routeParams', '$location', '$sce', 'notes', 'segmentio', '$rootScope', 'fetchMediaMeta', 'fetchObjectMeta', 'envConfig', 
  function($scope, $routeParams, $location, $sce, notes, segmentio, $rootScope, fetchMediaMeta, fetchObjectMeta, config ) {

    $scope.usingMediaAdapter = false;
    if( config.mediaMetaUrl !== null ) {
      try{
        fetchMediaMeta().then( function( mediaMeta ){ 
          $scope.usingMediaAdapter = true;
          $scope.mediaMeta = mediaMeta;
        });
      } catch(e) {}
    }

    $scope.id = $routeParams.id
    $rootScope.lastObjectId = $scope.id = $routeParams.id
    notes().then(function(_wp) {
      $scope.wp = _wp.objects[$scope.id]
      segmentio.track('Browsed an Object', {id: $scope.id, name: $scope.wp.title})

      if( config.objectMetaUrl ) {
        fetchObjectMeta().then(function(objectMeta) {
          $scope.wp.meta1 = objectMeta[ $scope.id ][0] || $scope.wp.meta1;
          $scope.wp.meta2 = objectMeta[ $scope.id ][1] || $scope.wp.meta2;
          $scope.wp.meta3 = objectMeta[ $scope.id ][2] || $sce.trustAsHtml( $scope.wp.meta3 );
        });
      }
      
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
        $scope.$$phase || $scope.$apply()
      }
    })
    
    var loadDetails = function() {
      $scope.notes = $scope.wp.views
      angular.forEach($scope.notes, function(view) {
        angular.forEach(view.annotations, function(ann) {
          ann.trustedDescription = $sce.trustAsHtml(ann.description)
          angular.forEach( ann.attachments, function(att) {
            if( $scope.usingMediaAdapter ) {
              att.meta = $scope.mediaMeta[att.image_id] || att.meta;
            }
          })
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
            $scope.$broadcast('changeGeometry', $scope.flatmapScope.lastActiveNote.geoJSON.geometry)
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


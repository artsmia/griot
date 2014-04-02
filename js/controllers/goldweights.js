app.controller('goldweightsCtrl', ['$scope', '$sce', 'segmentio', 'notes', 'miaObjectMetaAdapter', function($scope, $sce, segmentio, wp, objectMeta ) {
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
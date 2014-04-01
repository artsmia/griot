app.controller('storyCtrl', ['$scope', '$routeParams', '$sce', 'segmentio', 'notes', 'fetchMediaMeta', '$rootScope', 'envConfig', function($scope, $routeParams, $sce, segmentio, wp, fetchMediaMeta, $rootScope, config) {
 
  $scope.usingMediaAdapter = false;
  if( config.mediaMetaUrl !== null ) {
    try{
      fetchMediaMeta().then( function( mediaMeta ){ 
        $scope.usingMediaAdapter = true;
        $scope.mediaMeta = mediaMeta;
      });
    } catch(e) {}
  }

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

      if( $scope.usingMediaAdapter ) {

        // Identify the key - URL for videos, ID for zoomers.
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

        // Look up in mediaMeta hash, or default to GriotWP value if blank.
        if( key ) {
          page.meta = $scope.mediaMeta[key] || page.meta;
        }
        if( keyB ) {
          page.metaB = $scope.mediaMeta[keyB] || page.metaB;
        }

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
    history.go(-1);
  }
}])

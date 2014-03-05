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

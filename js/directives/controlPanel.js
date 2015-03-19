app.directive('controlPanel', function() {
  return {
    restrict: 'E',
    replace: true,
    controller: function($scope, $element, $attrs) {
      console.log('controlPanel', $scope, $element, $attrs)
    },
    template: '<li class="cluster galleryLocation isotope-item cover-item" ng-class="{loading: loading}" ng-click="toggleSeeAll()" ng-if="clusterObjects">'+
      '<div ng-if="showingCluster">'+
        '<div ng-if="isGallery">'+
          '<p>Showing objects near <strong>Gallery {{gallery}}</strong></p>'+
          '<img ng-src="http://artsmia.github.io/map/galleries/{{gallery}}.png">'+
        '</div>'+
        '<div ng-if="!isGallery">'+
          '<p>Showing Museum Highlights</p>'+
        '</div>'+
        '<a>Explore more ArtStories</a>'+
      '</div>'+
      '<div ng-if="!showingCluster">'+
        '<p>Showing all ArtStories</p>'+
        '<img ng-if="isGallery" ng-src="http://artsmia.github.io/map/galleries/{{gallery}}.png">'+
        '<a>View only {{isGallery ? "objects nearby" : "Museum Highlights"}}</a>'+
      '</div>'+
    '</li>',
  }
})


app.controller('clustersCtrl', ['$scope', '$routeParams', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce', 'resolvedNotes', 'initIsotope', '$location',
  function($scope, $routeParams, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce, notes, initIsotope, $location) {
    $scope.clusters = require('../../clusters/clusters.json')
    var data = $scope.data = notes

    var clusterObjects = $scope.clusters[$routeParams.cluster]
    if(clusterObjects) {
      $scope.things = clusterObjects.map(function(objectId) {
        return data.objects[objectId]
      })
      $scope.cluster = $rootScope.defaultCluster = $routeParams.cluster
    } else { // not a valid cluster
      $location.path('/')
    }

    imagesLoaded(document.querySelector('#cover'), function() {
      $timeout(initIsotope, 350)
    });
  }
])

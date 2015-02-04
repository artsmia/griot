app.controller('clustersCtrl', ['$scope', '$routeParams', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce', 'resolvedNotes', 'initIsotope', '$location',
  function($scope, $routeParams, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce, notes, initIsotope, $location) {
    $scope.clusters = require('../../clusters/clusters.json')
    var data = $scope.data = notes

    var cluster = $routeParams.cluster
    var clusterObjectIds = $scope.clusters[cluster.replace(/^(g)?(\d+)/i, '$1$2')]
    if(clusterObjectIds) {
      $scope.cluster = $rootScope.defaultCluster = $routeParams.cluster
      $scope.gallery = $scope.cluster.replace('G', '')
      $scope.showingCluster = true
      $scope.clusterObjects = clusterObjectIds.map(function(objectId) {
        var isStory = objectId.match && objectId.match(/stories\/(\d+)/)
        if(isStory) return data.stories[isStory[1]]
        return data.objects[objectId]
      })
      $scope.randomClusterObjects = orderByFilter($scope.clusterObjects, function() { return 0.5 - Math.random() })
      $scope.all = angular.copy($scope.randomClusterObjects)
    } else { // not a valid cluster
      $location.path('/')
    }

    imagesLoaded(document.querySelector('#cover'), function() {
      $timeout(initIsotope, 350)
    });

    $scope.toggleSeeAll = function() {
      $scope.loading = true
      if($scope.showingCluster) { // add all other objects
        angular.forEach(data.objects, function(o) {
          ($scope.all.indexOf(o) > -1) || $scope.all.push(o)
        })
        angular.forEach(data.panels, function(p) {
          if($scope.all.indexOf(p) == -1 && p.position == 'end') $scope.all.push(p)
        })
      } else {
        $scope.all = angular.copy($scope.randomClusterObjects)
      }

      $timeout(function() {
        imagesLoaded(document.querySelector('#cover'), function() {
          $timeout(initIsotope, 350)
          $scope.loading = false
          $scope.showingCluster = !$scope.showingCluster
        })
      }, 0)
    }
  }
])

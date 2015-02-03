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
        return data.objects[objectId]
      })
      $scope.things = angular.copy($scope.clusterObjects)
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
          ($scope.things.indexOf(o) > -1) || $scope.things.push(o)
        })
        angular.forEach(data.panels, function(p) {
          if($scope.things.indexOf(p) == -1 && p.position == 'end') $scope.things.push(p)
        })
      } else {
        $scope.things = $scope.clusterObjects
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

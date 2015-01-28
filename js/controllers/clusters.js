app.controller('clustersCtrl', ['$scope', '$routeParams', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce', 'resolvedNotes', 'initIsotope',
  function($scope, $routeParams, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce, notes, initIsotope) {
    $scope.clusters = require('../../clusters/clusters.json')
    var data = $scope.data = notes

    $scope.cluster = $scope.clusters[$routeParams.cluster].map(function(objectId) {
      return data.objects[objectId]
    })

    imagesLoaded(document.querySelector('#cover'), function() {
      $timeout(initIsotope, 350)
    });
  }
])

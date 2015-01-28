app.controller('clustersCtrl', ['$scope', '$routeParams', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce', 'resolvedNotes',
  function($scope, $routeParams, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce, notes) {
    $scope.clusters = require('../../clusters/clusters.json')
    var data = $scope.data = notes
  }
])

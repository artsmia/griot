app.controller('notesCtrl', ['$scope', '$routeParams', 'notes',
  function($scope, $routeParams, wp) {
    $scope.id = $routeParams.id
    wp().then(function(_wp) {
      $scope.notes = _wp.objects[$scope.id].views
      $scope.$apply()
    })
  }
])


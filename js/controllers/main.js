/**
 * Controller for cover page (index template).
 */

app.controller('mainCtrl', ['$scope', '$routeParams', 'segmentio', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce', 'resolvedNotes', 'initIsotope', '$location',
  function($scope, $routeParams, segmentio, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce, notes, initIsotope, $location) {
    var data = $scope.data = notes
    if($rootScope.defaultCluster) return $location.path('/clusters/'+$rootScope.defaultCluster)

    $rootScope.nextView = undefined
    $scope.orderByFilter = orderByFilter

    if($rootScope.randomizedAll == undefined) {
      $scope.objects = data.objects
      $scope.panels = data.panels
      var all = []
      angular.forEach($scope.objects, function(object) { 
        if( object ) {
          all.push(object);
        }
      });
      angular.forEach($scope.panels, function(panel) {
        if( panel && panel.position == 'random' ) {
          all.push(panel);
        }
      })
      $scope.all = $rootScope.randomizedAll = $scope.orderByFilter(all, $scope.random)
    } else {
      $scope.all = $rootScope.randomizedAll
    }

    angular.forEach( $scope.panels, function(panel) {
      panel.trustedContent = $sce.trustAsHtml( panel.content );
      if( panel && panel.position == 'start' ) {
        $scope.all.unshift( panel );
      }
      else if( panel && panel.position == 'end' ) {
        $scope.all.push( panel );
      }
    })

    imagesLoaded(document.querySelector('#cover'), function() {
      $timeout(initIsotope, 350)
    });

    $scope.random = function() {
      return 0.5 - Math.random()
    }

    if(!$rootScope.identifier) {
      var adjs = ["autumn", "hidden", "bitter", "misty", "silent", "empty", "dry",
        "dark", "summer", "icy", "delicate", "quiet", "white", "cool", "spring",
        "patient", "twilight", "dawn", "crimson", "wispy", "weathered", "blue"]
      , nouns = ["waterfall", "river", "breeze", "moon", "rain", "wind", "sea",
        "morning", "snow", "lake", "sunset", "pine", "shadow", "leaf", "dawn",
        "glitter", "forest", "hill", "cloud", "meadow", "sun", "glade", "bird",
        "brook", "butterfly", "bush", "dew", "dust", "field", "fire", "flower"]
      , number = Math.floor(Math.random()*100)
      , name = adjs[Math.floor(Math.random()*(adjs.length-1))]+"-"+nouns[Math.floor(Math.random()*(nouns.length-1))]+"-"+number
      $rootScope.identifier = name
      segmentio.identify(name)
    }

    segmentio.track('Landed on the homepage')

    $scope.$on("$destroy", function(){
      $rootScope.pageXOffset = window.pageXOffset
    })
  }
])

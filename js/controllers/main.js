app.controller('mainCtrl', ['$scope', '$routeParams', 'notes', 'segmentio', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter',
  function($scope, $routeParams, notes, segmentio, $rootScope, $timeout, orderByFilter, thumbnailAdapter) {
    $rootScope.nextView = undefined
    $scope.orderByFilter = orderByFilter
    notes().then(function(data) {
      if($rootScope.randomizedAll == undefined) {
        $scope.objects = data.objects
        $scope.stories = data.stories
        var all = []
        angular.forEach($scope.objects, function(object) { 
          if( object ) {
            if( thumbnailAdapter.isActive ) {
              object.thumbnail = thumbnailAdapter.get( object.views[0].image ) || object.thumbnail;
            }
            all.push(object);
          }
        });
        angular.forEach($scope.stories, function(story) { 
          /*
          if( thumbnailAdapter.isActive ) {
            story.thumbnail = thumbnailAdapter.get( story.image_id ) || story.thumbnail;
          }
          */
          console.log( story );
          all.push(story);
        });
        $scope.all = $rootScope.randomizedAll = $scope.orderByFilter(all, $scope.random)
      } else {
        $scope.all = $rootScope.randomizedAll
      }

      var initPackery = function() {

        if( window.innerHeight > window.innerWidth ) {
          return;
        }

        var cover = document.querySelector('#cover');

        $scope.p = new Packery( cover, {
          layoutMode:'horizontal',
          itemSelector:'.packery-item',
          containerStyle:null
        });

        $rootScope.loaded = true;

      };

      typeof $rootScope.loaded == 'undefined' ? $timeout( initPackery, 750 ) : $timeout( initPackery, 0 );

      /*
      var initPackery = function() {
        $scope.p = new Packery($cover, {layoutMode: 'horizontal', rowHeight:310})
        $scope.p.unbindResize()
        document.body.scrollWidth < 4000 ? $timeout(initPackery, 300) : ($scope.loaded = true)
      }
      $timeout(function() {
        if(window.innerWidth > 320) initPackery()
        if($rootScope.pageXOffset) { window.scrollTo($rootScope.pageXOffset, 0) }
      }, 0)
      */

    })

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

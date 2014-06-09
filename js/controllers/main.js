/**
 * Controller for cover page (index template).
 */
 
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
            all.push(object);
          }
        });
        angular.forEach($scope.stories, function(story) { 
          all.push(story);
        });
        $scope.all = $rootScope.randomizedAll = $scope.orderByFilter(all, $scope.random)
      } else {
        $scope.all = $rootScope.randomizedAll
      }

      var initIsotope = function() {

        if( window.innerHeight > window.innerWidth ) {
          return;
        }

        var cover = document.querySelector('#cover');

        $scope.iso = new Isotope( cover, {
          itemSelector:'.isotope-item',
          layoutMode:'masonryHorizontal',
          masonryHorizontal: {
            rowHeight: 300,
            gutter: 10
          },
          containerStyle: null,
          isInitLayout: false
        });

        var centerCover = function(){

          console.log( 'Centering ...' )

          // Get height of container
          var availableHeight = $('.cover-wrapper').height();
          console.log( 'Available Height: ' + availableHeight );

          // Get number of rows - 300px plus 10px gutter.
          var rowCount = Math.floor( availableHeight / 310 );
          console.log( 'Row Count: ' + rowCount );

          // Get height that will wrap snugly around rows
          var newHeight = ( rowCount * 310 ) + 1;
          console.log( 'Used Height: ' + newHeight );

          // Get new top for #cover
          var newTop = ( availableHeight - newHeight) / 2;

          // Update cover height and top margin
          $('#cover').css({
            'height': newHeight + 'px',
            'top': newTop + 'px'
          });

          console.log( 'Done' );
        }

        $scope.iso.on( 'layoutComplete', function(){
          centerCover();
        });

        $(window).on( 'resize', function(){
          $timeout( function(){
            centerCover();
          });
        });

        $scope.iso.layout();
        
        /*
        var _scope = $scope;
        $(window).resize( function(){
          _scope.p.layout();
          console.log('window resize');
        });
        */
        $rootScope.loaded = true;

      };

      imagesLoaded( document.querySelector('#cover'), function(){
        $timeout( initIsotope );
      });

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

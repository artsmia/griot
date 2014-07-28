/**
 * Controller for cover page (index template).
 */
 
app.controller('mainCtrl', ['$scope', '$routeParams', 'notes', 'segmentio', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce',
  function($scope, $routeParams, notes, segmentio, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce) {

    console.log( $rootScope.touch );
    
    $rootScope.nextView = undefined
    $scope.orderByFilter = orderByFilter
    notes().then(function(data) {
      if($rootScope.randomizedAll == undefined) {
        $scope.objects = data.objects
        $scope.stories = data.stories
        $scope.panels = data.panels
        var all = []
        angular.forEach($scope.objects, function(object) { 
          if( object ) {
            all.push(object);
          }
        });
        angular.forEach($scope.stories, function(story) { 
          if( story ){
            all.push(story);
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

      var initIsotope = function() {

        if( window.innerWidth < 1024 ) {
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

          // Get height of container
          var availableHeight = $('.cover-wrapper').height();

          // Get number of rows - 300px plus 10px gutter.
          var rowCount = Math.floor( availableHeight / 310 ) || 1;

          // Get height that will wrap snugly around rows
          var newHeight = ( rowCount * 310 ) + 1;

          // Get new top for #cover
          var newTop = ( availableHeight - newHeight) / 2;

          // Update cover height and top margin
          $('#cover').css({
            'height': newHeight + 'px',
            'top': newTop + 'px'
          });

        }

        $scope.iso.on( 'layoutComplete', function(){

          centerCover();

          $('.cover-item').css({
            'opacity':1
          });

          $rootScope.loaded = true;

        });

        $(window).on( 'resize', function(){
          centerCover();
        });

        $scope.iso.layout();

      };

      imagesLoaded( document.querySelector('#cover'), function(){
        $timeout( 
          function(){
            initIsotope();
          }, 350 
        );
      });
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

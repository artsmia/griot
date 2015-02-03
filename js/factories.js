/**
 * Retrieve external data.
 */

// Tile data
app.factory('tilesaw', ['$http', 'envConfig', function($http, config) {
  return { get: function(image) {
    return $http.get(config.tilesaw + image + '.tif', {cache: true}).then(function(result) { return result.data; })
  }}
}])

// Application content
app.factory('notes', ['$http', 'envConfig', 'miaThumbnailAdapter', function($http, config, thumbs) {
  window.miaThumbnailAdapter = thumbs // TODO: why isn't this injected below? I can't access inside either of the next functions on L15 and 16
  return function() {
    return $http.get(config.crashpad, {cache: true}).then(function(result) {
      angular.forEach(result.data.objects, function(o) {
        o.thumbnail = miaThumbnailAdapter.get(o.views[0].image)
      })
      return result.data;
    })
  }
}])

app.factory('email', ['$http', 'envConfig', function($http, config) {
  return {
    share: function(email, params) {
      return $http.post(config.emailServer + email, params).success(function(response) {
        return response
      })
    }
  }
}])

app.factory('initIsotope', ['$rootScope', function($rootScope) {
  return function() {
    if( window.innerWidth < 1024 ) {
      return;
    }

    var cover = document.querySelector('#cover');

    this.iso = new Isotope( cover, {
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

    this.iso.on( 'layoutComplete', function(){

      centerCover();

      $('.cover-item').css({
        'opacity':1
      });

      $rootScope.loaded = true;

    });

    $(window).on( 'resize', function(){
      centerCover();
    });

    this.iso.layout();

  };
}])

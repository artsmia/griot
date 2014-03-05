app.directive("onPlay", function ($window) {
  return function(scope, element, attrs) {
    element.on('play pause', function() {
      $(this).toggleClass('playing')
    })
    element.on('play', function() {
      var $this = $(this), _ended
      if($this.data('fullscreened') == undefined) { // only force fullscreen once
        this.webkitEnterFullscreen()
        $this.data('fullscreened', true)
      }
      // return to the normal screen when video ends
      _ended || element.on('ended', function() {
        this.webkitExitFullScreen()
      })
    })
  }
})


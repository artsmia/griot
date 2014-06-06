var _requestAF = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame,
    _cancelAF = window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame

app.directive("scroll", function ($window) {
  return function(scope, element, attrs) {
    var e = document.querySelector('#info')
    scope._scrollCallback = scope.$eval(attrs['scroll'])
    var scrollCallback = function(event) {
      if(scope.scrollAnimation) _requestAF(scope.scrollAnimation)
      scope.scrollAnimation = _cancelAF(function() {
        scope.scrolled = e.scrollTop >= 100
        scope.pageXOffset = window.pageXOffset
        if(scope._scrollCallback) scope._scrollCallback(element)
        scope.$$phase || scope.$apply()
      })
    },
    hooks = 'touchend touchstart touchmove touchleave touchcancel scroll'

    element.bind(hooks, scrollCallback)
    if(!scope._scrollCallback) return
    // Bug? binding to element doesn't catch horizontal scrolls…
    // use window.addEventListener to cover that.
    Array.prototype.map.call(hooks.split(' '), function(hook) {
      window.addEventListener(hook, scrollCallback)
    })
  }
})


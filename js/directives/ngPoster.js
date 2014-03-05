app.directive('ngPoster', function() {
  return {
    priority: 99, // it needs to run after the attributes are interpolated
    link: function(scope, element, attr) {
      attr.$observe('ngPoster', function(value) {
        if (!value) return;
        attr.$set('poster', value);
      })
    }
  }
}) // https://github.com/angular/angular.js/blob/v1.2.0/src/ng/directive/booleanAttrs.js#L86


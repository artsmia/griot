app.directive('share', function(email) {
  var template = '<form name="share" ng-submit="sendEmail()">' +
    '<input id="shareEmail" type="email" ng-model="email" required></input>' +
    '<input type="submit" ng-disabled="!share.$valid" value="Email this page" ng-click="sendEmail()"></input>' +
    '</form>'

  return {
    restrict: 'A',
    template: template,
    link: function(scope, element, attrs) {
      scope.showEmail = false
      scope.el = element
      var emailI = scope.el.find('input')[0]

      scope.toggleEmail = function(e) {
        if((e.toElement || e.target).nodeName == 'A') scope.showEmail = !scope.showEmail
        emailI.focus()
      }

      scope.sendEmail = function() {
        email.share(scope.email, {subject: scope.wp.title, body: window.location.href})
        scope.email = ''
        scope.showEmail = false
        emailI.blur()
      }
    }
  }
})

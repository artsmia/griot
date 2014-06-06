/**
 * Application routing
 */

app.config(['$routeProvider', function($routeProvider) {
  return $routeProvider.when('/', {
    templateUrl: 'views/index.html',
    controller: 'mainCtrl'
  }).when('/o/:id', {
    templateUrl: 'views/object.html',
    controller: 'ObjectCtrl'
  }).when('/a/:id', {
    templateUrl: 'views/annotations.html',
    controller: 'notesCtrl'
  }).when('/stories/:id', {
    templateUrl: 'views/story.html',
    controller: 'storyCtrl'
  }).when('/goldweights', {
    templateUrl: 'views/goldweights.html',
    controller: 'goldweightsCtrl'
  }).otherwise({
    redirectTo: '/'
  })
}])


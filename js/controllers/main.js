/**
 * Controller for cover page (index template).
 */

app.controller('mainCtrl', ['$scope', '$routeParams', 'segmentio', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce', 'resolvedNotes', 'initIsotope', '$location',
  function($scope, $routeParams, segmentio, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce, notes, initIsotope, $location) {
    if($rootScope.defaultCluster) $location.path('/clusters/'+$rootScope.defaultCluster)

    var data = $scope.data = notes
    $rootScope.loaded = false

    var cluster = $rootScope.defaultCluster || $routeParams.cluster || 'highlights'
    var clusterObjectIds = data.clusters[cluster.replace(/^(g)?(\d+)/i, '$1$2')]
    if(clusterObjectIds) {
      $scope.cluster = $rootScope.defaultCluster = cluster
      $scope.isGallery = cluster.match(/^G\d/i)
      $scope.gallery = $scope.cluster.replace('G', '') // TODO: clusters aren't necessarily galleries anymore
      $scope.showingCluster = true
      $scope.clusterObjects = clusterObjectIds.map(function(objectId) {
        var isStory = objectId.match && objectId.match(/stories\/(\d+)/)
        if(isStory) return data.stories[isStory[1]]
        return data.objects[objectId]
      }).filter(function(o) { return o })

      // Once we have a set of randomized things for the index screen, save
      // them so they'r edisplayed consistently.
      if($rootScope.randomizedAll) {
        $scope.all = $scope.randomClusterObjects = $rootScope.randomizedAll
      } else {
        var startPanels = addPanelsToClusterObjects()
        $scope.randomClusterObjects = orderByFilter($scope.clusterObjects, function() { return 0.5 - Math.random() })
        startPanels.map(function(p) { $scope.randomClusterObjects.unshift(p) })
        $rootScope.randomizedAll = $scope.all = angular.copy($scope.randomClusterObjects)
      }
    } else { // not a valid cluster
      $location.path('/')
    }

    $scope.toggleSeeAll = function() {
      $scope.loading = true
      if($scope.showingCluster) { // add all other objects
        angular.forEach(data.objects, function(o) {
          ($scope.all.indexOf(o) > -1) || $scope.all.push(o)
        })
        angular.forEach(data.panels, function(p) {
          if($scope.all.indexOf(p) == -1 && p.position == 'end') $scope.all.push(p)
        })
      } else {
        $scope.all = angular.copy($scope.randomClusterObjects)
      }

      $timeout(function() {
        $timeout(initIsotope, 0)
        $scope.loading = false
        $scope.showingCluster = !$scope.showingCluster
      }, 0)
    }

    // Add the panels that should be randomized to `clusterObjects` and
    // return the panels that need to be at the beginning so they can be
    // `unshifted` after randomization happens
    function addPanelsToClusterObjects() {
      var panels = []
      angular.forEach(data.panels, function(p) { panels.push(p) })
      panels.filter(function(p) { return p.position == 'random' })
        .map(function(p) { $scope.clusterObjects.push(p) })
      return panels.filter(function(p) { return p.position == 'start' })
    }

    $rootScope.nextView = undefined

    $timeout(initIsotope, 0)

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

    // When returning to the home page from an object page, scroll to
    // that object.
    $rootScope.$watch('loaded', function(val) {
      if(val && $rootScope.lastObjectId) {
        var lastObjContainer = $('a[href*='+$rootScope.lastObjectId+']').parent()
        lastObjContainer[0].scrollIntoView()
      }
    })
  }
])

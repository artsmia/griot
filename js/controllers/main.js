/**
 * Controller for cover page (index template).
 */

app.controller('mainCtrl', ['$scope', '$routeParams', 'segmentio', '$rootScope', '$timeout', 'orderByFilter', 'miaThumbnailAdapter', '$sce', 'resolvedNotes', 'initIsotope', '$location',
  function($scope, $routeParams, segmentio, $rootScope, $timeout, orderByFilter, thumbnailAdapter, $sce, notes, initIsotope, $location) {
    var dc = $rootScope.defaultCluster
    if(dc && dc !== 'highlights') $location.path('/clusters/'+$rootScope.defaultCluster)

    var data = $scope.data = notes
    $rootScope.loaded = false
    var japanObjects = [122167, 122102, 122502, 122505, 3369, 122189, 122166, 122492, 122113, 122115, 6612]

    var cluster = $rootScope.defaultCluster || $routeParams.cluster || 'highlights'
    var clusterObjectIds = data.clusters[cluster.replace(/^(g)?(\d+)/i, '$1$2')]
    if(clusterObjectIds) {
      $scope.cluster = $rootScope.defaultCluster = cluster
      $scope.isGallery = cluster.match(/^G\d/i)
      $scope.gallery = $scope.cluster.replace('G', '')
      $rootScope.showingCluster = $scope.showingCluster = 
        (typeof $rootScope.showingCluster === 'undefined') ? true : $rootScope.showingCluster
      if(!$rootScope.clusterObjects) {
        $scope.clusterObjects = clusterObjectIds.map(function(objectId) {
          var isStory = objectId.match && objectId.match(/stories\/(\d+)/)
          if(isStory) return data.stories[isStory[1]]
          return data.objects[objectId]
        }).filter(function(o) { return o })
        var startPanels = addPanelsToClusterObjects()
        $rootScope.clusterObjects = $scope.clusterObjects = orderByFilter($scope.clusterObjects, random)
        startPanels.map(function(p) { $scope.clusterObjects.unshift(p) })

        $rootScope.otherObjects = $scope.otherObjects = $rootScope.otherObjects = loadAllObjects()
      } else {
        $scope.clusterObjects = $rootScope.clusterObjects
        $scope.otherObjects = $rootScope.otherObjects
      }
    } else { // not a valid cluster
      $location.path('/')
    }

    $scope.toggleSeeAll = function() {
      var container = $('.cover-wrapper')[0]
      if($scope.showingCluster) $timeout(function() { container.scrollLeft = container.scrollWidth-window.innerWidth }, 0)
      $scope.loading = true
      $rootScope.showingCluster = $scope.showingCluster = !$scope.showingCluster

      $timeout(function() {
        $timeout(initIsotope, 0)
        $scope.loading = false
      }, 0)
    }

    // Maintain the random order of the cluster objects, and add all the others
    // in random order. Then any 'end' panels.
    function loadAllObjects() {
      var c = $scope.clusterObjects
      var others = []

      angular.forEach(data.objects, function(o) {
        if(japanObjects.indexOf(parseInt(o.id)) > -1) return console.info('rejecting', o.id);
        (c.indexOf(o) > -1) || others.push(o)
      })
      others = orderByFilter(others, random)

      angular.forEach(data.panels, function(p) {
        if(c.indexOf(p) == -1 && p.position == 'end') others.push(p)
      })
      
      return others
      return angular.copy(c).map(function(o) {
        // angular.copy and $sce.trust don't work together. this prevents an sce.unsafe
        if(o.recordType == 'panel') o.trustedContent = $sce.trustAsHtml(o.content)
        return o
      }).concat(others)
    }

    // Add the panels that should be randomized to `clusterObjects` and
    // return the panels that need to be at the beginning so they can be
    // `unshifted` after randomization happens
    // TODO: should panels go into the cluster objects or the other objects?
    function addPanelsToClusterObjects() {
      var panels = []
      angular.forEach(data.panels, function(p) { panels.push(p) })
      panels.filter(function(p) { return p.position == 'random' })
        .map(function(p) { $scope.clusterObjects.push(p) })
      return panels.filter(function(p) { return p.position == 'start' })
    }

    $rootScope.nextView = undefined

    $timeout(initIsotope, 0)

    function random() { return 0.5 - Math.random() }

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
        lastObjContainer && lastObjContainer[0].scrollIntoView()
      }
    })

    if(typeof $rootScope.showSplash == 'undefined') $rootScope.showSplash = true
    $scope.closeSplashScreen = function() {
      $rootScope.showSplash = false
    }
  }
])

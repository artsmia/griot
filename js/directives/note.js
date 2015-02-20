/**
 * Creates and controls annotation markers on a zoomable image (flatmap).
 */

app.directive('note', function($sce) {
  var divIcon = L.divIcon({className: 'noteMarker'})
  return {
    restrict: 'E',
    // scope: {note: '=', view: '='},
    controller: function($scope) {},
    require: '^flatmap',
    link: function(scope, element, attrs, flatmapCtrl)  {
      var jsonToLayer = function(note) {
        var geometry, json;
        if(note.type == 'FeatureCollection') {
          json = {type: 'MultiPolygon', coordinates: [].map.call(note.features, function (f) { return [f.geometry.coordinates[0]] })}
        } else {
          json = note.geometry
        }

        return L.GeoJSON.geometryToLayer(json)
      }

      var eachMarker = function(callback) {
        angular.forEach(scope.markers, callback)
      },
      eachLayer = function(layer, callback) {
        layer.eachLayer ? layer.eachLayer(callback) : callback(layer)
      }

      scope.flatmapCtrl = flatmapCtrl
      scope.map = scope.flatmapCtrl.scope.zoom.map
      scope.jsonLayer = jsonToLayer(scope.note.geoJSON)
      scope.note.index = scope.$parent.$parent.noteCount = (scope.$parent.$parent.noteCount || 0) + 1
      divIcon.options.html = "<span>" + scope.note.index + "</span>"
      scope.markers = []

      eachLayer(scope.jsonLayer, function(layer) {
        scope.markers.push(L.marker(layer.getBounds().getCenter(), {icon: divIcon}))
      })

      scope.note.active = false

      var zoomNote = function() {
        flatmapCtrl.scope.$broadcast('changeView', scope.view)
        flatmapCtrl.scope.$broadcast('changeGeometry', scope.jsonLayer)
        scope.note.active = true
        scope.$$phase || scope.$apply()
        scrollNoteTextIntoView()
      }
      var scrollNoteTextIntoView = function() { // this is hacky
        var noteEl = $('#annotations li.note:nth-child(' + (scope.$index+1) + ')')[0]
        if(noteEl) noteEl.scrollIntoViewIfNeeded && noteEl.scrollIntoViewIfNeeded() || noteEl.scrollIntoView()
      }
      var toggleNoteZoom = function() {
        scope.$apply(function() { scope.note.active = !scope.note.active })
      }

      scope.$watch('note.active', function(newVal, oldVal) {
        var openedOrClosed = undefined
        if(!newVal && oldVal && scope.note == flatmapCtrl.scope.lastActiveNote) {
          flatmapCtrl.removeJsonLayer()
          scope.map.zoomOut(100)
          flatmapCtrl.scope.lastActiveNote = null
          openedOrClosed = 'Closed'
        } else if(newVal && !oldVal) {
          var lastNote = flatmapCtrl.scope.lastActiveNote, note = scope.note
          if(lastNote) lastNote.active = false
          zoomNote()
          flatmapCtrl.scope.lastActiveNote = scope.note
          openedOrClosed = 'Opened'
          scope.$parent.$parent.$parent.glanceText = $sce.trustAsHtml( "Press to view detail <span class='annotation-index'>" + scope.note.index + "</span>" );
          scope.$$phase || scope.$apply()
        }
        if(openedOrClosed) analytics.track(openedOrClosed + ' a Detail', {title: scope.note.title, index: scope.note.index, id: flatmapCtrl.scope.$parent.id})

        // The active marker goes to the SW (lower-left) corner of bounds
        // inactive markers, center of bounds
        var layer = scope.jsonLayer, index = 0
        eachLayer(layer, function(_layer) {
          scope.markers[index].setLatLng(newVal ? _layer._latlngs[0] : _layer.getBounds().getCenter())
          index++
        })
      })

      flatmapCtrl.scope.$watch('image', function(newVal, oldVal) {
        eachMarker(function(marker) {
          if(newVal == scope.$parent.view.image) {
            marker.setOpacity(1)
            marker.on('click', toggleNoteZoom)
          } else {
            marker.setOpacity(0)
            marker.off('click', toggleNoteZoom)
          }
        })
      })

      eachMarker(function(marker) { marker.addTo(scope.map) })
    }
  }
})


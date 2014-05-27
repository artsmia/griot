/*
 * Mostly not-terribly-hacky code to use Leaflet to zoom in on flat images instead of maps.
*/
/*jslint nomen: true, sloppy: true */
/*global $: false, L: false, console: false, clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false */

// Zoomer.zoom_image({"container":"image-view-2", "tileURL": "https://stewart.walkerart.org/zoomtest/wac_786/{z}_{x}_{y}.jpg", "imageWidth": 4000, "imageHeight": 3187});

var Zoomer = Zoomer || {};
Zoomer._realTileSize = 256; // static, permanent
Zoomer.zoomers = [];
Zoomer.ua = navigator.userAgent.toLowerCase();
Zoomer.tilePad = 1; // how many pixels to pad the tiles to avoid gaps in some browsers
Zoomer.roundingSlop = 2; // shrink image size this much when we fitbounds
Zoomer.loadExtraTiles = 2; // load offscreen tiles to make panning smoother

// override so we can allow full-scaling of flat images.
Zoomer.Map = L.Map.extend({

    _debug: function (msg) {
        console.log(this._zoomer.containerName + ' -------------');
        console.log(msg);
    },
    
    isIdle: function () {
        // are we all done doing everything??
        var mapIdle = Zoomer.abortedZoom || !(this._animatingZoom || this.touchZoom._zooming || (this._draggable && this._draggable._moved));
        return mapIdle;
    },
    
	_backupTransitionEnd: function () {
		if (this._animatingZoom) {
			this._onZoomTransitionEnd();
			//this.touchZoom._zooming=false; // recover this state, somehow
		}
	},

    ////////////////////////////////////////////////////////////////////////
    // override some core map methods

    // override so we can compute ACTUAL size of offscreen divs and slide them in
    getSize: function () {
        if (!this._size || this._sizeChanged) {
            this._size = new L.Point(
                $('#' + this._container.id).actual('width'),
                $('#' + this._container.id).actual('height')
            );
            this._sizeChanged = false;
        }
        return this._size.clone();
    },

    // _boundsMinZoom is getting set wrong in setMaxBounds. Not sure what a better fix is.
    getMinZoom: function () {
        return this.options.minZoom || 0;
    },

    // override so we can set the tileSize to fill the requested zoom scale
    _limitZoom: function (zoom) {
        var min = this.getMinZoom(),
            max = this.getMaxZoom(),
            crs = this.options.crs,
            nextHigherZoom = (zoom <= -1) ? 0 : Math.ceil(zoom);
        if (nextHigherZoom > max) { nextHigherZoom = max; }
        if(zoom == min-1) { // this is a shift-doubleclick zoom
          this.fire('zoomedBeyondMin');
        }
        zoom = Math.max(min, Math.min(max, zoom));
        if (this._zoomer && this._zoomer.tiles) {
            nextHigherZoom = (this._zoomer.noTiles && min === max) ? 0 : nextHigherZoom;
            this._zoomer.tileLayerScale = crs.scale(zoom) / crs.scale(nextHigherZoom);
        }
        // Fallback to scaling the tiles if no layer transform available
        var useScale = L.DomUtil.TRANSFORM ? 1 : this._zoomer.tileLayerScale;
        this._zoomer.tiles.options.tileSize = useScale*this._zoomer.currentMapTileSize;
        return zoom;
    },


    //////////////////////////////////////////////////////////////////////
    // custom Zoomer methods, not overridden
    centerImageAtExtents: function () {
        if (this._zoomer.noTiles) {
            this._zoomer.imageBounds = new L.LatLngBounds(this.unproject([0, this._zoomer.imageHeight * (this._zoomer.tileLayerScale > 1 ? this._zoomer.tileLayerScale : 1)], this.getMaxZoom()),
                                                     this.unproject([this._zoomer.imageWidth * (this._zoomer.tileLayerScale > 1 ? this._zoomer.tileLayerScale : 1), 0], this.getMaxZoom()));
        } else {
            this._zoomer.imageBounds = new L.LatLngBounds(this.unproject([Zoomer.roundingSlop, this._zoomer.imageHeight - Zoomer.roundingSlop], this.getMaxZoom()),
                                                     this.unproject([this._zoomer.imageWidth - Zoomer.roundingSlop, Zoomer.roundingSlop], this.getMaxZoom()));
        }
        this.fitBounds(this._zoomer.imageBounds);
        if (!this._zoomer.noTiles) {
            this.options.minZoom = this.getBoundsZoom(this._zoomer.imageBounds);
        }
    },
    panToContainImage: function () {
        if (this._tilePane.children[0]) {
            this._tilePane.children[0].style[L.DomUtil.TRANSFORM] = L.DomUtil.getScaleString(this._zoomer.tileLayerScale, this.getPixelOrigin().multiplyBy(-1));
        }
        if (this.getZoom() === this.getMinZoom()) {
            this.centerImageAtExtents();
            return;
        }
        var currentBounds = this.getBounds(),
            dx = 0,
            dy = 0;
        if (this._zoomer.tiles) {
            this._getEdgeDeltas();
            if (this._edgeDeltas.dw > 0 && this._edgeDeltas.de > 0) { dx = Math.ceil(Math.min(this._edgeDeltas.de, this._edgeDeltas.dw)); }
            if (this._edgeDeltas.dw < 0 && this._edgeDeltas.de < 0) { dx = Math.ceil(Math.max(this._edgeDeltas.de, this._edgeDeltas.dw)); }
            if (this._edgeDeltas.ds > 0 && this._edgeDeltas.dn > 0) { dy = Math.ceil(Math.min(this._edgeDeltas.ds, this._edgeDeltas.dn)); }
            if (this._edgeDeltas.ds < 0 && this._edgeDeltas.dn < 0) { dy = Math.ceil(Math.max(this._edgeDeltas.ds, this._edgeDeltas.dn)); }
            this.panBy([dx, dy]);
        }
    },
    // just some math to figure out a tilesize for a non-tiled image
    _setNoTilesScale: function () {
        if (this._zoomer.noTiles) {
            var tileSize;
            if (this._zoomer.containerAspectRatio < this._zoomer.imageAspectRatio) {
                tileSize = this._zoomer.container.actual('width');
                if (this._zoomer.imageAspectRatio < 1) {
                    tileSize *= this._zoomer.imageHeight / this._zoomer.imageWidth;
                }
            } else {
                tileSize = this._zoomer.container.actual('height');
                if (this._zoomer.imageAspectRatio > 1) {
                    tileSize *= this._zoomer.imageWidth / this._zoomer.imageHeight;
                }
            }
            // change the base tilesize so our "natural" size knows what to compare against.
            this._zoomer.currentMapTileSize = Math.max(this._zoomer.imageWidth, this._zoomer.imageHeight);
            this._zoomer.tileLayerScale = tileSize / this._zoomer.currentMapTileSize;
        } else {
            this._zoomer.currentMapTileSize = Zoomer._realTileSize;
        }
    },
    _getEdgeDeltas: function () {
        var currentBounds = this.getBounds(),
            currNE = this.project(currentBounds._northEast),
            imageNE = this.project(this._zoomer.imageBounds._northEast),
            currSW = this.project(currentBounds._southWest),
            imageSW = this.project(this._zoomer.imageBounds._southWest),
            dw = imageSW.x - currSW.x,
            de = imageNE.x - currNE.x,
            ds = imageSW.y - currSW.y,
            dn = imageNE.y - currNE.y;
        this._edgeDeltas = {'dw': dw, 'de': de, 'ds': ds, 'dn': dn};
    },
    isAtEastEdge: function () {
        this._getEdgeDeltas();
        return ((this._edgeDeltas.de > 0 && this._edgeDeltas.dw >= -1) || (this._edgeDeltas.de < 0 && this._edgeDeltas.dw > 0));
    },
    isAtWestEdge: function () {
        this._getEdgeDeltas();
        return ((this._edgeDeltas.dw < 0 && this._edgeDeltas.de <= 1) || (this._edgeDeltas.de < 0 && this._edgeDeltas.dw > 0));
    },
    isAtNorthEdge: function () {
        this._getEdgeDeltas();
        return ((this._edgeDeltas.ds > 0 && this._edgeDeltas.dn >= -1) || (this._edgeDeltas.ds < 0 && this._edgeDeltas.dn > 0));
    },
    isAtSouthEdge: function () {
        this._getEdgeDeltas();
        return ((this._edgeDeltas.dn < 0 && this._edgeDeltas.ds <= 1) || (this._edgeDeltas.ds < 0 && this._edgeDeltas.dn > 0));
    }
});
Zoomer.edgeDetectSlop = 5;

Zoomer.zoomAtMouseLocation = function (e) {
    var map = e.target,
        delta = e.originalEvent.shiftKey ? -1 : 1,
        zoom = map._limitZoom(map._zoom + delta),
        scale = map.getZoomScale(zoom),
        viewHalf = map.getSize()._divideBy(2),
        centerOffset = e.containerPoint._subtract(viewHalf)._multiplyBy(1 - 1 / scale),
        newCenterPoint = map._getTopLeftPoint()._add(viewHalf)._add(centerOffset);
    if (zoom === map._zoom || !map.isIdle()) {
        return;
    }
    map.setView(map.unproject(newCenterPoint), zoom);
};

Zoomer.getParentMapForElement = function (element) {
    var zoomerName,
        zoomer;
    for (zoomerName in Zoomer.zoomers) {
        if (Zoomer.zoomers.hasOwnProperty(zoomerName)) {
            zoomer = Zoomer.zoomers[zoomerName];
            if (zoomer.container.has(element)) {
                return zoomer.map;
            }
        }
    }
    return null;
};

Zoomer.abortedZoom = false;
Zoomer.Map.TouchZoom = L.Map.TouchZoom.extend({
    // override so we can limit pinches to max / min zoom dynamically
    _onTouchMove: function (e) {
        if (e.touches && e.touches.length > 2) {
            // multi-finger swipe: abort the zoom!
            return this._abortZoom();
        }
        if (!e.touches || e.touches.length !== 2) { return; }

        var map = this._map;

        var p1 = map.mouseEventToLayerPoint(e.touches[0]),
            p2 = map.mouseEventToLayerPoint(e.touches[1]);
            
            
        // WAC_START limit scale to zoom extents
        var deltaZ = p1.distanceTo(p2) - this._startDist;

        this._scale = p1.distanceTo(p2) / this._startDist;
        this._delta = p1._add(p2)._divideBy(2)._subtract(this._startCenter);
        var deltaX = this._delta.x;
        this._delta = new L.Point(0,0);

        if (this._scale === 1) { return; }

		
        var zoom = map.getScaleZoom(this._scale);
        if (zoom > map.getMaxZoom()) {
            this._scale = map.getZoomScale(map.getMaxZoom());
        }
        if (zoom < map.getMinZoom()) {
            if(zoom < map.getMinZoom() - 1) map.fire('zoomedBeyondMin');
            this._scale = map.getZoomScale(map.getMinZoom());
        }
        // WAC_END

        if (!this._moved) {
            L.DomUtil.addClass(map._mapPane, 'leaflet-zoom-anim leaflet-touching');

            map
                .fire('movestart')
                .fire('zoomstart')
                ._prepareTileBg();

            this._moved = true;
        }

        L.Util.cancelAnimFrame(this._animRequest);
        this._animRequest = L.Util.requestAnimFrame(
            this._updateOnMove, this, true, this._map._container
        );
        
		if (Math.abs(deltaX) > Math.abs(deltaZ)) {
            return this._abortZoom();
        }
        Zoomer.abortedZoom = false;
        
        L.DomEvent.preventDefault(e);
    },
    
    _abortZoom: function() {
        if (this._zooming && this._moved) {
            Zoomer.abortedZoom = true;
	        // let it be a swipe
            return this._onTouchEnd();
        }
        this._zooming = false;
		L.DomEvent
		    .off(document, 'touchmove', this._onTouchMove)
		    .off(document, 'touchend', this._onTouchEnd);
    },

	_updateOnMove: function () {
		var map = this._map,
		    origin = this._getScaleOrigin(),
		    center = map.layerPointToLatLng(origin);

		map.fire('zoomanim', {
			center: center,
			zoom: map.getScaleZoom(this._scale)
		});

		// Used 2 translates instead of transform-origin because of a very strange bug -
		// it didn't count the origin on the first touch-zoom but worked correctly afterwards

		map._tileBg.style[L.DomUtil.TRANSFORM] =
		        L.DomUtil.getTranslateString(this._delta) + ' ' +
		        L.DomUtil.getScaleString(this._scale, this._startCenter);
	},
	
    // override so we can stop pinch zooms wherever they are, don't snap to next round zoom level
    _onTouchEnd: function () {
        setTimeout(L.bind(this._map._backupTransitionEnd,this._map),1000);
        if (!this._moved || !this._zooming) { return; }

        var map = this._map;

        this._zooming = false;
        L.DomUtil.removeClass(map._mapPane, 'leaflet-touching');

        L.DomEvent
            .off(document, 'touchmove', this._onTouchMove)
            .off(document, 'touchend', this._onTouchEnd);

        var origin = this._getScaleOrigin(),
            center = map.layerPointToLatLng(origin),

            oldZoom = map.getZoom(),
            floatZoomDelta = map.getScaleZoom(this._scale) - oldZoom,
            roundZoomDelta = (floatZoomDelta > 0 ?
                    Math.ceil(floatZoomDelta) : Math.floor(floatZoomDelta)),

            // WAC_START use the float zoom, not rounded so we can stop anywhere
            zoom = map._limitZoom(oldZoom + floatZoomDelta);
            // WAC_END

        map.fire('zoomanim', {
            center: center,
            zoom: zoom
        });
        // WAC_START 
        // when you let them stop wherever the actual scale is always 1
        var scale = 1;
        // WAC_END
        
        map._runAnimation(center, zoom, scale, origin, true);
    }
});

// MIA_START
// Don't let the image drag too far out of the map container.
var oldMapDragAddHooks = L.Map.Drag.prototype.addHooks;
L.Map.Drag.include({
  addHooks: function() {
    oldMapDragAddHooks.bind(this)();
    this._draggable._map = this._map;
  }
});

L.Draggable.include({
  _clampImageInsideContainer: function() {
    var map = this._map;
    map._getEdgeDeltas();
    var play = 100;
    return ((map._edgeDeltas.dw > play && map._edgeDeltas.de > play) ||
            (map._edgeDeltas.dw < -play && map._edgeDeltas.de < -play) ||
            (map._edgeDeltas.ds > play && map._edgeDeltas.dn > play) ||
            (map._edgeDeltas.ds < -play && map._edgeDeltas.dn < -play));
  },
  _distanceToOrigin: function(point) {
    return point.distanceTo(L.point(0, 0));
  },
  _onMove: function (e) {
    if (e.touches && e.touches.length > 1) { return; }

    var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
    newPoint = new L.Point(first.clientX, first.clientY),
    diffVec = newPoint.subtract(this._startPoint);

    if (!diffVec.x && !diffVec.y) { return; }

    L.DomEvent.preventDefault(e);

    if (!this._moved) {
      this.fire('dragstart');
      this._moved = true;

      this._startPos = L.DomUtil.getPosition(this._element).subtract(diffVec);

      if (!L.Browser.touch) {
        L.DomUtil.disableTextSelection();
        this._setMovingCursor();
      }
    }

    this._newPos = this._startPos.add(diffVec);

    if (this._clampImageInsideContainer()) {
      var clampToO = null, newToO = null;
      if(!this._clampPos) {
        this._clampPos = this._newPos;
      } else {
        var dto = this._distanceToOrigin;
        clampToO = dto(this._clampPos);
        newToO = dto(this._newPos);
      }
      if(newToO > clampToO) return;
    }

    this._moving = true;

    L.Util.cancelAnimFrame(this._animRequest);
    this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
  },
});
// MIA_END

// function to get img size across browsers (IE 8 doesn't have naturalHeight/Width)
Zoomer._getNatural = function (DOMelement) {
    if (DOMelement.naturalWidth) {
        return {width: DOMelement.naturalWidth, height: DOMelement.naturalHeight};
    }
    var img = new Image();
    img.src = DOMelement.src;
    return {width: img.width, height: img.height};
};

// we call this on every tile to handle non-square tiles at the edges of our "maps".
Zoomer.scaleNonSquareTile = function (data) {
    var map = data.target._map,
        natural = Zoomer._getNatural(data.tile),
        inWidth = natural.width,
        inHeight = natural.height,
        useScale = L.DomUtil.TRANSFORM ? 1 : map._zoomer.tileLayerScale;
    // Fallback to scaling the tiles if no layer transform available
    data.tile.style.height = (useScale * (inHeight + Zoomer.tilePad)) + 'px';
    data.tile.style.width = (useScale * (inWidth + Zoomer.tilePad)) + 'px';
    
    if (inHeight < map._zoomer.currentMapTileSize) {
        data.tile.style.marginBottom = Math.ceil((map._zoomer.currentMapTileSize - inHeight) + Zoomer.tilePad) + 'px';
    } else {
        data.tile.style.marginTop = '';
    }
    if (inWidth < map._zoomer.currentMapTileSize) {
        data.tile.style.marginRight = Math.ceil((map._zoomer.currentMapTileSize - inWidth) * (map._zoomer.tiles.options.tileSize / map._zoomer.currentMapTileSize) + Zoomer.tilePad) + 'px';
    } else {
        data.tile.style.marginRight = '';
    }
};

Zoomer.TileLayer = L.TileLayer.extend({
    // override so we can always get a non-fractional tile {z}, rounded up so we only scale down.
    _getZoomForUrl: function () {

        var options = this.options,
            zoom = this._map.getZoom();

        if (options.zoomReverse) {
            zoom = options.maxZoom - zoom;
        }
        // WAC_START
        return (zoom <= -1) ? 0 : Math.ceil(zoom + options.zoomOffset);
        // WAC_END
    },
    // allow noTiles limits, account for non-square worlds
    _tileShouldBeLoaded: function (tilePoint) {
        if ((tilePoint.x + ':' + tilePoint.y) in this._tiles) {
            return false; // already loaded
        }

        if (!this.options.continuousWorld) {
            // WAC_START
            var limit = this._getWrapTileNum();
            var useZoom = Math.ceil(this._map.getZoom());
            useZoom = useZoom < 0 ? 0 : useZoom;
            var xlimit = this._map._zoomer.noTiles ? 1 : Math.ceil((this._map._zoomer.imageWidth / Math.pow(2,this._map.getMaxZoom() - useZoom)) / this._map._zoomer.tiles.options.tileSize);
            var ylimit = this._map._zoomer.noTiles ? 1 : Math.ceil((this._map._zoomer.imageHeight / Math.pow(2,this._map.getMaxZoom() - useZoom)) / this._map._zoomer.tiles.options.tileSize);


            if (this.options.noWrap && (tilePoint.x < 0 || tilePoint.x >= xlimit) ||
                                        tilePoint.y < 0 || tilePoint.y >= ylimit) {
                return false; // exceeds world bounds
            }
            // WAC_END
        }

        return true;
    },
    // override to be aware of scale and load all needed tiles, plus option for extra
    _update: function () {

        if (!this._map) { return; }

        var bounds = this._map.getPixelBounds(),
            zoom = this._map.getZoom(),
            tileSize = this.options.tileSize;

        tileSize *= Math.pow(2, zoom - Math.ceil(zoom));
        if (!this._map._zoomer.noTiles && (zoom > this.options.maxZoom || zoom < this.options.minZoom)) {
            return;
        }

        var nwTilePoint = new L.Point(Math.floor(bounds.min.x / tileSize) - Zoomer.loadExtraTiles, Math.floor(bounds.min.y / tileSize) - Zoomer.loadExtraTiles),
            seTilePoint = new L.Point(Math.floor(bounds.max.x / tileSize) + Zoomer.loadExtraTiles, Math.floor(bounds.max.y / tileSize) + Zoomer.loadExtraTiles),
            tileBounds = new L.Bounds(nwTilePoint, seTilePoint);

        this._addTilesFromCenterOut(tileBounds);

        if (this.options.unloadInvisibleTiles || this.options.reuseTiles) {
            this._removeOtherTiles(tileBounds);
        }
    }
});

Zoomer.computeZoomScale = function (zoomer) {
    var bigSide = Math.max(zoomer.imageWidth, zoomer.imageHeight);
    zoomer.maxZoom = zoomer.noTiles ? 0 : 1;
    while ((zoomer.currentMapTileSize * Math.pow(2, zoomer.maxZoom)) < bigSide) {
        zoomer.maxZoom += 1;
    }
    zoomer.maxZoom = zoomer.noTiles ? 10 : zoomer.maxZoom; // go big so it allow zooming on tiny screens

    zoomer.imageAspectRatio = zoomer.imageWidth / zoomer.imageHeight;
    var containerWidth = zoomer.container.actual('width'),
        containerHeight = zoomer.container.actual('height');
    zoomer.containerAspectRatio = containerWidth / containerHeight;
    zoomer.containerMin = Math.min(containerWidth, containerHeight);
    if (zoomer.imageAspectRatio < zoomer.containerAspectRatio) {
        zoomer.tileLayerScale = containerHeight / zoomer.imageHeight;
    } else {
        zoomer.tileLayerScale = containerWidth / zoomer.imageWidth;
    }
};

// Flat image projection
L.CRS.Simple = L.Util.extend({}, L.CRS, {
    projection: L.Projection.LonLat,
    transformation: new L.Transformation(1, 0, -1, 0),
    scale: function (zoom) {
        return (Zoomer._realTileSize * Math.pow(2, zoom));
    }
});

Zoomer.setupMap = function (zoomer) {
    if (!zoomer.map) {
        zoomer.map = new Zoomer.Map(zoomer.containerName, {
            crs: L.CRS.Simple,
            worldCopyJump: false,
            maxZoom: zoomer.maxZoom,
            inertia: L.Browser.touch,
            zoomControl: false, // we want custom buttons!
            attributionControl: false, // sorry. We'll add something in humans.txt
            scrollWheelZoom: false, // too much page jumping
            doubleClickZoom: false, // we only want single clicks
            boxZoom: false, // we want shift-click to zoom out
            trackResize: true, // we need some of that math to run on the map.
            touchZoom: false, // we want to use our own handler below
            fadeAnimation: (Zoomer.ua.indexOf('chrome') !== -1 && Zoomer.ua.search("android 4.0.4") === -1) // Galaxy S2 bug
        });
        zoomer.map.on('zoomend', zoomer.map.panToContainImage);
        zoomer.map.on('moveend', zoomer.map.panToContainImage);
        zoomer.map.on('dblclick', Zoomer.zoomAtMouseLocation);
        zoomer.map.options.touchZoom = true; // now we DO want this option...
        zoomer.map.addHandler('touchZoom', Zoomer.Map.TouchZoom); // ...but use ours.
        if(!L.Browser.touch) new L.Control.Zoom({position: 'topright', zoomInText:' ', zoomOutText:' ', zoomInTitle:'different'}).addTo(zoomer.map);
    }
    zoomer.map._zoomer = zoomer;
    zoomer.map._setNoTilesScale();
    // Critical: on repeat calls this needs to act like a brand new map was created so we can get the scale right.
    zoomer.map._zoom = 0;
    zoomer.map._loaded = false;
    zoomer.map.options.minZoom = zoomer.map.getScaleZoom(zoomer.tileLayerScale);
    zoomer.map.options.maxZoom = (zoomer.noTiles) ? ((zoomer.tileLayerScale > 1) ? zoomer.map.getScaleZoom(zoomer.tileLayerScale) : 0) : zoomer.maxZoom;
};

Zoomer.createTiles = function (zoomer) {
    var tiles = new Zoomer.TileLayer(zoomer.tileURL, {
        noWrap: true,
        subdomains: ['0','1','2','3'],
        continuousWorld: false,
        maxZoom: zoomer.map.options.maxZoom,
        minZoom: zoomer.map.options.minZoom,
        tms: false,
        detectRetina: false,
        tileSize : zoomer.currentMapTileSize,
        zoomOffset: 0,
        unloadInvisibleTiles: false,
        reuseTiles: false,
        updateWhenIdle: false
    });
    tiles.on('tileload', Zoomer.scaleNonSquareTile);
    return tiles;
};

// this function sets everything up, and can be called multiple times for: viewport resized, new image to load, etc.
Zoomer.zoom_image = function (zoomoptions) {
    var containerIn = zoomoptions.container, 
        tileURLIn = zoomoptions.tileURL,
        imageWidthIn = zoomoptions.imageWidth,
        imageHeightIn = zoomoptions.imageHeight,
        container = $('#' + containerIn),
        zoomer = {};
    if (!Zoomer.zoomers[containerIn]) {
        Zoomer.zoomers[containerIn] = zoomer;
        zoomer.container = container;
    } else {
        zoomer = Zoomer.zoomers[containerIn];
    }
    // attach the whole zoomer to the container.
    if (zoomer.map && zoomer.tiles) {
        // called with new image or resized. Clear it all out:
        zoomer.map.removeLayer(zoomer.tiles);
        zoomer.map.options.minZoom = 0;
        zoomer.map._sizeChanged = true;
    }
    zoomer.currentMapTileSize = Zoomer._realTileSize; // we can override this for non-tiled images to match their longest side.
    zoomer.containerName = containerIn;
    zoomer.imageWidth = imageWidthIn;
    zoomer.imageHeight = imageHeightIn;
    zoomer.tileURL = tileURLIn;
    zoomer.noTiles = (zoomer.tileURL.indexOf('{x}') === -1);

    Zoomer.computeZoomScale(zoomer);
    Zoomer.setupMap(zoomer);
    zoomer.tiles = Zoomer.createTiles(zoomer);
    zoomer.map.centerImageAtExtents();
    zoomer.map.addLayer(zoomer.tiles);

    // apply the computed scale to the tile containers
    $("#" + zoomer.containerName + " .leaflet-layer").each(function (index, value) {
        this.style[L.DomUtil.TRANSFORM] = L.DomUtil.getScaleString(zoomer.tileLayerScale, zoomer.map.getPixelOrigin().multiplyBy(-1));
    });
    return zoomer;
};

// handle window resize
Zoomer.windowResized = function () {
    var zoomerName,
        zoomer;
    for (zoomerName in Zoomer.zoomers) {
        if (Zoomer.zoomers.hasOwnProperty(zoomerName)) {
            zoomer = Zoomer.zoomers[zoomerName];
            Zoomer.zoom_image({"container":zoomer.containerName, "tileURL":zoomer.tileURL, "imageWidth":zoomer.imageWidth, "imageHeight":zoomer.imageHeight});
        }
    }
};

$(window).resize(function () {
    clearTimeout(Zoomer.resizeTimer);
    Zoomer.resizeTimer = setTimeout(Zoomer.windowResized, 100);
});


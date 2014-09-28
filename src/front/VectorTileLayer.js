L.TileLayer.Vector = L.TileLayer.extend({

    initVectorLayer: function () {
        this._geojsonTilesToLoad = 0;
        if (this.vectorlayer) {
            this._map.removeLayer(this.vectorlayer);
        }
        var pointToLayer = function (feature, latlng) {
                return L.circleMarker(latlng, {radius: 5});
            },
            onEachFeature = function (feature, layer) {
                layer.bindPopup(L.K.Util.renderPropertiesTable(feature.properties));
            };
        this.vectorlayer = new L.GeoJSON(null, {pointToLayer: pointToLayer, onEachFeature: onEachFeature});
    },

    commitLayer: function (e) {
        if(!this._map.hasLayer(this.vectorlayer)) {
            this._map.addLayer(this.vectorlayer);
        }
    },

    removeVectorLayer: function () {
        this._map.removeLayer(this.vectorlayer);
    },

    onAdd: function (map) {
        this._map = map;
        this.initVectorLayer(map);
        this._loading = [];
        // Delete the clusters to prevent from having several times
        // the same data
        map.on('zoomstart', this.initVectorLayer, this);
        this.on('vectorloadend', this.commitLayer);
        L.TileLayer.prototype.onAdd.call(this, map);
    },

    onRemove: function (map) {
        this.abordLoading();
        this.off('vectorloadend', this.commitLayer);
        map.off('zoomstart', this.initVectorLayer, this);
        this.removeVectorLayer();
        L.TileLayer.prototype.onRemove.call(this, map);
    },

    abordLoading: function () {
        for (var i = 0; i < this._loading.length; i++) {
            this._loading[i].abort();
        }
    },

    _addTile: function (tilePoint, container) {
        L.TileLayer.prototype._addTile.call(this, tilePoint, container);
        var z = this._getZoomForUrl(),
            x = tilePoint.x,
            y = tilePoint.y;

        var self = this;
        if(!this._geojsonTilesToLoad) {
            this.fire('vectorloadinit');
        }
        // Register that this tile is not yet loaded
        this._geojsonTilesToLoad++;
        var req = L.K.Xhr.get(this.getTileUrl(tilePoint), {
            callback: function (status, data) {
                if (status === 200 && data) {
                    self.addData(JSON.parse(data), tilePoint);
                    // Tile loaded
                    self._geojsonTilesToLoad--;
                    var index = this._loading.indexOf(req);
                    if (index !== -1) this._loading.splice(index, 1);
                    if(!self._geojsonTilesToLoad) {
                        // No more tiles to load
                        self.fire('vectorloadend');
                    }
                }
            },
            context: this
        });
        this._loading.push(req);
    },

    addData: function (data, tilePoint) {
        var layer, feature, point, coord, coords, points,
            toPoint = function(coord) {
               var p = this._map.latLngToContainerPoint([coord[1], coord[0]]);
               return [p.x, p.y];
            },
            tileSize = this.options.tileSize,
            nwPoint = tilePoint.multiplyBy(tileSize),
            swPoint = nwPoint.add([0, tileSize]),
            nePoint = nwPoint.add([tileSize, 0]),
            sw = this._map.unproject(swPoint),
            ne = this._map.unproject(nePoint),
            tileBounds = L.latLngBounds(sw, ne);

        for (var i = 0; i < data.features.length; i++) {
            feature = data.features[i];
            try {
                layer = L.GeoJSON.geometryToLayer(feature, this.vectorlayer.options.pointToLayer);
            } catch (err) {
                // Mapnik seems to be outputing some invalid features in some cases.
                // Let's digg this later.
                console.log(err);
                continue;
            }
            layer.feature = L.GeoJSON.asFeature(feature);
            var style = {
                fill: feature.geometry.type !== 'LineString',
                weight: 3,
                color: '#d35400'
            };
            if (layer.getBounds && layer.getBounds().equals(tileBounds)) style = L.extend(style, {weight: 1, fill: false});
            layer.setStyle(style);
            this.vectorlayer.options.onEachFeature(feature, layer);
            this.vectorlayer.addLayer(layer);
        }

    }

});

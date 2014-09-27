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
            },
            style = function (feature) {
                return {
                    fill: feature.geometry.type === 'Point',
                    weight: 3
                };
            };
        this.vectorlayer = new L.GeoJSON(null, {pointToLayer: pointToLayer, onEachFeature: onEachFeature, style: style});
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
            sePoint = nwPoint.add([tileSize, tileSize]),
            tilePoints = [
                this._map.latLngToContainerPoint(this._map.unproject(nwPoint)),
                this._map.latLngToContainerPoint(this._map.unproject(swPoint)),
                this._map.latLngToContainerPoint(this._map.unproject(sePoint)),
                this._map.latLngToContainerPoint(this._map.unproject(nePoint))
            ].map(function (p) {return [p.x, p.y];}),
            contained = function (shouldBe, inArray) {
                return shouldBe.every(function (p) {
                    return inArray.some(function (c) {
                        return c[0] === p[0] && c[1] === p[1];
                    });
                });
            };
        for (var i = 0; i < data.features.length; i++) {
            feature = data.features[i];
            if (feature.geometry.type === "Polygon") {
                // Try to skip polygons that have the exact size of the tile, which are generally bigger
                // polygons, and we only want their original path.
                if (feature.geometry.coordinates.length === 1 && feature.geometry.coordinates[0].length === 5) {
                    coords = feature.geometry.coordinates[0].map(toPoint, this);
                    if (contained(tilePoints, coords)) continue;
                }
            }
            try {
                this.vectorlayer.addData(feature);
            } catch (err) {
                // Mapnik seems to be outputing some invalid features in some cases.
                // Let's digg this later.
                console.log(err);
            }
        }

    }

});

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
        this.options.version = Date.now();
        this.initVectorLayer(map);
        this._loading = [];
        this._tileCache = {};
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

        var self = this;
        if(!this._geojsonTilesToLoad) {
            this.fire('vectorloadinit');
        }
        // Register that this tile is not yet loaded
        this._geojsonTilesToLoad++;
        var processTile = function (data) {
            try {
                self.addData(JSON.parse(data), tilePoint);
            } catch (err) {  // Sometimes Mapnik gives invalid geojson
                console.error(err);
                console.log(data);
            }
            // Tile loaded
            self._geojsonTilesToLoad--;
            var index = self._loading.indexOf(req);
            if (index !== -1) self._loading.splice(index, 1);
            if(!self._geojsonTilesToLoad) {
                // No more tiles to load
                self.fire('vectorloadend');
            }
        };
        var url = this.getTileUrl(tilePoint);
        if (this._tileCache[url]) {
            processTile(this._tileCache[url]);
        } else {
            var req = L.K.Xhr.get(url, {
                callback: function (status, data) {
                    if (status === 200 && data) {
                        this._tileCache[url] = data;
                        processTile(data);
                        var index = this._loading.indexOf(req);
                        if (index !== -1) this._loading.splice(index, 1);
                    }
                },
                context: this
            });
            this._loading.push(req);
        }
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
            if (this.options.filter) {
                var filter = this.options.filter.toLowerCase();
                if (!this.filter(feature, filter)) continue;
            }
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

    },

    redraw: function (force) {
        if (force) this._tileCache = {};
        if (this.vectorlayer) this.vectorlayer.clearLayers();
        L.TileLayer.prototype.redraw.call(this);
    },

    filter: function (feature, filter) {
        if (!feature.properties) return false;
        for (key in feature.properties) {
            if (key.toLowerCase().indexOf(filter) !== -1) return true;
            if ((feature.properties[key].toString() || '').toLowerCase().indexOf(filter) !== -1) return true;
        }
        return false;
    }

});

L.Kosmtik.DataInspector = L.Class.extend({

    includes: [L.Mixin.Events],

    initialize: function (map) {
        this.map = map;
        var options = {
            minZoom: this.map.options.minZoom,
            maxZoom: this.map.options.maxZoom,
            showLayer: '__all__'
        };
        this.tilelayer = new L.TileLayer.Vector('./tile/{z}/{x}/{y}.json?t={version}&layer={showLayer}', options);
        this.tilelayer.on('loading', function () {this.setState('loading');}, this.map);
        this.tilelayer.on('load', function () {this.unsetState('loading');}, this.map);
        this.createSidebarPanel();
        this.createToolbarButton();
        this.addShortcut();
    },

    createSidebarPanel: function () {
        this.container = L.DomUtil.create('div', 'data-inspector-form');
        this.title = L.DomUtil.create('h3', '', this.container);
        this.formContainer = L.DomUtil.create('div', '', this.container);
        this.title.innerHTML = 'Data Inspector';
        var layers = [['__all__', 'all']].concat(L.K.Config.project.layers.map(function (l) {return [l.name, l.name];}));
        this.sidebarForm = new L.K.FormBuilder(L.K.Config, [
            ['dataInspector', {handler: L.K.Switch, label: 'Active'}],
            ['dataInspectorLayer', {handler: L.FormBuilder.Select, helpText: 'Choose which layer to show', selectOptions: layers}],
            ['dataInspectorFilter', {placeholder: 'Filter data…'}]
        ]);
        this.formContainer.appendChild(this.sidebarForm.build());
        this.sidebarForm.on('synced', function (e) {
            if (e.field === 'dataInspector') this.toggle();
            else if (e.field === 'dataInspectorLayer') this.redraw();
            else if (e.field === 'dataInspectorFilter') this.filter();
        }, this);
        this.map.sidebar.addTab({
            label: 'Inspect',
            content: this.container,
            callback: this.sidebarForm.build,
            context: this.sidebarForm
        });
        this.map.sidebar.rebuild();
    },

    createToolbarButton: function () {
        var button = L.DomUtil.create('li', 'autoreload with-switch');
        this.toolbarForm = new L.K.FormBuilder(L.K.Config, [
            ['dataInspector', {handler: L.K.Switch, label: 'Data Inspector'}]
        ]);
        button.appendChild(this.toolbarForm.build());
        this.toolbarForm.on('synced', this.toggle, this);
        this.map.toolbar.addTool(button);
    },

    addShortcut: function () {
        var shortcutCallback = function () {
            L.K.Config.dataInspector = !L.K.Config.dataInspector;
            this.toggle();
        };
        this.map.shortcuts.add({
            keyCode: L.K.Keys.I,
            shiftKey: true,
            ctrlKey: true,
            callback: shortcutCallback,
            context: this,
            description: 'Toggle data inspector'
        });
    },

    toggle: function () {
        this.toolbarForm.fetchAll();
        this.sidebarForm.fetchAll();
        if (L.K.Config.dataInspector) this.tilelayer.addTo(this.map);
        else this.map.removeLayer(this.tilelayer);
    },

    redraw: function () {
        this.tilelayer.options.showLayer = L.K.Config.dataInspectorLayer;
        this.tilelayer.redraw(true);
    },

    filter: function () {
        this.tilelayer.options.filter = L.K.Config.dataInspectorFilter;
        this.tilelayer.redraw();
    }

});

L.Kosmtik.MetatileBounds = L.TileLayer.extend({

    initialize: function (map, options) {
        this.map = map;
        this.map.settingsForm.addElement(['showMetatiles', {handler: L.K.Switch, label: 'Display metatiles bounds (ctrl-alt-M)'}]);
        this.map.on('settings:synced', function (e) {
            if (e.field === 'showMetatiles') this.toggle();
        }, this);
        this.map.shortcuts.add({
            keyCode: L.K.Keys.M,
            altKey: true,
            ctrlKey: true,
            callback: function () {this.map.settingsForm.toggle('showMetatiles');},
            context: this,
            description: 'Show/hide metatiles bounds'
        });
        return L.TileLayer.prototype.initialize.call(this, '', options);
    },

    toggle: function () {
        if (L.K.Config.showMetatiles) this.map.addLayer(this);
        else this.map.removeLayer(this);
    },

    resetVectorLayer: function () {
        if (this.vectorlayer) this.vectorlayer.clearLayers();
    },

    removeVectorLayer: function () {
        this._map.removeLayer(this.vectorlayer);
    },

    onAdd: function (map) {
        this._map = map;
        this.vectorlayer = new L.FeatureGroup();
        map.addLayer(this.vectorlayer);
        // Delete the clusters to prevent from having several times
        // the same data
        map.on('zoomstart', this.resetVectorLayer, this);
        L.TileLayer.prototype.onAdd.call(this, map);
    },

    onRemove: function (map) {
        map.off('zoomstart', this.resetVectorLayer, this);
        this.removeVectorLayer();
        L.TileLayer.prototype.onRemove.call(this, map);
    },

    _addTile: function (tilePoint, container) {
        L.TileLayer.prototype._addTile.call(this, tilePoint, container);
        this.addData(tilePoint);
    },

    addData: function (tilePoint) {
        var tileSize = this.options.tileSize,
            nwPoint = tilePoint.multiplyBy(tileSize),
            nw = this._map.unproject(nwPoint),
            sw = this._map.unproject(nwPoint.add([0, tileSize])),
            se = this._map.unproject(nwPoint.add([tileSize, tileSize])),
            ne = this._map.unproject(nwPoint.add([tileSize, 0]));
        var options = {
            color: '#444',
            weight: 1,
            opacity: 0.65,
            fill: false,
            clickable: false,
            noClip: true
        };
        this.vectorlayer.addLayer(L.polygon([nw, sw, se, ne], options));
    },

    redraw: function () {
        if (this.vectorlayer) this.vectorlayer.clearLayers();
        L.TileLayer.prototype.redraw.call(this);
    }

});

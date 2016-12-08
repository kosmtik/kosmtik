L.Kosmtik.MetatileBounds = L.GridLayer.extend({

    initialize: function (map) {
        this.map = map;
        this.map.settingsForm.addElement(['showMetatiles', {handler: L.K.Switch, label: 'Display metatiles bounds (ctrl-alt-M)'}]);
        this.map.on('settings:synced', function (e) {
            if (e.helper.field === 'showMetatiles') this.toggle();
        }, this);
        this.map.commands.add({
            keyCode: L.K.Keys.M,
            altKey: true,
            ctrlKey: true,
            callback: function () { this.map.settingsForm.toggle('showMetatiles'); },
            context: this,
            name: 'Metatiles bounds: toggle view'
        });
        L.GridLayer.prototype.initialize.call(this);
        this.setTileSize();
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
        map.on('reloaded', this.reset, this);
        L.GridLayer.prototype.onAdd.call(this, map);
    },

    onRemove: function (map) {
        map.off('zoomstart', this.resetVectorLayer, this);
        map.off('reloaded', this.reset, this);
        this.removeVectorLayer();
        L.GridLayer.prototype.onRemove.call(this, map);
    },

    _addTile: function (tilePoint, container) {
        this.addData(tilePoint);
    },

    addData: function (tilePoint) {
        var tileSize = this.options.tileSize,
            nwPoint = tilePoint.multiplyBy(tileSize),
            sw = this._map.unproject(nwPoint.add([0, tileSize])),
            se = this._map.unproject(nwPoint.add([tileSize, tileSize])),
            ne = this._map.unproject(nwPoint.add([tileSize, 0]));
        var options = {
            color: '#444',
            weight: 1,
            opacity: 0.7,
            fill: false,
            clickable: false,
            noClip: true
        };
        this.vectorlayer.addLayer(L.polyline([sw, se, ne], options));
        options.color = '#fff';
        options.dashArray = '10,10';
        options.opacity = 0.8;
        this.vectorlayer.addLayer(L.polyline([sw, se, ne], options));
    },

    setTileSize: function () {
        this.options.tileSize = L.K.Config.project.metatile * L.K.Config.project.tileSize;
    },

    redraw: function () {
        if (this.vectorlayer) this.vectorlayer.clearLayers();
        L.GridLayer.prototype.redraw.call(this);
    },

    reset: function () {
        this.setTileSize();
        this.redraw();
    }

});

L.Kosmtik.ExportFormatChooser = L.FormBuilder.Select.extend({

    getOptions: function () {
        return L.K.Config.exportFormats.map(function (item) {
            return [item, item];
        });
    }

});

L.K.Exporter = L.Class.extend({

    shapeOptions: {
        dashArray: '10,10',
        color: '#444',
        fillColor: '#444',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.7,
        stroke: false
    },

    vertexOptions: {
        icon: L.divIcon(),
        draggable: true
    },

    params: {
        showExtent: false,
        format: 'png',
        width: 500,
        height: 500
    },

    editableParams: {
        'xml': [],
        'mml': []
    },

    elementDefinitions: {
        showExtent: ['showExtent', {handler: L.K.Switch, label: 'Show export extent on the map.'}],
        width: ['width', {handler: 'IntInput', helpText: 'Width of the export, in px.'}],
        height: ['height', {handler: 'IntInput', helpText: 'Height of the export, in px.'}]
    },

    initialize: function (map, options) {
        L.setOptions(this, options);
        this.map = map;
        this.elementDefinitions.format = ['format', {handler: L.K.ExportFormatChooser, helpText: 'Choose the export format', callback: this.buildForm, callbackContext: this}];
        this.initSidebar();
        this.initExtentLayer();
    },

    initSidebar: function () {
        var container = L.DomUtil.create('div', 'export-container'),
            title = L.DomUtil.create('h3', '', container),
            formContainer = L.DomUtil.create('div', '', container);
        title.innerHTML = 'Export';
        this.builder = new L.K.FormBuilder(this.params, []);
        formContainer.appendChild(this.builder.build());
        var submit = L.DomUtil.create('a', 'button', container);
        submit.innerHTML = 'Export map';
        L.DomEvent
            .on(submit, 'click', L.DomEvent.stop)
            .on(submit, 'click', function () {
                window.open('./export/?' + this.getQueryString());
            }, this);
        this.buildForm();
        this.map.sidebar.addTab({
            label: 'Export',
            content: container
        });
        this.map.sidebar.rebuild();
    },

    buildForm: function () {
        var elements = [this.elementDefinitions.format];
        var extraElements = this.editableParams[this.params.format] || ['showExtent'];
        for (var i = 0; i < extraElements.length; i++) {
            elements.push(this.elementDefinitions[extraElements[i]]);
        }
        this.builder.setFields(elements);
        this.builder.build();
    },

    initExtentLayer: function () {
        var center = this.map.getCenter();
        this.extentLayer = L.featureGroup();
        this.shape = L.polygon([], this.shapeOptions).addTo(this.extentLayer);
        this.leftTop = L.marker(center, this.vertexOptions).addTo(this.extentLayer);
        this.leftBottom = L.marker(center, this.vertexOptions).addTo(this.extentLayer);
        this.rightBottom = L.marker(center, this.vertexOptions).addTo(this.extentLayer);
        this.rightTop = L.marker(center, this.vertexOptions).addTo(this.extentLayer);
        this.extentCaption = L.DomUtil.create('div', 'extent-caption', this.map._panes.markerPane);
        this.setExtentCaptionPosition();
        this.leftTop.on('drag', function (e) {
            this.leftBottom.setLatLng([this.leftBottom._latlng.lat, e.target._latlng.lng]);
            this.rightTop.setLatLng([e.target._latlng.lat, this.rightTop._latlng.lng]);
            this.drawFromLatLngs();
        }, this);
        this.leftBottom.on('drag', function (e) {
            this.leftTop.setLatLng([this.leftTop._latlng.lat, e.target._latlng.lng]);
            this.rightBottom.setLatLng([e.target._latlng.lat, this.rightBottom._latlng.lng]);
            this.drawFromLatLngs();
        }, this);
        this.rightBottom.on('drag', function (e) {
            this.leftBottom.setLatLng([e.target._latlng.lat, this.leftBottom._latlng.lng]);
            this.rightTop.setLatLng([this.rightTop._latlng.lat, e.target._latlng.lng]);
            this.drawFromLatLngs();
        }, this);
        this.rightTop.on('drag', function (e) {
            this.rightBottom.setLatLng([this.rightBottom._latlng.lat, e.target._latlng.lng]);
            this.leftTop.setLatLng([e.target._latlng.lat, this.leftTop._latlng.lng]);
            this.drawFromLatLngs();
        }, this);
        this.builder.on('synced', function (e) {
            if (e.field === 'showExtent') this.toggleExtent();
        }, this);
    },

    drawFromCenter: function () {
        var centerPoint = this.map.latLngToLayerPoint(this.map.getCenter()),
            left = centerPoint.x - this.params.width / 2,
            right = centerPoint.x + this.params.width / 2,
            top = centerPoint.y - this.params.height / 2,
            bottom = centerPoint.y + this.params.height / 2,
            leftTop = this.map.layerPointToLatLng([left, top]),
            leftBottom = this.map.layerPointToLatLng([left, bottom]),
            rightBottom = this.map.layerPointToLatLng([right, bottom]),
            rightTop = this.map.layerPointToLatLng([right, top]);
            this.drawFromLatLngs(leftTop, leftBottom, rightBottom, rightTop);
    },

    drawFromLatLngs: function (leftTop, leftBottom, rightBottom, rightTop) {
        leftTop = leftTop || this.leftTop.getLatLng();
        leftBottom = leftBottom || this.leftBottom.getLatLng();
        rightBottom = rightBottom || this.rightBottom.getLatLng();
        rightTop = rightTop || this.rightTop.getLatLng();
        this.shape.setLatLngs([
            [[90, -180], [-90, -180], [-90, 180], [90, 180]],
            [leftTop, leftBottom, rightBottom, rightTop]
        ]);
        this.leftTop.setLatLng(leftTop);
        this.leftBottom.setLatLng(leftBottom);
        this.rightBottom.setLatLng(rightBottom);
        this.rightTop.setLatLng(rightTop);
        this.setExtentCaptionPosition();
        this.setExtentCaptionContent();
    },

    showExtent: function () {
        this.extentLayer.addTo(this.map);
        if (this.getExtentSize().x) this.drawFromLatLngs();
        else this.drawFromCenter();
        this.map.on('zoomend', this.updateExtentSize, this);
        this.map.on('zoomanim', this._zoomAnimation, this);
        L.DomUtil.addClass(this.extentCaption, 'show');
    },

    hideExtent: function () {
        this.map.removeLayer(this.extentLayer);
        L.DomUtil.removeClass(this.extentCaption, 'show');
        this.map.off('zoomend', this.updateExtentSize, this);
        this.map.off('zoomanim', this._zoomAnimation, this);
    },

    toggleExtent: function () {
        if (this.params.showExtent) this.showExtent();
        else this.hideExtent();
    },

    setExtentCaptionPosition: function () {
        var position = this.map.latLngToLayerPoint(this.leftBottom.getLatLng());
        L.DomUtil.setPosition(this.extentCaption, position);
    },

    setExtentCaptionContent: function () {
        var size = this.getExtentSize();
        this.params.width = size.x;
        this.params.height = size.y;
        this.extentCaption.innerHTML = size.x + "px / " + size.y + "px";
    },

    getExtentSize: function () {
        var topLeft = this.map.latLngToLayerPoint(this.leftTop.getLatLng()),
            bottomRight = this.map.latLngToLayerPoint(this.rightBottom.getLatLng());
        return L.point(Math.abs(bottomRight.x - topLeft.x), Math.abs(bottomRight.y - topLeft.y))
    },

    updateExtentSize: function () {
        this.setExtentCaptionPosition();
        this.setExtentCaptionContent();
    },

    toBBoxString: function () {
        return [
            this.leftBottom.getLatLng().lng,
            this.leftBottom.getLatLng().lat,
            this.rightTop.getLatLng().lng,
            this.rightTop.getLatLng().lat
        ]
    },

    getQueryString: function () {
        var qs = L.K.buildQueryString(this.params);
        qs = qs + '&bounds=' + this.toBBoxString();
        return qs;
    },

    _zoomAnimation: function (e) {
        var position = this.map._latLngToNewLayerPoint(this.leftBottom._latlng, e.zoom, e.center).round();
        L.DomUtil.setPosition(this.extentCaption, position);
    }

});

L.K.Map.addInitHook(function () {
    this.whenReady(function () {
        this.exportExtent = new L.K.Exporter(this);
    });
});

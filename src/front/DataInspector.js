L.TileLayer.XRay = L.TileLayer.extend({

    getTileUrl: function (tilePoint) {
        this.options.version = Date.now();
        var showLayers = [];
        var keys = Object.keys(L.K.Config.dataLayers);
        for(var k = 0; k < keys.length; k++) {
            if (L.K.Config.dataLayers[keys[k]] === true && keys[k] !== '__all__') {
                // display only the checked layers
                showLayers.push(keys[k]);
            }
        }
        this.options.showLayer = showLayers.join(",");
        this.options.background = L.K.Config.dataInspectorBackground || '';
        return L.TileLayer.prototype.getTileUrl.call(this, tilePoint);
    }

});

L.Kosmtik.DataInspector = L.Class.extend({

    includes: [L.Mixin.Events],

    initialize: function (map) {
        this.map = map;
        var options = {
            minZoom: this.map.options.minZoom,
            maxZoom: this.map.options.maxZoom
        };
        this.tilelayer = new L.TileLayer.XRay('./tile/{z}/{x}/{y}.xray?t={version}&layer={showLayer}&background={background}', options);
        this.tilelayer.on('loading', function () {this.setState('loading');}, this.map);
        this.tilelayer.on('load', function () {this.unsetState('loading');}, this.map);
        this.createSidebarPanel();
        this.createToolbarButton();
        this.addCommands();
        this.map.on('click', function (e) {
            if (!L.K.Config.dataInspector) return;
            var url = L.Util.template('./query/{z}/{lat}/{lng}/?layer={layer}', {
                z: this.map.getZoom(),
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                layer: ''
            });
            L.K.Xhr.get(url, {
                callback: function (status, data) {
                    if (status !== 200) return;  // display message?
                    data = JSON.parse(data);
                    if (!data.length) return;
                    var content = L.DomUtil.create('div', 'data-inspector');
                    data.map(function (feature) {
                        feature.attributes.layer = feature.layer;
                        content.appendChild(L.K.Util.renderPropertiesTable(feature.attributes));
                    });
                    this.map.openPopup(content, e.latlng, {autoPan: false});
                },
                context: this
            });
        }, this);
        this.map.on('reload', this.redraw, this);
    },

    createSidebarPanel: function () {
        this.container = L.DomUtil.create('div', 'data-inspector-form');
        this.title = L.DomUtil.create('h3', '', this.container);
        this.formContainer = L.DomUtil.create('div', '', this.container);
        this.title.innerHTML = 'Data Inspector';
        var layers = L.K.Config.project.layers.map(function (l) {return l.name;});
        var backgrounds = [['black', 'black'], ['transparent', 'transparent']];

        var layerSettings = [['dataLayers.__all__', {handler: L.FormBuilder.LabeledCheckBox, text: 'Show All' } ]];
        for (var i = 0; i < layers.length; i++) {
            var checkboxID = 'dataLayers.' + layers[i];
            var checkbox = [checkboxID, {handler: L.FormBuilder.LabeledCheckBox, text: 'Show ' + layers[i] }];
            layerSettings.push(checkbox);
        }
        this.sidebarForm = new L.K.FormBuilder(L.K.Config, [
            ['dataInspector', {handler: L.K.Switch, label: 'Active'}],
            ['dataInspectorBackground', {handler: L.FormBuilder.Select, helpText: 'Choose inspector background', selectOptions: backgrounds}]
        ].concat(layerSettings));
        this.formContainer.appendChild(this.sidebarForm.build());
        this.sidebarForm.on('synced', function (e) {
            if (e.field === 'dataInspector') this.toggle();
            else if (e.field === 'dataInspectorBackground') this.redraw();
            else if (e.field.indexOf('dataLayers') === 0) {
                if (e.field === 'dataLayers.__all__') {
                    // uncheck all except Show All
                    var keys = Object.keys(L.K.Config.dataLayers);
                    for (var k = 0; k < keys.length; k++) {
                        if (keys[k] !== '__all__') {
                            document.getElementsByName(keys[k])[0].checked = false;
                            L.K.Config.dataLayers[keys[k]] = false;
                        }
                    }
                } else {
                    // uncheck side layers
                    document.getElementsByName('__all__')[0].checked = false;
                    L.K.Config.dataLayers['__all__'] = false;
                }
                this.redraw();
            }
        }, this);
        this.map.sidebar.addTab({
            label: 'Inspect',
            className: 'data-inspector',
            content: this.container,
            callback: this.sidebarForm.build,
            context: this.sidebarForm
        });
        this.map.sidebar.rebuild();
    },

    openSidebar: function () {
        this.map.sidebar.open('.data-inspector');
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

    addCommands: function () {
        var toggleCallback = function () {
            L.K.Config.dataInspector = !L.K.Config.dataInspector;
            this.toggle();
        };
        this.map.commands.add({
            keyCode: L.K.Keys.I,
            shiftKey: true,
            ctrlKey: true,
            callback: toggleCallback,
            context: this,
            name: 'Data inspector: toggle layer'
        });
        this.map.commands.add({
            callback: this.openSidebar,
            context: this,
            name: 'Data inspector: configure'
        });
    },

    toggle: function () {
        this.toolbarForm.fetchAll();
        this.sidebarForm.fetchAll();
        if (L.K.Config.dataInspector) this.tilelayer.addTo(this.map);
        else this.map.removeLayer(this.tilelayer);
    },

    redraw: function () {
        this.tilelayer.redraw();
    }

});

L.FormBuilder.LabeledCheckBox = L.FormBuilder.CheckBox.extend({
    build: function () {
        var container = L.DomUtil.create('div', 'formbox', this.form);
        var label = L.DomUtil.create('label', 'layer-label', container);
        this.input = L.DomUtil.create('input', this.options.className || '', label);
        this.input.type = 'checkbox';
        this.input.name = this.name;
        this.input._helper = this;
        this.fetch();
        L.DomEvent.on(this.input, 'change', this.sync, this);
        if (typeof this.options.checked !== 'undefined') {
            this.input.checked = this.options.checked;
        }
        if (this.options.text) {
            var layerLabel = L.DomUtil.create('span', 'layer-name', label);
            var textNodeProperty = ('innerText' in layerLabel)? 'innerText' : 'textContent';
            layerLabel[textNodeProperty] = this.options.text;
        }
    }
});

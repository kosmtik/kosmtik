L.Kosmtik.Map = L.Map.extend({

    options: {
        attributionControl: false
    },

    initialize: function (options) {
        this.sidebar = new L.Kosmtik.Sidebar().addTo(this);
        this.toolbar = new L.Kosmtik.Toolbar().addTo(this);
        this.settingsForm = new L.K.SettingsForm(this);
        this.settingsForm.addElement(['autoReload', {handler: L.K.Switch, label: 'Autoreload', helpText: 'Reload map as soon as a project file is changed on the server.'}]);
        L.Map.prototype.initialize.call(this, 'map', options);
        this.loader = L.DomUtil.create('div', 'map-loader', this._controlContainer);
        this.tilelayer = new L.TileLayer('./tile/{z}/{x}/{y}.png?t={version}', {tileSize: L.K.Config.project.tileSize, noWrap: true, version: L.K.Config.project.loadTime}).addTo(this);
        this.dataInspectorLayer = new L.TileLayer.Vector('./tile/{z}/{x}/{y}.json?t={version}', {version: Date.now()});
        this.tilelayer.on('loading', function () {
            this.setState('loading');
        }, this);
        this.tilelayer.on('load', function () {
            this.unsetState('loading');
        }, this);
        L.control.scale().addTo(this);
        this.poll = new L.K.Poll('./poll/').start();
        this.poll.on('message', function (e) {
            if (e.isDirty) this.setState('dirty');
        }, this);
        this.createDataInspectorButton();
        this.createReloadButton();
        this.on('dirty:on', function () {
            if (L.K.Config.autoReload) this.reload();
        });
    },

    setState: function (state) {
        if (!L.DomUtil.hasClass(document.body, state)) {
            L.DomUtil.addClass(document.body, state);
            this.fire(state + ':on');
        }
    },

    unsetState: function (state) {
        if (L.DomUtil.hasClass(document.body, state)) {
            L.DomUtil.removeClass(document.body, state);
            this.fire(state + ':off');
        }
    },

    checkState: function (state) {
        return L.DomUtil.hasClass(document.body, state);
    },

    reload: function () {
        this.unsetState('dirty');
        this.setState('loading');
        L.K.Xhr.post('./reload/', {
            callback: function (status, data) {
                if (status === 200 && data) {
                    L.K.Config.project = JSON.parse(data);
                    this.tilelayer.options.version = L.K.Config.project.loadTime;
                    this.tilelayer.redraw();
                }
                this.unsetState('loading');
            },
            context: this
        });
    },

    createReloadButton: function () {
        var reload = L.DomUtil.create('li', 'reload');
        reload.innerHTML = '⟳ Reload';
        L.DomEvent.on(reload, 'click', function () {
            if (this.checkState('dirty')) {
                this.reload();
            }
        }, this);
        this.toolbar.addTool(reload);
    },

    createDataInspectorButton: function () {
        var button = L.DomUtil.create('li', 'autoreload with-switch');
        var builder = new L.K.FormBuilder(L.K.Config, [
            ['dataInspector', {handler: L.K.Switch, label: 'Data Inspector'}]
        ]);
        button.appendChild(builder.build());
        builder.on('synced', this.toggleInspectorLayer, this);
        this.toolbar.addTool(button);
    },

    toggleInspectorLayer: function () {
        if (L.K.Config.dataInspector) this.dataInspectorLayer.addTo(this);
        else this.removeLayer(this.dataInspectorLayer);
    }

});

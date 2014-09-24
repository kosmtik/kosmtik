L.Kosmtik.Map = L.Map.extend({

    options: {
        attributionControl: false
    },

    initialize: function (options) {
        options = options || {};
        if (project) {
            if (project.center) options.center = project.center;
            if (project.zoom) options.zoom = project.zoom;
        }
        this.sidebar = new L.Kosmtik.Sidebar().addTo(this);
        this.toolbar = new L.Kosmtik.Toolbar().addTo(this);
        L.Map.prototype.initialize.call(this, 'map', options);
        this.loader = L.DomUtil.create('div', 'map-loader', this._controlContainer);
        this.tilelayer = new L.Kosmtik.TileLayer('./tiles/{z}/{x}/{y}?t={version}', {tileSize: project.tileSize, noWrap: true, version: Date.now()}).addTo(this);
        this.tilelayer.on('loading', function () {
            this.setState('loading');
        }, this);
        this.tilelayer.on('load', function () {
            this.unsetState('loading');
        }, this);
        L.control.scale().addTo(this);
        this.poll = new L.K.Poll('./poll/').start();
        var reload = L.DomUtil.create('li', 'reload');
        reload.innerHTML = '⟳ Reload';
        L.DomEvent.on(reload, 'click', function () {
            if (this.checkState('dirty')) {
                this.reload();
            }
        }, this);
        this.toolbar.addTool(reload);
        this.poll.on('message', function (e) {
            if (e.isDirty) this.setState('dirty');
        }, this);
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
            callback: function () {
                this.tilelayer.redraw();
                this.unsetState('loading');
            },
            context: this
        });
    }

});


L.Kosmtik.TileLayer = L.TileLayer.extend({

    redraw: function () {
        this.options.version = Date.now();
        L.TileLayer.prototype.redraw.apply(this);
    }

});

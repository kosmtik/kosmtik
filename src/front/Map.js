L.Kosmtik.Map = L.Map.extend({

    options: {
        attributionControl: false
    },

    initialize: function (options) {
        this.sidebar = new L.Kosmtik.Sidebar().addTo(this);
        this.toolbar = new L.Kosmtik.Toolbar().addTo(this);
        this.commands = new L.Kosmtik.Command(this);
        this.settingsForm = new L.K.SettingsForm(this);
        this.settingsForm.addElement(['autoReload', {handler: L.K.Switch, label: 'Autoreload', helpText: 'Reload map as soon as a project file is changed on the server.'}]);
        this.settingsForm.addElement(['backendPolling', {handler: L.K.Switch, label: '(Advanced) Poll backend for project updates'}]);
        this.createPollIndicator();
        this.createReloadButton();
        this.dataInspector = new L.K.DataInspector(this);
        L.Map.prototype.initialize.call(this, 'map', options);
        this.loader = L.DomUtil.create('div', 'map-loader', this._controlContainer);
        this.crosshairs = new L.K.Crosshairs(this);
        this.alert = new L.K.Alert(this);
        this.metatilesBounds = new L.K.MetatileBounds(this, {tileSize: L.K.Config.project.metatile * 256});
        var tilelayerOptions = {
            version: L.K.Config.project.loadTime,
            minZoom: this.options.minZoom,
            maxZoom: this.options.maxZoom
        };
        this.tilelayer = new L.TileLayer('./tile/{z}/{x}/{y}.png?t={version}', tilelayerOptions).addTo(this);
        this.tilelayer.on('loading', function () {
            this.setState('loading');
        }, this);
        this.tilelayer.on('load', function () {
            this.unsetState('loading');
        }, this);
        L.control.scale().addTo(this);
        this.initPoller();
        this.on('dirty:on', function () {
            if (L.K.Config.autoReload) this.reload();
        });
        this.on('settings:synced', function (e) {
            if (e.field === 'backendPolling') this.togglePoll();
        });
        this.help = new L.Kosmtik.Help(this);
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
        this.fire('reload');
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
        reload.innerHTML = 'Reload';
        L.DomEvent.on(reload, 'click', function () {
            this.reload();
        }, this);
        this.toolbar.addTool(reload);
        this.commands.add({
            keyCode: L.K.Keys.R,
            shiftKey: true,
            ctrlKey: true,
            callback: this.reload,
            context: this,
            name: 'Map: reload'
        });
        this.commands.add({
            keyCode: L.K.Keys.A,
            shiftKey: true,
            ctrlKey: true,
            altKey: true,
            callback: function () {this.settingsForm.toggle('autoReload');},
            context: this,
            name: 'Autoreload: toggle',
            description: 'Autoreload or not when project has changed'
        });
    },

    createPollIndicator: function () {
        var button = L.DomUtil.create('li', 'poll-indicator');
        button.innerHTML = '⇵';
        button.title = 'Sync status'
        this.toolbar.addTool(button);
    },

    initPoller: function () {
        this.poll = new L.K.Poll('./poll/');
        this.poll.on('message', function (e) {
            if (e.isDirty) this.setState('dirty');
            if (e.error) this.alert.show({content: e.error, level: 'error'});
        }, this);
        this.poll.on('error', function () {
            this.setState('polling-error');
        }, this);
        this.poll.on('polled', function () {
            this.unsetState('polling-error');
        }, this);
        this.poll.on('start', function () {
            this.setState('polling');
        }, this);
        this.poll.on('stop', function () {
            this.unsetState('polling');
        }, this);
        this.togglePoll();
        var commandCallback = function () {
            this.settingsForm.toggle('backendPolling');
            this.togglePoll();
        };
        this.commands.add({
            keyCode: L.K.Keys.P,
            shiftKey: true,
            ctrlKey: true,
            altKey: true,
            callback: commandCallback,
            context: this,
            name: 'Poller: toggle'
        });
    },

    togglePoll: function () {
        if (L.K.Config.backendPolling) this.poll.start();
        else this.poll.stop();
    }

});

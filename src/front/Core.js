L.Kosmtik = L.K = {};


/*************/
/*   Utils   */
/*************/
L.Kosmtik.buildQueryString = function (params) {
    var queryString = [];
    for (var key in params) {
        queryString.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    }
    return queryString.join('&');
};

L.Kosmtik.Xhr = {

    _ajax: function (settings) {
        var xhr = new window.XMLHttpRequest();
        xhr.open(settings.verb, settings.uri, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && settings.callback) {
                settings.callback.call(settings.context || xhr, xhr.status, xhr.responseText, xhr);
            }
        };
        xhr.send(settings.data);
        return xhr;
    },

    get: function(uri, options) {
        options = options || {};
        options.verb = 'GET';
        options.uri = uri;
        return L.K.Xhr._ajax(options);
    },

    post: function(uri, options) {
        options = options || {};
        options.verb = 'POST';
        options.uri = uri;
        return L.K.Xhr._ajax(options);
    }

};

L.Kosmtik.Poll = L.Evented.extend({

    initialize: function (uri) {
        this.uri = uri;
        this.delay = 1;
    },

    poll: function () {
        L.K.Xhr.get(this.uri, {
            callback: this.polled,
            context: this
        });
    },

    polled: function (status, data) {
        if (status === 204 || status === 200) this.fire('polled');
        if (status === 204) return this.loop(1);
        if (status !== 200 || !data) return this.onError({status: status, error: data});
        try {
            data = JSON.parse(data);
        } catch (err) {
            return this.onError({error: err});
        }
        for (var i = 0; i < data.length; i++) {
            this.fire('message', data[i]);
        }
        this.loop(1);
    },

    onError: function (e) {
        this.fire('error', e);
        this.loop(++this.delay);
    },

    loop: function (delay) {
        this.delay = delay;
        this._id = window.setTimeout(L.bind(this.poll, this), this.delay * 1000);
    },

    start: function () {
        if (!this._id) this.loop(1);
        this.fire('start');
        return this;
    },

    stop: function () {
        if (this._id) {
            window.clearTimeout(this._id);
            this._id = null;
        }
        this.fire('stop');
        return this;
    }

});

L.Kosmtik.Switch = L.FormBuilder.CheckBox.extend({

    build: function () {
        L.FormBuilder.CheckBox.prototype.build.apply(this);
        this.input.parentNode.appendChild(this.label);
        L.DomUtil.addClass(this.input.parentNode, 'with-switch');
        var id = (this.builder.options.id || Date.now()) + '.' + this.name;
        this.label.setAttribute('for', id);
        L.DomUtil.addClass(this.input, 'switch');
        this.input.id = id;
    }

});

L.Kosmtik.Util = {};

L.Kosmtik.Util.renderPropertiesTable = function (properties) {
    var renderRow = function (container, key, value) {
        if (!key || value === undefined) return;
        var tr = L.DomUtil.create('tr', '', container);
        L.DomUtil.create('th', '', tr).innerHTML = key;
        L.DomUtil.create('td', '', tr).innerHTML = value;
    };
    var table = L.DomUtil.create('table');

    for (var key in properties) {
        renderRow(table, key, properties[key]);
    }
    return table;
};

L.K.Crosshairs = L.Layer.extend({

    initialize: function (map) {
        this.icon = L.DomUtil.create('div', 'crosshairs', map._container);
        map.settingsForm.addElement(['showCrosshairs', {handler: L.K.Switch, label: 'Show crosshairs in the center of the map'}]);
        map.on('settings:synced', this.toggle, this);
        this.toggle();
    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    onAdd: function (map) {
        this.show();
    },

    onRemove: function (map) {
        this.hide();
    },

    show: function () {
        L.DomUtil.setOpacity(this.icon, 0.8);
    },

    hide: function () {
        L.DomUtil.setOpacity(this.icon, 0);
    },

    toggle: function () {
        if (L.K.Config.showCrosshairs) this.show();
        else this.hide();
    }

});

L.Kosmtik.Alert = L.Class.extend({

    initialize: function (map, options) {
        this._map = map;
        L.setOptions(this, options);
        this.container = L.DomUtil.create('div', 'kosmtik-alert', document.body);
        this.closeButton = L.DomUtil.create('a', 'close', this.container);
        this.content = L.DomUtil.create('div', 'content', this.container);
        this.closeButton.href = '#';
        this.closeButton.innerHTML = 'Close';
        L.DomEvent
            .on(this.closeButton, 'click', L.DomEvent.stop)
            .on(this.closeButton, 'click', this.hide, this);
        this._map.on('reload', this.hide, this);
    },

    show: function (options) {
        this.content.innerHTML = options.content;
        this._map.setState('alert');
    },

    hide: function () {
        this._map.unsetState('alert');
    }

});

L.K.Keys = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    TAB: 9,
    ENTER: 13,
    ESC: 27,
    APPLE: 91,
    SHIFT: 16,
    ALT: 17,
    CTRL: 18,
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90
};
L.K.KeysLabel = {};
for (var k in L.K.Keys) L.K.KeysLabel[L.K.Keys[k]] = k;

L.Kosmtik.Help = L.Class.extend({

    initialize: function (map) {
        this.map = map;
        this.buildSidebar();
    },

    buildSidebar: function () {
        var container = L.DomUtil.create('div', 'help-panel'),
            title = L.DomUtil.create('h3', '', container);
        title.innerHTML = 'Help';
        this.buildShortcuts(container);
        this.map.sidebar.addTab({
            label: 'Help',
            className: 'help',
            content: container
        });
        this.map.sidebar.rebuild();
        this.map.commands.add({
            callback: this.openSidebar,
            context: this,
            name: 'Help: open'
        });
    },

    openSidebar: function () {
        this.map.sidebar.open('.help');
    },

    buildShortcuts: function (container) {
        var title = L.DomUtil.create('h4', '', container),
            shortcuts = L.DomUtil.create('table', 'shortcuts', container);
        title.innerHTML = 'Keyboard shortcuts';
        this.map.commands.each(function (specs) {
            if (!specs.name || !specs.keyCode) return;
            var row = L.DomUtil.create('tr', '', shortcuts);
            if (specs.description) row.title = specs.description;
            L.DomUtil.create('th', '', row).innerHTML = L.K.Command.makeLabel(specs);
            L.DomUtil.create('td', '', row).innerHTML = specs.name;
        }, this);
    }

});

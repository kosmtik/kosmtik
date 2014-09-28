L.Kosmtik = L.K = {};


/*************/
/*   Utils   */
/*************/
L.Kosmtik.buildQueryString = function (params) {
    var query_string = [];
    for (var key in params) {
        query_string.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    }
    return query_string.join('&');
};

L.Kosmtik.Xhr = {

    _ajax: function (settings) {
        var xhr = new window.XMLHttpRequest();
        xhr.open(settings.verb, settings.uri, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                settings.callback.call(settings.context || xhr, xhr.status, xhr.responseText, xhr);
            }
        };
        xhr.send(settings.data);
        return xhr;
    },

    get: function(uri, options) {
        options.verb = 'GET';
        options.uri = uri;
        return L.K.Xhr._ajax(options);
    },

    post: function(uri, options) {
        options.verb = 'POST';
        options.uri = uri;
        return L.K.Xhr._ajax(options);
    }

};

L.Kosmtik.Poll = L.Class.extend({

    includes: [L.Mixin.Events],

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
        if (status === 304 || status === 200) this.fire('polled');
        if (status === 304) return this.loop(1);
        if (status !== 200 || !data) return this.onError({status: status, error: data});
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
        var id = (this.formBuilder.options.id || Date.now()) + '.' + this.name;
        this.label.setAttribute('for', id);
        L.DomUtil.addClass(this.input, 'switch');
        this.input.id = id;
    }

});

L.Kosmtik.Util = {};

L.Kosmtik.Util.renderPropertiesTable = function (properties) {
    var renderRow = function (container, key, value) {
        if (!key || ! value) return;
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

L.K.Crosshairs = L.Class.extend({

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

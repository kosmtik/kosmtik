L.Kosmtik.Sidebar = L.Control.extend({
    includes: L.Mixin.Events,

    initialize: function (options) {

        L.setOptions(this, options);

        this._sidebar = L.DomUtil.create('div', 'sidebar collapsed');
        document.body.insertBefore(this._sidebar, document.body.firstChild);
        this._container = L.DomUtil.create('ul', 'sidebar-content', this._sidebar);
        this._tabs = L.DomUtil.create('ul', 'sidebar-tabs', this._sidebar);

        this._tabitems = [];
        this._panes = [];
    },

    addTab: function (options) {
        options = options || {};
        var tab = L.DomUtil.create('li', options.className || '', this._tabs);
        tab.innerHTML = options.label;
        tab._sidebar = this;
        tab._callback = options.callback;
        tab._callbackContext = options.context;
        var pane = L.DomUtil.create('li', 'sidebar-pane ' + (options.className || ''), this._container);
        if (options.content.nodeType && options.content.nodeType === 1) {
            pane.appendChild(options.content);
        }
        else {
            pane.innerHTML = options.content;
        }
        tab._pane = pane;
        this._tabitems.push(tab);
        this._panes.push(pane);
    },

    addTo: function (map) {
        this._map = map;
        L.DomEvent.on(document, 'keyup', this._onKeyUp, this);
        for (var i = this._tabitems.length - 1; i >= 0; i--) {
            L.DomEvent.on(this._tabitems[i], 'click', this._onClick, this);
        }
        return this;
    },

    removeFrom: function (map) {
        this._map = null;
        L.DomEvent.off(document, 'keyup', this._onKeyUp, this);
        for (var i = this._tabitems.length - 1; i >= 0; i--) {
            L.DomEvent.off(this._tabitems[i], 'click', this._onClick, this);
        }

        return this;
    },

    rebuild: function () {
        var map = this._map;
        this.removeFrom(map).addTo(map);
    },

    closeAll: function () {
        for (var i = this._panes.length - 1; i >= 0; i--) L.DomUtil.removeClass(this._panes[i], 'active');
        for (var j = this._tabitems.length - 1; j >= 0; j--) L.DomUtil.removeClass(this._tabitems[j], 'active');
    },

    open: function (el) {
        this.closeAll();
        this.fire('opening', {el: el});
        L.DomUtil.addClass(el, 'active');
        L.DomUtil.addClass(el._pane, 'active');
        L.DomUtil.removeClass(this._sidebar, 'collapsed');
        this.fire('open', {el: el});
     },

    close: function () {
        if (!L.DomUtil.hasClass(this._sidebar, 'collapsed')) {
            this.closeAll();
            this.fire('closing');
            L.DomUtil.addClass(this._sidebar, 'collapsed');
            this._map.invalidateSize();
        }
    },

    _onClick: function(e) {
        this.fire('tab:click', {el: e.target});
        if (e.target._callback) e.target._callback.apply(e.target._callbackContext || this);
        if (L.DomUtil.hasClass(e.target, 'active')) this.close();
        else this.open(e.target);
    },

    _onKeyUp: function (e) {
        if (e.keyCode == L.K.Keys.ESC) {
            this.close();
        }
    }
});

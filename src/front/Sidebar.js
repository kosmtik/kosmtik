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
        for (var i = this._tabitems.length - 1; i >= 0; i--) {
            L.DomEvent.on(this._tabitems[i], 'click', this._onClick, this);
        }
        return this;
    },

    removeFrom: function (map) {
        this._map = null;

        for (var i = this._tabitems.length - 1; i >= 0; i--) {
            L.DomEvent.off(this._tabitems[i], 'click', this._onClick, this);
        }

        return this;
    },

    rebuild: function () {
        this.removeFrom(this._map).addTo(this._map);
    },

    open: function(el) {

        for (i = this._panes.length - 1; i >= 0; i--) L.DomUtil.removeClass(this._panes[i], 'active');

        for (i = this._tabitems.length - 1; i >= 0; i--) L.DomUtil.removeClass(this._tabitems[i], 'active');

        this.fire('content', {el: el});

        L.DomUtil.addClass(el, 'active');
        L.DomUtil.addClass(el._pane, 'active');
        L.DomUtil.removeClass(this._sidebar, 'collapsed');
     },

    close: function() {
        for (var i = this._tabitems.length - 1; i >= 0; i--) L.DomUtil.removeClass(this._tabitems[i], 'active');

        // close sidebar
        if (!L.DomUtil.hasClass(this._sidebar, 'collapsed')) {
            this.fire('closing');
            L.DomUtil.addClass(this._sidebar, 'collapsed');
        }
    },

    _onClick: function(e) {
        if (L.DomUtil.hasClass(e.target, 'active')) this.close();
        else this.open(e.target);
    }
});

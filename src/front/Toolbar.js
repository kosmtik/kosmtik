L.Kosmtik.Toolbar = L.Control.extend({
    includes: L.Mixin.Events,

    initialize: function (options) {

        L.setOptions(this, options);

        this.container = L.DomUtil.create('div', 'toolbar');
        document.body.insertBefore(this.container, document.body.firstChild);
        var a = L.DomUtil.create('a', 'brand', this.container);
        a.innerHTML = 'kosmtik';
        a.href = '/';
        this.toolsContainer = L.DomUtil.create('ul', 'tools', this.container);
    },

    addTo: function (map) {
        this._map = map;
        return this;
    },

    removeFrom: function (map) {
        this._map = null;
        return this;
    },

    addTool: function (tool) {
        this.toolsContainer.appendChild(tool);
    }

});

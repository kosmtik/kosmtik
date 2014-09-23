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
        L.Map.prototype.initialize.call(this, 'map', options);
        L.tileLayer('./tiles/{z}/{x}/{y}', {tileSize: project.tileSize, noWrap: true}).addTo(this);
        L.control.scale().addTo(this);
    }

});

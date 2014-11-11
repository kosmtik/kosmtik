L.Kosmtik.SettingsForm = L.Class.extend({

    initialize: function (map) {
        this.container = L.DomUtil.create('div', 'settings-form');
        this.title = L.DomUtil.create('h3', '', this.container);
        this.formContainer = L.DomUtil.create('div', '', this.container);
        this.title.innerHTML = 'UI Settings';
        this.elements = [];
        this.map = map;
        this.builder = new L.K.FormBuilder(L.K.Config, this.elements);
        this.formContainer.appendChild(this.builder.build());
        this.builder.on('synced', function (e) {
            this.fire('settings:synced', e);
        }, this.map);
        this.map.sidebar.addTab({
            label: 'Settings',
            content: this.container,
            callback: this.build,
            context: this
        });
        this.map.sidebar.rebuild();
    },

    build: function () {
        if (this.elements.length) {
            this.builder.setFields(this.elements);
            this.builder.build();
        }
    },

    addElement: function (element) {
        this.elements.push(element);
        this.build();
    },

    fetchAll: function () {
        this.builder.fetchAll();
    },

    set: function (key, value) {
        L.K.Config[key] = value;
        this.builder.helpers[key].fetch();
        this.builder.helpers[key].sync();
    },

    toggle: function (key) {
        this.set(key, !L.K.Config[key]);
    }

});

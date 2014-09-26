L.Kosmtik.SettingsForm = L.Class.extend({

    initialize: function (map) {
        this.container = L.DomUtil.create('div', 'settings-form');
        this.title = L.DomUtil.create('h3', '', this.container);
        this.formContainer = L.DomUtil.create('div', '', this.container);
        this.title.innerHTML = 'UI Settings';
        this.elements = [];
        this.map = map;
        this.map.sidebar.addTab({
            label: 'Settings',
            content: this.container
        });
        this.map.sidebar.rebuild();
    },

    buildForm: function () {
        if (this.elements.length) {
            var builder = new L.K.FormBuilder(L.K.Config, this.elements);
            this.formContainer.innerHTML = '';
            this.formContainer.appendChild(builder.build());
            builder.on('synced', function (e) {
                this.fire('settings:synced', e);
            }, this.map);
        }
    },

    addElement: function (element) {
        this.elements.push(element);
        this.buildForm();
    }

});

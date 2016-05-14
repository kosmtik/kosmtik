L.K.Home = L.Evented.extend({

    rows: [],

    addRow: function (builder, context) {
        this.rows.push([builder, context || this]);
    },

    build: function () {
        var parent = L.DomUtil.get('content');
        for (var i = 0; i < this.rows.length; i++) {
            this.buildOne(this.rows[i]);
        }
        this.fire('build');
    },

    buildOne: function (row, parent) {
        var container = L.DomUtil.create('div', 'row', parent);        
        row[0].call(row[1], container);
    }

});

L.K.home = new L.K.Home();

L.K.ProjectLoader = L.Class.extend({

    build: function () {
        var container = L.DomUtil.get('content');
        var title = L.DomUtil.create('h3', '', container);
        title.innerHTML = 'Projects';
        var list = L.DomUtil.create('ul', 'project-list grid', container);
        for (id in L.K.Config.projects) this.addProject(L.K.Config.projects[id], list);
    },

    addProject: function (project, container) {
        var li = L.DomUtil.create('li', 'card', container);
        var title = L.DomUtil.create('h4', '', li);
        title.textContent = project.name || project.id;
        var img = L.DomUtil.create('img', '', li);
        img.src = '/' + project.id + '/.thumb.png';
        L.DomEvent.on(li, 'click', function () {
            window.location = '/' + project.id;
        });
    }

});
var loader = new L.K.ProjectLoader();
L.K.home.addRow(loader.build, loader);

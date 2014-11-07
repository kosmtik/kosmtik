var path = require('path'),
    Project = require(path.join(kosmtik.src, 'back/Project.js')).Project,
    Utils = require(path.join(kosmtik.src, 'back/Utils.js'));

var log = function () {
    console.warn.apply(console, Array.prototype.concat.apply(['[datasource loader]'], arguments));
};

var DataSourceLoader = function (config) {
    config.beforeState('project:loaded', this.patchMML.bind(this));
};

DataSourceLoader.prototype.patchMML = function (e) {
    if (!e.project.mml) return e.continue();
    var processed = 0, self = this,
        sources = e.project.mml.source,
        commit = function () {if (++processed === sources.length) e.continue();},
        requestTileJSON = function (source) {
            e.project.config.helpers.request({uri: source.tilejson}, function (err, resp, body) {
                if (err) throw err;
                var json = JSON.parse(body);
                self.processTileJSON(source, json);
                commit();
            });
        };
    if (sources && sources.length) {
        for (var i = 0; i < sources.length; i++) {
            if (sources[i].protocol === 'tmsource:') {
                this.loadLocalSource.bind(this)(sources[i], e.project.config);
                commit();
            } else if (sources[i].tilejson) {
                requestTileJSON(sources[i]);
            }
        }
    }
    e.continue();
};

DataSourceLoader.prototype.loadLocalSource = function (source, config) {
    log('Loading source from', source.path);
    var filepath = source.path,
        ext = path.extname(filepath);
    if (ext !== '.yml') filepath = path.join(filepath, 'data.yml');
    var project = new Project(config, filepath);
    this.attachSourceUrl(source, project);
    config.server.registerProject(project);
};

DataSourceLoader.prototype.attachSourceUrl = function (source, project) {
    var params = {
        host: project.config.parsed_opts.host,
        port: project.config.parsed_opts.port,
        path: 'tile/{z}/{x}/{y}.pbf',
        id: project.id
    };
    source.url = Utils.template('http://{host}:{port}/{id}/{path}', params);
};

DataSourceLoader.prototype.processTileJSON = function (source, tilejson) {
    source.url = tilejson.tiles[0];
    console.log(source);
};

exports.Plugin = DataSourceLoader;

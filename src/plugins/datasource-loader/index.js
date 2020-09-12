var path = require('path'),
    Project = require(path.join(kosmtik.src, 'back/Project.js')).Project,
    Utils = require(path.join(kosmtik.src, 'back/Utils.js'));

function log() {
    console.warn.apply(console, Array.prototype.concat.apply(['[datasource loader]'], arguments));
};

class DataSourceLoader {
    constructor(config) {
        config.beforeState('project:loaded', this.patchMML.bind(this));
        this._cache = {};
    };

    patchMML(e) {
        if (!e.project.mml) return e.continue();
        var processed = 0, self = this,
            sourceMaxzoom = 100,
            sources = e.project.mml.source,
            commit = function () {
                if (++processed === sources.length){
                    for (var i = 0; i < sources.length; i++) {
                        sourceMaxzoom = Math.min(sourceMaxzoom, sources[i].maxzoom);
                    }
                    e.project.mml.sourceMaxzoom = sourceMaxzoom;
                    e.continue();
                }
            },
            processTileJSON = function (source, json) {
                self.processTileJSON(source, json);
                commit();
            },
            requestTileJSON = function (source) {
                e.project.config.helpers.request({uri: source.tilejson}, function (err, resp, body) {
                    if (err) throw err;
                    var json = JSON.parse(body);
                    self._cache[source.tilejson] = json;
                    processTileJSON(source, json);
                });
            };
        if (sources && sources.length) {
            for (var i = 0; i < sources.length; i++) {
                if (sources[i].protocol === 'tmsource:') {
                    this.loadLocalSource.bind(this)(sources[i], e.project.config);
                    commit();
                } else if (sources[i].tilejson) {
                    if (!this._cache[sources[i].tilejson]) requestTileJSON(sources[i]);
                    else processTileJSON(sources[i], this._cache[sources[i].tilejson]);
                }
            }
        }
        e.continue();
    };

    loadLocalSource(source, config) {
        log('Loading source from', source.path);
        var filepath = path.resolve(source.path),
            ext = path.extname(filepath);
        if (ext !== '.yml') filepath = path.join(filepath, 'data.yml');
        var project = new Project(config, filepath);
        project.load(false);
        this.attachSourceUrl(source, project);
        source.maxzoom = project.mml.maxzoom;
        config.server.registerProject(project);
    };

    attachSourceUrl(source, project) {
        var params = {
            host: project.config.parsed_opts.host,
            port: project.config.parsed_opts.port,
            path: 'tile/{z}/{x}/{y}.pbf',
            id: project.id
        };
        source.url = Utils.template('http://{host}:{port}/{id}/{path}', params);
    };

    processTileJSON(source, tilejson) {
        source.url = tilejson.tiles[0];
        source.maxzoom = tilejson.maxzoom;
    };
}

exports = module.exports = { Plugin: DataSourceLoader };

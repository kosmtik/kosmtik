var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    ConfigEmitter = require('./ConfigEmitter.js').ConfigEmitter,
    Utils = require('./Utils.js');

var Project = function (config, filepath, options) {
    options = options || {};
    this.CLASSNAME = 'project';
    ConfigEmitter.call(this, config);
    this.filepath = filepath;
    this.id = options.id || path.basename(path.dirname(fs.realpathSync(this.filepath)));
    this.root = path.dirname(path.resolve(this.filepath));
    this.dataDir = path.join(this.root, 'data');
    try {
        fs.mkdirSync(this.dataDir);
    } catch (err) {}
    this.mapnik = require('mapnik');
    this.mapnikPool = require('./MapPool.js')(this.mapnik);
    this.mapnik.register_default_fonts();
    this.mapnik.register_system_fonts();
    this.mapnik.register_default_input_plugins();
    this.mapnik.register_fonts(path.join(path.dirname(filepath), 'fonts'), {recurse: true});
    this.changeState('init');
    this.cachePath = path.join('tmp', this.id);
    this.beforeState('loaded', this.initCache);
};

util.inherits(Project, ConfigEmitter);

Project.prototype.load = function (force) {
    if (this.mml && !force) return this.mml;
    this.config.log('Loading project from', this.filepath);
    var ext = path.extname(this.filepath),
        Loader = this.config.getLoader(ext),
        loader = new Loader(this);
    this.mml = loader.load();
    this.loadTime = Date.now();
    this.changeState('loaded');
    return this.mml;
};

Project.prototype.reload = function () {
    // TODO Handle concurrency
    this.xml = null;
    this.load(true);
};

Project.prototype.render = function (force) {
    if (this.xml && !force) return this.xml;
    this.load(force);
    var renderer, Renderer;
    if (this.mml) Renderer = require('./renderer/Carto.js').Carto;
    else throw 'Oops, unkown renderer';
    renderer = new Renderer(this);
    this.config.log('Generating Mapnik XML…');
    this.xml = renderer.render();
    return this.xml;
};

Project.prototype.createMapPool = function (options) {
    options = options || {};
    this.render();
    this.config.log('Loading map…');
    // TODO bufferSize?
    this.mapPool = this.mapnikPool.fromString(this.xml, {size: options.size || this.tileSize()}, {base: this.root});
    this.config.log('Map ready');
    return this.mapPool;
};

Project.prototype.export = function (options, callback) {
    var format = options.format;
    if (!this.config.exporters[format]) throw 'Unkown format ' + format;
    var Exporter = require(this.config.exporters[format]).Exporter;
    var exporter = new Exporter(this, options);
    exporter.export(callback);
};

Project.prototype.toFront = function () {
    var options = {
        center: [this.mml.center[1], this.mml.center[0]],
        zoom: this.mml.center[2],
        minZoom: this.mml.minzoom,
        maxZoom: this.mml.maxzoom,
        metatile: this.mml.metatile,
        name: this.mml.name,
        tileSize: this.tileSize(),
        loadTime: this.loadTime,
        layers: this.mml.Layer || []
    };
    this.emitAndForward('tofront', {options: options});
    return options;
};

Project.prototype.tileSize = function () {
    return 256 * this.mml.metatile;
};

Project.prototype.getUrl = function () {
    return '/' + this.id + '/';
};

Project.prototype.initCache = function (e) {
    var self = this, cacheFiles = [];
    Utils.mkdirs(self.cachePath, function (err) {
        if (err) throw err;
        if (self.config.parsed_opts.keepcache) return e.continue();
        try {
            cacheFiles = Utils.tree(self.cachePath);
        } catch (err2) {
            if (err2 && err2.code !== 'ENOENT') throw err2;
        }
        for (var i = 0; i < cacheFiles.length; i++) {
            if (cacheFiles[i].stat.isFile()) fs.unlink(cacheFiles[i].path);
        }
        e.continue();
    });
};

exports.Project = Project;

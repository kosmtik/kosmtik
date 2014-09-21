var util = require("util"),
    path = require('path'),
    fs = require('fs'),
    carto = require('carto'),
    ConfigEmitter = require('./ConfigEmitter.js').ConfigEmitter;

var Project = function (config, filepath, options) {
    options = options || {};
    this.CLASSNAME = 'project';
    ConfigEmitter.call(this, config);
    this.filepath = filepath;
    this.id = options.id || path.basename(path.dirname(this.filepath));
    this.root = path.dirname(this.filepath);
    this.dataDir = path.join(this.root, 'data');
    try {
        fs.mkdirSync(this.dataDir);
    } catch (err) {}
    this.mapnik = require('mapnik');
    this.mapnikPool = require('mapnik-pool')(this.mapnik);
    this.mapnik.register_default_fonts();
    this.mapnik.register_system_fonts();
    this.mapnik.register_default_input_plugins();
    this.mapnik.register_fonts(path.join(path.dirname(filepath), 'fonts'));
    this.changeState('init');
};

util.inherits(Project, ConfigEmitter);

Project.prototype.load = function (force) {
    if (this.mml && !force) return;
    this.config.log('Loading project from', this.filepath);
    var ext = path.extname(this.filepath),
        Loader = this.config.getLoader(ext),
        loader = new Loader(this);
    this.mml = loader.load();
    this.changeState('loaded');
};

Project.prototype.reload = function () {
    this.load(true);
};

Project.prototype.render = function (force) {
    if (this.xml && !force) return this.xml;
    this.load(force);
    var renderer, Renderer;
    if (this.mml) Renderer = require('./renderer/Carto.js').Carto;
    else throw "Oops, unkown renderer";
    renderer = new Renderer(this);
    this.config.log('Generating Mapnik XML…');
    this.xml = renderer.render();
    return this.xml;
};

Project.prototype.createMapPool = function () {
    this.render();
    this.config.log('Loading map…');
    this.mapPool = this.mapnikPool.fromString(this.xml, {log: true}, {base: this.root});
    return this.mapPool;
};

Project.prototype.export = function (options, callback) {
    var format = options.format;
    if (!this.config.exporters[format]) throw "Unkown format " + format;
    var Exporter = require(this.config.exporters[format]).Exporter,
        exporter = new Exporter(this, options);
    exporter.export(callback);
};

Project.prototype.toFront = function () {
    var options = {
        center: [this.mml.center[1], this.mml.center[0]],
        zoom: this.mml.center[2]
    };
    this.emitAndForward('tofront', {options: options});
    return options;
};

Project.prototype.getUrl = function () {
    return '/' + this.id + '/';
};

exports.Project = Project;

var path = require('path'),
    fs = require('fs'),
    ConfigEmitter = require('./ConfigEmitter.js').ConfigEmitter,
    Utils = require('./Utils.js');

class Project extends ConfigEmitter {
    constructor(config, filepath, options) {
        super(config);
        options = options || {};
        this.CLASSNAME = 'project';
        this.filepath = filepath;
        this.id = this.config.parsed_opts.style_id || options.id || path.basename(path.dirname(fs.realpathSync(this.filepath)));
        this.root = path.dirname(path.resolve(this.filepath));
        this.dataDir = path.join(this.root, 'data');
        try {
            fs.mkdirSync(this.dataDir);
        } catch (err) {}
        this.mapnik = require('@mapnik/mapnik');
        this.mapnikPool = require('mapnik-pool')(this.mapnik);
        this.mapnik.register_default_fonts();
        this.mapnik.register_system_fonts();
        this.mapnik.register_default_input_plugins();
        this.mapnik.register_fonts(path.join(path.dirname(filepath), 'fonts'), {recurse: true});
        this.changeState('init');
        this.cachePath = path.join('tmp', this.id);
        this.beforeState('loaded', this.initMetaCache);
        this.beforeState('loaded', this.initVectorCache);
    };

    load(force) {
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

    reload() {
        // TODO Handle concurrency
        this.xml = null;
        this.load(true);
    };

    render(force) {
        if (this.xml && !force) return this.xml;
        this.load(force);
        var renderer, Renderer;
        Renderer = this.config.getRenderer(this.config.parsed_opts.renderer);

        renderer = new Renderer(this);
        this.config.log('Generating Mapnik XML…');
        this.xml = renderer.render();
        return this.xml;
    };

    createMapPool(options) {
        options = options || {};
        this.render();
        this.config.log('Loading map…');
        if (!options.bufferSize) options.bufferSize = this.mml.bufferSize || 256;
        if(!options.size) options.size = this.metatileSize() * (options.scale || 1);
        this.mapPool = this.mapnikPool.fromString(this.xml, options, {base: this.root});
        this.config.log('Map ready');
        return this.mapPool;
    };

    export(options, callback) {
        var format = options.format;
        if (!this.config.exporters[format]) throw 'Unknown format ' + format;
        var Exporter = require(this.config.exporters[format]).Exporter;
        var exporter = new Exporter(this, options);
        exporter.export(callback);
    };

    toFront() {
        var options = {
            center: [this.mml.center[1], this.mml.center[0]],
            zoom: this.mml.center[2],
            minZoom: this.mml.minzoom,
            maxZoom: this.mml.maxzoom,
            metatile: this.metatile(),
            name: this.mml.name || '',
            tileSize: this.tileSize(),
            loadTime: this.loadTime,
            layers: this.mml.Layer || []
        };
        this.emitAndForward('tofront', {options: options});
        return options;
    };

    tileSize() {
        return 256;
    };

    metatileSize() {
        return this.tileSize() * this.metatile();
    };

    metatile() {
        return this.config.parsed_opts.metatile || this.mml.metatile || 1;
    };

    getUrl() {
        return '/' + this.id + '/';
    };

    getVectorCacheDir() {
        return path.join(this.cachePath, 'vector');
    };

    getMetaCacheDir() {
        return path.join(this.cachePath, 'meta');
    };

    initMetaCache(e) {
        var self = this, cacheFiles = [],
            dir = this.getMetaCacheDir();
        Utils.mkdirs(dir, function (err) {
            if (err) throw err;
            self.config.log('Creating metatiles cache dir', dir);
            if (self.config.parsed_opts.keepcache) return e.continue();
            self.config.log('Deleting previous metatiles', dir);
            Utils.cleardir(dir, function (err) {
                if (err) throw err;
                e.continue();
            });
        });
    };

    initVectorCache(e) {
        var self = this, dir = this.getVectorCacheDir();
        Utils.mkdirs(dir, function (err) {
            if (err) throw err;
            self.config.log('Created vector cache dir', dir);
            e.continue();
        });
    };
}

exports = module.exports = { Project };
var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    semver = require('semver'),
    yaml = require('js-yaml'),
    StateBase = require('./back/StateBase.js').StateBase,
    Helpers = require('./back/Helpers.js').Helpers,
    mapnik = require('mapnik'),
    PluginsManager = require('./back/PluginsManager.js').PluginsManager;

GLOBAL.kosmtik = {};
kosmtik.src = __dirname;

var Config = function (root, configpath) {
    StateBase.call(this);
    this.configpath = configpath;
    this.root = root;
    this.helpers = new Helpers(this);
    this.initOptions();
    this.initExporters();
    this.initLoaders();
    this.initRenderers();
    this.initStatics();
    if (!this.configpath) this.ensureDefaultUserConfigPath();
    this.loadUserConfig();
    this.pluginsManager = new PluginsManager(this);  // Do we need back ref?
    this.emit('loaded');
    this.on('server:init', this.attachRoutes.bind(this));
    this.parsed_opts = {
        renderer: 'carto'
    };  // Default. TODO better option management.
};

util.inherits(Config, StateBase);

Config.prototype.getUserConfigDir = function () {
    var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    return path.join(home, '.config');
};

Config.prototype.getUserConfigPath = function () {
    return this.configpath || path.join(this.getUserConfigDir(), 'kosmtik.yml');
};

Config.prototype.loadUserConfig = function () {
    var configpath = this.getUserConfigPath(),
        config = {};
    try {
        config = yaml.safeLoad(fs.readFileSync(configpath, 'utf-8'));
        this.log('Loading config from', configpath);
    } catch (err) {
        this.log('No usable config file found in', configpath);
    }
    this.userConfig = config || {};
};

Config.prototype.saveUserConfig = function () {
    var configpath = this.getUserConfigPath(),
        self = this;
    fs.writeFile(configpath, yaml.safeDump(this.userConfig), function (err) {
        if (err) throw err;
        self.log('Saved env conf to', configpath);
    });
};

Config.prototype.getFromUserConfig = function (key, fallback) {
    return typeof this.userConfig[key] !== 'undefined' ? this.userConfig[key] : fallback;
};

Config.prototype.ensureDefaultUserConfigPath = function () {
    try {
        fs.mkdirSync(this.getUserConfigDir());
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
};

Config.prototype.initExporters = function () {
    this.exporters = {};
};

Config.prototype.registerExporter = function (format, path) {
    this.exporters[format] = path;
};

Config.prototype.initRenderers = function () {
    this.renderers = {};
    this.registerRenderer('carto', './back/renderer/Carto.js');
};

Config.prototype.registerRenderer = function (name, path) {
    this.renderers[name] = path;
};

Config.prototype.getRenderer = function (name) {
    if (!this.renderers[name]) throw new Error('Unknown renderer: ' + name);
    return require(this.renderers[name]).Renderer;
};

Config.prototype.initLoaders = function () {
    this.loaders = {};
    this.registerLoader('.mml', './back/loader/MML.js');
    this.registerLoader('.yml', './back/loader/MML.js');
    this.registerLoader('.yaml', './back/loader/MML.js');
};

Config.prototype.registerLoader = function (ext, nameOrPath) {
    this.loaders[ext] = nameOrPath;
};

Config.prototype.getLoader = function (ext) {
    if (!this.loaders[ext]) throw 'Unknown project config type: ' + ext;
    return require(this.loaders[ext]).Loader;
};

Config.prototype.initOptions = function () {
    this.opts = require('nomnom');
    this.commands = {};
    this.commands.serve = this.opts.command('serve').help('Run the server');
    this.commands.serve.option('path', {
        position: 1,
        help: 'Optional project path to load at start.'
    });
    this.opts.option('port', {
        default: 6789,
        help: 'Port to listen on.'
    });
    this.opts.option('host', {
        default: '127.0.0.1',
        help: 'Host to listen on.'
    });
    this.opts.option('mapnik_version', {
        full: 'mapnik-version',
        default: this.defaultMapnikVersion(),
        help: 'Optional mapnik reference version to be passed to Carto'
    });
    this.opts.option('proxy', {
        help: 'Optional proxy to use when doing http requests'
    });
    this.opts.option('keepcache', {
        full: 'keep-cache',
        flag: true,
        help: 'Do not flush cached metatiles on project load'
    });
    this.opts.option('renderer', {
        full: 'renderer',
        default: 'carto',
        help: 'Specify a renderer by its name, carto is the default.'
    });
};

Config.prototype.parseOptions = function () {
    // Make sure to include all formats, even the ones
    // added by plugins.
    this.emit('parseopts');
    this.parsed_opts = this.opts.parse();
    this.emit('command:' + this.parsed_opts[0]);
};

Config.prototype.initStatics = function () {
    this._js = [
        '/node_modules/leaflet/dist/leaflet-src.js',
        '/node_modules/leaflet-formbuilder/Leaflet.FormBuilder.js',
        '/src/front/Core.js',
        '/config/',
        './config/',
        '/src/front/Autocomplete.js',
        '/src/front/DataInspector.js',
        '/src/front/MetatilesBounds.js',
        '/src/front/Sidebar.js',
        '/src/front/Toolbar.js',
        '/src/front/FormBuilder.js',
        '/src/front/Settings.js',
        '/src/front/Command.js',
        '/src/front/Map.js',
        '/src/front/ProjectLoader.js',
    ];
    this._css = [
        '/node_modules/leaflet/dist/leaflet.css',
        '/src/front/Sidebar.css',
        '/src/front/Toolbar.css',
        '/src/front/Core.css'
    ];
};

Config.prototype.addJS = function (path) {
    this._js.push(path);
};

Config.prototype.addCSS = function (path) {
    this._css.push(path);
};

Config.prototype.toFront = function () {
    var options = {
        exportFormats: Object.keys(this.exporters),
        autoReload: this.getFromUserConfig('autoReload', true),
        backendPolling: this.getFromUserConfig('backendPolling', true),
        showCrosshairs: this.getFromUserConfig('showCrosshairs', true),
        dataInspectorLayers: {
            '__all__': true
        },
        projects: this.getFromUserConfig('projects', {})
    };
    this.emit('tofront', {options: options});
    return options;
};

Config.prototype.attachRoutes = function (e) {
    e.server.addRoute('/config/', this.serveForFront.bind(this));
};

Config.prototype.serveForFront = function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/javascript'
    });
    var tpl = 'L.K.Config = %;';
    res.write(tpl.replace('%', JSON.stringify(this.toFront())));
    res.end();
};

Config.prototype.log = function () {
    console.warn.apply(console, Array.prototype.concat.apply(['[Core]'], arguments));
};

Config.prototype.defaultMapnikVersion = function () {
    var version = semver(mapnik.versions.mapnik);
    version.patch = 0;
    return version.format();
};

exports.Config = Config;

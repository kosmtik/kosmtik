var util = require('util'),
    path = require('path'),
    fs = require('fs'),
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
    this.initStatics();
    this.loadUserConfig();
    this.pluginsManager = new PluginsManager(this);  // Do we need back ref?
    this.emit('loaded');
    this.on('server:init', this.attachRoutes.bind(this));
    this.parsed_opts = {};  // Default. TODO better option management.
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
        config = fs.readFileSync(configpath, 'utf-8');
        config = yaml.safeLoad(config);
        this.log('Loading config from', configpath);
    } catch (err) {
        this.log('No usable config file found in', configpath);
    }
    this.userConfig = config;
};

Config.prototype.saveUserConfig = function () {
    var configpath = this.getUserConfigPath(),
        self = this;
    fs.writeFile(configpath, yaml.safeDump(this.userConfig), function (err) {
        self.log('Saved env conf to', configpath);
    });
};

Config.prototype.getFromUserConfig = function (key, fallback) {
    return typeof this.userConfig[key] !== 'undefined' ? this.userConfig[key] : fallback;
};

Config.prototype.initExporters = function () {
    this.exporters = {};
};

Config.prototype.registerExporter= function (format, path) {
    this.exporters[format] = path;
};

Config.prototype.initLoaders = function () {
    this.loaders = {};
    this.registerLoader('.mml', './back/loader/MML.js');
    this.registerLoader('.yml', './back/loader/YAML.js');
    this.registerLoader('.yaml', './back/loader/YAML.js');
};

Config.prototype.registerLoader = function (ext, name_or_path) {
    this.loaders[ext] = name_or_path;
};

Config.prototype.getLoader = function (ext) {
    if (!this.loaders[ext]) throw 'Unkown project config type: ' + ext;
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
    this.commands.serve.option('port', {
        default: 6789,
        help: 'Port to listen on.'
    });
    this.commands.serve.option('host', {
        default: '127.0.0.1',
        help: 'Host to listen on.'
    });
    this.opts.option('mapnik_version', {
        full: 'mapnik-version',
        default: mapnik.versions.mapnik,
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
        '/src/front/Map.js'
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
        backendPolling: true,
        showCrosshairs: true
    };
    this.emit('tofront', {options: options});
    return options;
};

Config.prototype.attachRoutes = function (e) {
    e.server.addRoute('/config/', this.serveForFront.bind(this));
};

Config.prototype.serveForFront = function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/javascript',
    });
    var tpl = 'L.K.Config = %;';
    res.write(tpl.replace('%', JSON.stringify(this.toFront())));
    res.end();
};

Config.prototype.log = function () {
    console.warn.apply(console, Array.prototype.concat.apply(['[Core]'], arguments));
};

exports.Config = Config;

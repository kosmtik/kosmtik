var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    semver = require('semver'),
    yaml = require('js-yaml'),
    StateBase = require('./back/StateBase.js').StateBase,
    Helpers = require('./back/Helpers.js').Helpers,
    mapnik = require('mapnik'),
    PluginsManager = require('./back/PluginsManager.js').PluginsManager,
    _has = require('lodash.has');

global.kosmtik = {};
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
        renderer: 'carto',
        mapnik_version: this.defaultMapnikVersion()
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
    var self = this;

    this.opts = require('commander');
    this.commands = {};
    this.commands.serve = this.opts.command('serve [path]')
        .description('Run the server with optional project path to load at start.')
        .option('--port [port]',
            'Port to listen on. Default is 6789.',
            parseInt,
            6789)
        .option('--host [host]',
            'Host to listen on. Defaults to 127.0.0.1.',
            '127.0.0.1')
        .option('--proxy <proxy>',
            'Optional proxy to use when doing http requests.')
        .option('--mapnik-version [version]',
            'Optional mapnik reference version to be passed to Carto.',
            this.defaultMapnikVersion())
        .option('--keep-cache',
            'Do not flush cached metatiles on project load.')
        .option('--renderer [name]',
            'Specify a renderer by its name, carto is the default.',
            'carto')
        .option('--metatile <metatile>',
            'Override mml metatile setting [Default: mml setting].')
        .action(function (path, options) {
            if (_has(options, 'port')) {
                self.parsed_opts.port = options.port;
            }
            if (_has(options, 'host')) {
                self.parsed_opts.host = options.host;
            }
            if (_has(options, 'proxy')) {
                self.parsed_opts.proxy = options.proxy;
            }
            if (_has(options, 'localconfig')) {
                self.parsed_opts.localconfig = options.localconfig;
            }
            if (_has(options, 'renderer')) {
                self.parsed_opts.renderer = options.renderer;
            }
            if (_has(options, 'metatile')) {
                self.parsed_opts.metatile = options.metatile;
            }
            // since commander does not support individual variable names
            // we have to set them manually
            if (_has(options, 'mapnikVersion')) {
                self.parsed_opts.mapnik_version = options.mapnikVersion;
            }
            if (_has(options, 'keepCache')) {
                self.parsed_opts.keepcache = options.keepcache;
            }

            self.parsed_opts.path = path;
            self.parsed_opts.commandName = 'serve';
    });
};

Config.prototype.parseOptions = function () {
    // Make sure to include all formats, even the ones
    // added by plugins.
    this.emit('parseopts');
    this.opts.parse(process.argv);
    this.emit('command:' + this.parsed_opts.commandName);
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
        backendPolling: this.getFromUserConfig('backendPolling', true),
        showCrosshairs: this.getFromUserConfig('showCrosshairs', false),
        dataInspectorLayers: {
            '__all__': true
        }
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
    return version.format();
};

exports.Config = Config;

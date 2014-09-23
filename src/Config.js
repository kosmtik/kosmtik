var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    yaml = require('js-yaml'),
    StateBase = require('./back/StateBase.js').StateBase,
    PluginsManager = require('./back/PluginsManager.js').PluginsManager;

var Config = function (root) {
    StateBase.call(this);
    this.root = root;
    this.initOptions();
    this.initExporters();
    this.initLoaders();
    this.initStatics();
    this.loadUserConfig();
    this.pluginsManager = new PluginsManager(this);  // Do we need back ref?
    this.emit('loaded');
    this.on('server:init', this.attachRoutes.bind(this));
};

util.inherits(Config, StateBase);

Config.prototype.getUserConfigPath = function () {
    var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    return path.join(home, '.config', 'kosmtik', 'config.yml');
};

Config.prototype.loadUserConfig = function () {
    var configpath = this.getUserConfigPath(),
        config = {};
    try {
        config = fs.readFileSync(configpath, 'utf-8');
        config = yaml.safeLoad(config);
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
    if (!this.loaders[ext]) throw "Unkown project config type: " + ext;
    return require(this.loaders[ext]).Loader;
};

Config.prototype.initOptions = function () {
    this.opts = require("nomnom");
    this.commands = {};
    this.commands.serve = this.opts.command('serve').help('Run the server');
    this.commands.serve.option('path', {
        position: 1,
        help: 'Optional project path to load at start.'
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
        '/node_modules/leaflet/dist/leaflet.js',
        '/node_modules/leaflet-formbuilder/Leaflet.FormBuilder.js',
        '/src/front/Core.js',
        '/config/',
        './options/',
        '/src/front/Sidebar.js',
        '/src/front/FormBuilder.js',
        '/src/front/Map.js'
    ];
    this._css = [
        '/node_modules/leaflet/dist/leaflet.css',
        '/src/front/Sidebar.css',
        '/src/front/main.css'
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
        exportFormats: Object.keys(this.exporters)
    };
    this.emit('tofront', {options: options});
    return options;
};

Config.prototype.attachRoutes = function (e) {
    e.server.addRoute('/config/', this.serveForFront.bind(this));
};

Config.prototype.serveForFront = function (req, res) {
    res.writeHead(200, {
        "Content-Type": "application/javascript",
    });
    var tpl = "L.K.Config = %;";
    res.write(tpl.replace('%', JSON.stringify(this.toFront())));
    res.end();
};

Config.prototype.log = function () {
    console.warn.apply(console, Array.prototype.concat.apply(['[Core]'], arguments));
};

exports.Config = Config;

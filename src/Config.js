var path = require('path'),
    fs = require('fs'),
    semver = require('semver'),
    yaml = require('js-yaml'),
    StateBase = require('./back/StateBase.js').StateBase,
    Helpers = require('./back/Helpers.js').Helpers,
    mapnik = require('mapnik'),
    PluginsManager = require('./back/PluginsManager.js').PluginsManager,
    packageVersion = require('../package.json').version;

global.kosmtik = {};
kosmtik.src = __dirname;

class Config extends StateBase {

    constructor(root, configpath) {
        super();
        this.configpath = configpath;
        this.root = root;
        this.version = packageVersion;
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

    getUserConfigDir() {
        var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
        return path.join(home, '.config');
    };

    getUserConfigPath() {
        return this.configpath || path.join(this.getUserConfigDir(), 'kosmtik.yml');
    };

    loadUserConfig() {
        var configpath = this.getUserConfigPath(),
            config = {};
        try {
            config = yaml.load(fs.readFileSync(configpath, 'utf-8')) || {};
            this.log('Loading config from', configpath);
        } catch (err) {
            this.log('No usable config file found in', configpath);
        }
        this.userConfig = config;
    };

    saveUserConfig() {
        var configpath = this.getUserConfigPath(),
            self = this;
        fs.writeFile(configpath, yaml.dump(this.userConfig), function (err) {
            self.log('Saved env conf to', configpath);
        });
    };

    getFromUserConfig(key, fallback) {
        return typeof this.userConfig[key] !== 'undefined' ? this.userConfig[key] : fallback;
    };

    ensureDefaultUserConfigPath() {
        try {
            fs.mkdirSync(this.getUserConfigDir());
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
    };

    initExporters() {
        this.exporters = {};
    };

    registerExporter(format, path) {
        this.exporters[format] = path;
    };

    initRenderers() {
        this.renderers = {};
        this.registerRenderer('carto', './back/renderer/Carto.js');
    };

    registerRenderer(name, path) {
        this.renderers[name] = path;
    };

    getRenderer(name) {
        if (!this.renderers[name]) throw new Error('Unknown renderer: ' + name);
        return require(this.renderers[name]).Renderer;
    };

    initLoaders() {
        this.loaders = {};
        this.registerLoader('.mml', './back/loader/MML.js');
        this.registerLoader('.yml', './back/loader/MML.js');
        this.registerLoader('.yaml', './back/loader/MML.js');
    };

    registerLoader(ext, nameOrPath) {
        this.loaders[ext] = nameOrPath;
    };

    getLoader(ext) {
        if (!this.loaders[ext]) throw 'Unknown project config type: ' + ext;
        return require(this.loaders[ext]).Loader;
    };

    initOptions() {
        this.opts = require('nomnom');
        this.commands = {};
        this.commands.version = this.opts.command('version').help('Show the package version');
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
        this.opts.option('metatile', {
            help: 'Override mml metatile setting [Default: mml setting]'
        });
        this.opts.option('style_id', {
            type: 'string',
            full: 'style-id',
            help: 'Specify style id. Useful when multiple project.mml files placed in one single directory. [Default: project directory name]'
        });
    };

    parseOptions() {
        // Make sure to include all formats, even the ones
        // added by plugins.
        this.emit('parseopts');
        this.parsed_opts = this.opts.parse();
        this.emit('command:' + this.parsed_opts[0]);
    };

    initStatics() {
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

    addJS(path) {
        this._js.push(path);
    };

    addCSS(path) {
        this._css.push(path);
    };

    toFront() {
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

    attachRoutes(e) {
        e.server.addRoute('/config/', this.serveForFront.bind(this));
    };

    serveForFront(req, res) {
        res.writeHead(200, {
            'Content-Type': 'application/javascript'
        });
        var tpl = 'L.K.Config = %;';
        res.write(tpl.replace('%', JSON.stringify(this.toFront())));
        res.end();
    };

    log() {
        console.warn.apply(console, Array.prototype.concat.apply(['[Core]'], arguments));
    };

    defaultMapnikVersion() {
        var version = semver(mapnik.versions.mapnik);
        return version.format();
    };
}

exports = module.exports = { Config };

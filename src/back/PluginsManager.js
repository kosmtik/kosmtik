var npm = require('npm'),
    fs = require('fs'),
    path = require('path');

var PluginsManager = function (config) {
    this.config = config;
    this.config.commands.plugins = this.config.opts.command('plugins');
    this.config.commands.plugins.option('installed', {
        flag: true,
        help: 'Show installed plugins'
    }).help('Manage plugins');
    this.config.commands.plugins.option('available', {
        flag: true,
        help: 'Show available plugins in registry'
    });
    this.config.on('command:plugins', this.handleCommand.bind(this));
    this._registered = [
        '../plugins/base-exporters/index.js',
        '../plugins/hash/index.js',
        '../plugins/local-config/index.js'
    ].concat(this.config.sysconfig.plugins || []);
    for (var i = 0; i < this._registered.length; i++) {
        this.register(this._registered[i]);
    }
};

PluginsManager.prototype.register = function (name_or_path) {
    var Plugin, plugin;
    try {
        Plugin = require(name_or_path).Plugin;
    } catch (err) {
        this.config.log('Unable to load plugin', name_or_path, err.code);
        return;
    }
    this.config.log('Loading plugin from', name_or_path);
    new Plugin(this.config);
};

PluginsManager.prototype.isInstalled = function (name) {
    return this._registered.indexOf(name) !== -1;
};

PluginsManager.prototype.available = function (callback) {
    var conf = fs.readFileSync(path.join(this.config.root, '..', 'package.json')),
        self = this;
    npm.load(conf, function () {
        npm.commands.search(['kosmtik'], true, function (err, results) {
            if (err) return callback(err);
            var plugin, installed, plugins = [];
            for (var name in results) {
                plugin = results[name];
                if (plugin.keywords.indexOf('kosmtik') === -1) continue;
                plugins.push(plugin);
            }
            callback(null, plugins);
        });
    });

};

PluginsManager.prototype.handleCommand = function () {
    var self = this;
    if (this.config.parsed_opts.installed) {
        console.log('Installed plugins');
        for (var i = 0; i < this._registered.length; i++) {
            console.log(this._registered[i]);
        }
    } else if (this.config.parsed_opts.available) {
        console.log('Loading available plugins…');
        this.available(function (err, plugins) {
            if (err) throw err.message;
            for (var i = 0, plugin; i < plugins.length; i++) {
                plugin = plugins[i];
                installed = self.isInstalled(plugin.name) ? '✓ ' : '. ';
                console.log(installed, plugin.name, '(' + plugin.description + ')');
            }
        });
    }
};

exports.PluginsManager = PluginsManager;

var exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    semver = require('semver');

class PluginsManager {
    constructor(config) {
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
        this.config.commands.plugins.option('install', {
            metavar: 'NAME',
            help: 'Install a plugin',
            list: true
        });
        this.config.commands.plugins.option('reinstall', {
            flag: true,
            help: 'Reinstall every installed plugin'
        });
        this.config.on('command:plugins', this.handleCommand.bind(this));
        this.config.beforeState('project:loaded', this.handleProject.bind(this));
        this._registered = [
            '../plugins/base-exporters/index.js',
            '../plugins/hash/index.js',
            '../plugins/local-config/index.js',
            '../plugins/datasource-loader/index.js',
            '../plugins/version/index.js',
        ].concat(this.config.userConfig.plugins || []);
        for (var i = 0; i < this._registered.length; i++) {
            this.load(this._registered[i]);
        }
    };

    load(name_or_path) {
        var Plugin;
        try {
            Plugin = require(name_or_path).Plugin;
        } catch (err) {
            this.config.log('Unable to load plugin', name_or_path, err.code);
            this.config.log('→ try: node index.js plugins --install', name_or_path);
            return;
        }
        this.config.log('Loading plugin from', name_or_path);
        new Plugin(this.config);
    };

    each(method, context) {
        for (var i = 0; i < this._registered.length; i++) {
            method.call(context || this, this._registered[i]);
        }
    };

    isInstalled(name) {
        return this._registered.indexOf(name) !== -1;
    };

    isLocal(name) {
        return name.indexOf('/') !== -1;
    };

    loadPackage() {
        return JSON.parse(fs.readFileSync(path.join(this.config.root, 'package.json')));
    };

    available(callback) {
        exec('npm search --json keywords:kosmtik', (error, stdout, stderr) => {
            if (error) return callback(error);
            callback(null, JSON.parse(stdout));
        });
    };

    install(names) {
        var self = this,
            pkg = this.loadPackage(),
            i = 0;
        var loopInstall = function () {
            var name = names[i++];
            if (!name) return;
            self.config.log('Starting installation of ' + name);
            exec(`npm view --json '${name}'`, (error, stdout, stderr) => {
                if (error) throw error.message;
                const plugin = JSON.parse(stdout);
                if (!plugin.kosmtik || !semver.satisfies(pkg.version, plugin.kosmtik)) {
                    return self.config.log('Unable to install', name, 'version', plugin.kosmtik, 'does not satisfy local kosmtik install', pkg.version, 'ABORTING');
                }

                exec(`npm install --json '${name}'`, (error, stdout, stderr) => {
                    if (error) return self.config.log('Error when installing package', name, error);

                    self.config.log('Successfully installed package', name);
                    self.attach(plugin.name);
                    self.config.saveUserConfig();
                    loopInstall();
                });
            });
        };
        loopInstall();
    };

    reinstall() {
        var names = [];
        this.each(function (name) {
            if (!this.isLocal(name)) names.push(name);
        });
        this.install(names);
    };

    attach(name) {
        // Attach plugin to user config
        this.config.userConfig.plugins = this.config.userConfig.plugins || [];
        if (this.config.userConfig.plugins.indexOf(name) === -1) this.config.userConfig.plugins.push(name);
        this.config.log('Attached plugin:', name);
    };

    handleCommand() {
        var self = this, installed;
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
        } else if (this.config.parsed_opts.install) {
            this.install(this.config.parsed_opts.install);
        } else if (this.config.parsed_opts.reinstall) {
            this.reinstall();
        }
    };

    handleProject(e) {
        var self = this;
        if ('kosmtik' in e.project.mml && 'plugins' in e.project.mml.kosmtik) {
            var warn = e.project.mml.kosmtik.plugins
                .filter(function(plugin) {
                    var installed = self.isInstalled(plugin);
                    if (!installed) {
                        self.install([plugin]);
                        return true;
                    }
                });
            if (warn) {
                self.config.log('Please relaunch the server to make sure all plugins are properly loaded.');
            }
        }
        e.continue();
    };
}

exports = module.exports = { PluginsManager };
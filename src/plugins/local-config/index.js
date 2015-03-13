var fs = require('fs'),
    path = require('path'),
    Localizer = require('json-localizer').Localizer;

var LocalConfig = function (config) {
    config.opts.option('localconfig', {help: 'Path to local config file [Default: {projectpath}/localconfig.json|.js]'});
    config.beforeState('project:loaded', this.patchMML);
};

LocalConfig.prototype.patchMML = function (e) {
    var filepath = this.config.parsed_opts.localconfig,
        done = function () {
            e.project.emitAndForward('localconfig:done', e);
            e.continue();
        };
    if (!filepath) {
        filepath = path.join(e.project.root, 'localconfig.json');
    }
    if (!fs.existsSync(filepath)) {
        // Do we have a js module instead?
        filepath = path.join(e.project.root, 'localconfig.js');
    }
    if (!fs.existsSync(filepath)) {
        return done();  // Nothing to do;
    }
    var l = new Localizer(e.project.mml),
        ext = path.extname(filepath);
    if (ext === '.js') {
        try {
            var UserConfig = new require(filepath).LocalConfig(l, e.project);
            console.warn('[Local Config] Patched config from', filepath);
        } catch (err) {
            console.warn('[Local Config] Unable to load local config from', filepath);
        }
        done();
    } else {
        fs.readFile(filepath, 'utf-8', function (err, data) {
            l.fromString(data);
            console.warn('[Local Config]', 'Patched config from', filepath);
            done();
        });
    }
};

exports.Plugin = LocalConfig;

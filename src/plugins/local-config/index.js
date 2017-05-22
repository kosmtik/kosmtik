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
        },
        error = function (err) {
            err.stack = null; // do not show stack trace
            console.warn('[Local Config] Unable to load local config from', filepath);
            console.error(err);
        };
    if (!filepath) {
        filepath = path.join(e.project.root, 'localconfig.json');
        if (!fs.existsSync(filepath)) {
            // Do we have a js module instead?
            filepath = path.join(e.project.root, 'localconfig.js');
        }
    }
    // path.isAbsolute is Node 0.12 only
    if (path.isAbsolute && !path.isAbsolute(filepath)) filepath = path.join(process.cwd(), filepath);
    if (!fs.existsSync(filepath)) {
        error(new Error('File not found: ' + filepath));
        return done();  // Nothing to do;
    }
    var l = new Localizer(e.project.mml),
        ext = path.extname(filepath);
    if (ext === '.js') {
        try {
            new require(filepath).LocalConfig(l, e.project);
            console.warn('[Local Config] Patched config from', filepath);
        } catch (err) {
            error(err);
        }
        done();
    } else {
        fs.readFile(filepath, 'utf-8', function (err, data) {
            if (err) error(err);
            try {
                l.fromString(data);
                console.warn('[Local Config]', 'Patched config from', filepath);
            } catch (err) {
                error(err);
            }
            done();
        });
    }
};

exports.Plugin = LocalConfig;

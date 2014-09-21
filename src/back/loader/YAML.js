var fs = require('fs'),
    util = require('util'),
    yaml = require('js-yaml'),
    BaseLoader = require('./Base.js').BaseLoader;

var Loader = function (project) {
    BaseLoader.call(this, project);
};
util.inherits(Loader, BaseLoader);

Loader.prototype.loadFile = function () {
    return yaml.safeLoad(fs.readFileSync(this.project.filepath, 'utf8'));
};

exports.Loader = Loader;

var util = require('util'),
    BaseExporter = require('./Base.js').BaseExporter,
    yaml = require('js-yaml');

var YAMLExporter = function (project, options) {
    BaseExporter.call(this, project, options);
};

util.inherits(YAMLExporter, BaseExporter);

YAMLExporter.prototype.export = function (callback) {
    callback(null, yaml.safeDump(this.project.load()));
};

exports.Exporter = YAMLExporter;

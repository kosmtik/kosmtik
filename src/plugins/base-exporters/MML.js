var util = require('util'),
    BaseExporter = require('./Base.js').BaseExporter;

var MMLExporter = function (project, options) {
    BaseExporter.call(this, project, options);
};

util.inherits(MMLExporter, BaseExporter);

MMLExporter.prototype.export = function (callback) {
    callback(null, JSON.stringify(this.project.load(), null, 4));
};

exports.Exporter = MMLExporter;

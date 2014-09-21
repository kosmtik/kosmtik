var util = require('util'),
    BaseExporter = require('./Base.js').BaseExporter;

var XMLExporter = function (project, options) {
    BaseExporter.call(this, project, options);
};

util.inherits(XMLExporter, BaseExporter);

XMLExporter.prototype.export = function (callback) {
    callback(null, this.project.render());
};

exports.Exporter = XMLExporter;

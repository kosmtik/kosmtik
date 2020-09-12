var BaseExporter = require('./Base.js').BaseExporter,
    yaml = require('js-yaml');

class YAMLExporter extends BaseExporter {
    export(callback) {
        callback(null, yaml.safeDump(this.project.load()));
    };
}

exports = module.exports = { Exporter: YAMLExporter };

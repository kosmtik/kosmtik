var BaseExporter = require('./Base.js').BaseExporter,
    yaml = require('js-yaml');

class YAMLExporter extends BaseExporter {
    export(callback) {
        callback(null, yaml.dump(this.project.load()));
    };
}

exports = module.exports = { Exporter: YAMLExporter };

var BaseExporter = require('./Base.js').BaseExporter;

class MMLExporter extends BaseExporter {
    export(callback) {
        callback(null, JSON.stringify(this.project.load(), null, 4));
    };
}

exports = module.exports = { Exporter: MMLExporter };

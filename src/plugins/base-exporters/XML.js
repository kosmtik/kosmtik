var BaseExporter = require('./Base.js').BaseExporter;

class XMLExporter extends BaseExporter {
    export(callback) {
        callback(null, this.project.render());
    };
}

exports = module.exports = { Exporter: XMLExporter};

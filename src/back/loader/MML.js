var fs = require('fs'),
    yaml = require('js-yaml'),
    BaseLoader = require('./Base.js').BaseLoader;

class Loader extends BaseLoader {
    loadFile() {
        return yaml.load(fs.readFileSync(this.project.filepath, 'utf8'));
    };
}

exports = module.exports = { Loader};

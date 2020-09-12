class BaseExporter {
    constructor(project, options) {
        this.project = project;
        this.options = options;
    };

    log() {
        console.warn.apply(console, Array.prototype.concat.apply(['[Export]'], arguments));
    };
}

exports = module.exports = { BaseExporter };
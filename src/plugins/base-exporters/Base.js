var BaseExporter = function (project, options) {
    this.project = project;
    this.options = options;
};

BaseExporter.prototype.log = function () {
    console.warn.apply(console, Array.prototype.concat.apply(['[Export]'], arguments));
};

exports.BaseExporter = BaseExporter;

var fs = require('fs'),
	path = require('path');

var BaseLoader = function (project) {
    this.project = project;
};

BaseLoader.prototype.postprocess = function () {
	var self = this;
    this.mml.Stylesheet = this.mml.Stylesheet.map(function(x) {
        if (typeof x !== 'string') {
            return { id: x, data: x.data };
        }
        return { id: x, data: fs.readFileSync(path.join(self.project.root, x), 'utf8') };
    });
    for (var i = 0; i < this.mml.Layer.length; i++) {
        this.ensureSrs(this.mml.Layer[i]);
    }
};

BaseLoader.prototype.ensureSrs = function (layer) {
    if (!layer.srs) layer.srs = this.srs;
};

BaseLoader.prototype.load = function () {
	this.mml = this.loadFile();
	this.postprocess();
	return this.mml;
};

exports.BaseLoader = BaseLoader;

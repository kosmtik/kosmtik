var util = require('util'),
    mapnik = require('mapnik'),
    BaseExporter = require('./Base.js').BaseExporter;

var PNGExporter = function (project, options) {
    BaseExporter.call(this, project, options);
};

util.inherits(PNGExporter, BaseExporter);

PNGExporter.prototype.export = function (callback) {
    var self = this;
    var map = new mapnik.Map(+this.options.width, +this.options.height);
    map.fromString(this.project.render(), {base: this.project.root}, function render (err, map) {
        var projection = new mapnik.Projection(map.srs),
            im = new mapnik.Image(+self.options.width, +self.options.height);
        map.zoomToBox(projection.forward(self.project.mml.bounds));
        map.render(im, function toImage (err, im) {
            if (err) throw err;
            im.encode(self.options.format, callback);
        });
    });
};

exports.Exporter = PNGExporter;

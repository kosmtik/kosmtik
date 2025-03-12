var mapnik = require('@mapnik/mapnik'),
    GeoUtils = require('../../back/GeoUtils.js'),
    VectorBasedTile = require('../../back/VectorBasedTile.js').Tile,
    BaseExporter = require('./Base.js').BaseExporter;

class PNGExporter extends BaseExporter {

  export(callback) {
    this.scale = this.options.scale ? +this.options.scale : 2;
    if (this.options.bounds) this.bounds = this.options.bounds.split(',').map(function (x) {return +x;});
    else this.bounds = this.project.mml.bounds;
    if (this.project.mml.source) this.renderFromVector(callback);
    else this.render(callback);
  };
  render(callback) {
    var self = this;
    var map = new mapnik.Map(+this.options.width, +this.options.height);
    map.fromString(this.project.render(), {base: this.project.root}, function render (err, map) {
      var source = new mapnik.Projection("epsg:4326"),
      var dest = new mapnik.Projection(map.srs),
      var proj_tr = new mapnik.ProjTransform(source, dest),
      var im = new mapnik.Image(+self.options.width, +self.options.height);
      map.zoomToBox(proj_tr.forward(self.bounds));
      map.render(im, {scale: self.scale}, function toImage (err, im) {
        if (err) throw err;
        im.encode(self.options.format, callback);
      });
    });
  };

    renderFromVector(callback) {
        var self = this,
            leftTop = GeoUtils.zoomLatLngToXY(this.options.zoom, this.bounds[3], this.bounds[0]),
            rightBottom = GeoUtils.zoomLatLngToXY(this.options.zoom, this.bounds[1], this.bounds[2]),
            floatLeftTop = GeoUtils.zoomLatLngToFloatXY(this.options.zoom, this.bounds[3], this.bounds[0]),
            size = self.project.tileSize() * this.scale,
            gap = [(floatLeftTop[0] - leftTop[0]) * size, (floatLeftTop[1] - leftTop[1]) * size],
            map = new mapnik.Map(+this.options.width, +this.options.height),
            data = [], processed = 0, toProcess = [],
            commit = function () {
                mapnik.blend(data, {format: 'png', width: +self.options.width, height: +self.options.height}, callback);
            };
        map.fromStringSync(this.project.render(), {base: this.project.root});
        var processTile = function (x, y) {
            var tile = new VectorBasedTile(self.options.zoom, x, y, {width: size, height: size});
            return tile.render(self.project, map, function (err, im) {
                if (err) throw err;
                im.encode('png', function (err, buffer) {
                    data.push({buffer: buffer, x: (x - leftTop[0]) * size - gap[0], y: (y - leftTop[1]) * size - gap[1]});
                    if (toProcess[++processed]) processTile.apply(this, toProcess[processed]);
                    else commit();
                });
            });
        };
        for (var x = leftTop[0]; x <= rightBottom[0]; x++) {
            for (var y = leftTop[1]; y <= rightBottom[1]; y++) {
                toProcess.push([x, y]);
            }
        }
        processTile.apply(this, toProcess[processed]);
    };
}

exports = module.exports = { Exporter: PNGExporter};

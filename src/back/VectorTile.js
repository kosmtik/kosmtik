var util = require('util'),
    mapnik = require('mapnik'),
    Tile = require('./Tile.js').Tile;

var VectorTile = function (z, x, y, options) {
    Tile.call(this, z, x, y, options);
};

util.inherits(VectorTile, Tile);

VectorTile.prototype.render = function (map, cb) {
    this.setupBounds();
    map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));
    var surface = new mapnik.VectorTile(this.z, this.x, this.y);
    return map.render(surface, {buffer_size: 0}, cb);
};

exports.Tile = VectorTile;

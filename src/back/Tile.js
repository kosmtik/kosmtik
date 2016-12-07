var mapnik = require('mapnik'),
    zoomXYToLatLng = require('./GeoUtils.js').zoomXYToLatLng;

var Tile = function (z, x, y, options) {
    options = options || {};
    var DEFAULT_HEIGHT = 256;
    var DEFAULT_WIDTH = 256;
    this.z = +z;
    this.x = +x;
    this.y = +y;
    this.projection = new mapnik.Projection(options.projection || Tile.DEFAULT_OUTPUT_PROJECTION);
    this.scale = options.scale || 1;
    this.height = options.height || options.size || DEFAULT_HEIGHT;
    this.width = options.width || options.size || DEFAULT_WIDTH;
    this.buffer_size = options.buffer_size || 0;
};

// 900913
Tile.DEFAULT_OUTPUT_PROJECTION = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over';

Tile.prototype.setupBounds = function () {
    var xy = zoomXYToLatLng(this.z, this.x * this.scale, this.y * this.scale);
    this.maxY = xy[0];
    this.minX = xy[1];
    xy = zoomXYToLatLng(this.z, this.x * this.scale + this.scale, this.y * this.scale + this.scale);
    this.minY = xy[0];
    this.maxX = xy[1];
};

Tile.prototype.render = function (project, map, cb) {
    this.setupBounds();
    map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));
    var im = new mapnik.Image(this.height, this.width);
    map.render(im, {scale: this.scale}, cb);
};

Tile.prototype.renderToVector = function (project, map, cb) {
    this.setupBounds();
    map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));
    var surface = new mapnik.VectorTile(this.z, this.x, this.y);
    map.render(surface, {buffer_size: this.buffer_size}, cb);
};

exports.Tile = Tile;

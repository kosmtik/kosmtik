var mapnik = require('mapnik'),
    zoomXYToLatLng = require('./GeoUtils.js').zoomXYToLatLng;

var Tile = function (z, x, y, options) {
    // 900913
    options = options || {};
    var DEFAULT_OUTPUT_PROJECTION = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over";
    var DEFAULT_HEIGHT = 256;
    var DEFAULT_WIDTH = 256;
    this.z = +z;
    this.x = +x;
    this.y = +y;
    this.projection = new mapnik.Projection(options.projection || DEFAULT_OUTPUT_PROJECTION);
    this.scale = options.scale || 1;
    this.height = options.height || DEFAULT_HEIGHT;
    this.width = options.width || DEFAULT_WIDTH;
    this.setupBounds();
};
Tile.prototype.setupBounds = function () {
    var xy = zoomXYToLatLng(this.z, this.x * this.scale, this.y * this.scale);
    this.maxX = xy[0];
    this.minY = xy[1];
    xy = zoomXYToLatLng(this.z, this.x * this.scale + this.scale, this.y * this.scale + this.scale);
    this.minX = xy[0];
    this.maxY = xy[1];
};
Tile.prototype.render = function (map, cb) {
    map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));
    var im = new mapnik.Image(this.height, this.width);
    return map.render(im, cb);
};
exports.Tile = Tile;

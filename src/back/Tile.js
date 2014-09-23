var mapnik = require('mapnik');

function sinh(x){
    var y = Math.exp(x);
    return (y - 1/y) / 2;
}

var Tile = function (zoom, x, y, options) {
    // 900913
    options = options || {};
    var DEFAULT_OUTPUT_PROJECTION = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over";
    var DEFAULT_HEIGHT = 256;
    var DEFAULT_WIDTH = 256;
    this.zoom = parseInt(zoom, 10);
    this.x = parseInt(x, 10);
    this.y = parseInt(y, 10);
    this.projection = new mapnik.Projection(options.projection || DEFAULT_OUTPUT_PROJECTION);
    this.scale = options.scale || 1;
    this.height = options.height || DEFAULT_HEIGHT;
    this.width = options.width || DEFAULT_WIDTH;
    this.setupBounds();
};
Tile.prototype.setupBounds = function () {
    var xy = this.zoom_x_y_to_lat_lng(this.x * this.scale, this.y * this.scale);
    this.maxX = xy[0];
    this.minY = xy[1];
    xy = this.zoom_x_y_to_lat_lng(this.x * this.scale + this.scale, this.y * this.scale + this.scale);
    this.minX = xy[0];
    this.maxY = xy[1];
};
Tile.prototype.zoom_x_y_to_lat_lng = function (x, y) {
    var n = Math.pow(2.0, this.zoom),
        lon_deg = x / n * 360.0 - 180.0,
        lat_rad = Math.atan(sinh(Math.PI * (1 - 2 * y / n))),
        lat_deg = lat_rad * 180.0 / Math.PI;
    return [lon_deg, lat_deg];
};
Tile.prototype.render = function (map, cb) {
    // console.log("render", this.minX, this.minY, this.maxX, this.maxY);
    // map.zoomAll();
    map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));
    var im = new mapnik.Image(this.height, this.width);
    return map.render(im, cb);
};
exports.Tile = Tile;

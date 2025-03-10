var mapnik = require('@mapnik/mapnik'),
    zoomXYToLatLng = require('./GeoUtils.js').zoomXYToLatLng;

class Tile {
    constructor (z, x, y, options) {
        options = options || {};
        var DEFAULT_HEIGHT = 256;
        var DEFAULT_WIDTH = 256;
        this.z = +z;
        this.x = +x;
        this.y = +y;
        this.merc = new mapnik.Projection(options.projection || 'epsg:3857' || Tile.DEFAULT_OUTPUT_PROJECTION);
        var wgs84 = new mapnik.Projection('epsg:4326');
        this.projection = new mapnik.ProjTransform(wgs84, this.merc);
        this.scale = options.scale || 1;  // When the tile coverage gets bigger (1024px…) or for metatile.
        this.mapScale = options.mapScale;  // Retina.
        this.height = options.height || options.size || DEFAULT_HEIGHT;
        this.width = options.width || options.size || DEFAULT_WIDTH;
        this.buffer_size = options.buffer_size || 0;
    };

    setupBounds() {
        var xy = zoomXYToLatLng(this.z, this.x * this.scale, this.y * this.scale);
        this.maxY = xy[0];
        this.minX = xy[1];
        xy = zoomXYToLatLng(this.z, this.x * this.scale + this.scale, this.y * this.scale + this.scale);
        this.minY = xy[0];
        this.maxX = xy[1];
    };

    render(project, map, cb) {
        this.setupBounds();
        map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));
        var im = new mapnik.Image(this.height, this.width);
        map.render(im, {scale: this.mapScale || 1, variables: {zoom: this.z}}, cb);
    };

    renderToVector(project, map, cb) {
        this.setupBounds();
        map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));
        var surface = new mapnik.VectorTile(this.z, this.x, this.y);
        map.render(surface, {buffer_size: this.buffer_size}, cb);
    };
}

// 900913
Tile.DEFAULT_OUTPUT_PROJECTION = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over';

exports = module.exports = { Tile };

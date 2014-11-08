var util = require('util'),
    mapnik = require('mapnik'),
    Tile = require('./Tile.js').Tile,
    Utils = require('./Utils.js');

var VectorBasedTile = function (z, x, y, options) {
    Tile.call(this, z, x, y, options);
};

util.inherits(VectorBasedTile, Tile);

VectorBasedTile.prototype.render = function (project, map, cb) {
    this.setupBounds();
    map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));
    var vtile = new mapnik.VectorTile(this.z, this.x, this.y),
        processed = 0,
        onResponse = function (err, resp, body) {
            if (err) return cb(err);
            try {
                vtile.setData(body);
                vtile.parse();
            } catch (error) {
                console.log(error.message);
                cb(new Error('Unable to parse vector tile data for uri ' + resp.request.uri.href));
            }
            if (++processed === project.mml.source.length) vtile.render(map, new mapnik.Image(vtile.width(),vtile.height()), cb);
        },
        params = {
            z: this.z,
            x: this.x,
            y: this.y
        };
    for (var i = 0; i < project.mml.source.length; i++) {
        var options = {
            uri: Utils.template(project.mml.source[i].url, params),
            encoding: null  // we want a buffer, not a string
        };
        project.config.helpers.request(options, onResponse);
    }
};

exports.Tile = VectorBasedTile;

var util = require('util'),
    mapnik = require('mapnik'),
    path = require('path'),
    fs = require('fs'),
    Tile = require('./Tile.js').Tile,
    Utils = require('./Utils.js'),
    zlib = require('zlib');

var VectorBasedTile = function (z, x, y, options) {
    Tile.call(this, z, x, y, options);
};

util.inherits(VectorBasedTile, Tile);

VectorBasedTile.prototype._render = function (project, map, cb) {
    this.setupBounds();
    map.zoomToBox(this.projection.forward([this.minX, this.minY, this.maxX, this.maxY]));

    //Support for overzooming
    var params = {
        z: this.z,
        x: this.x,
        y: this.y
    };
    while(params.z > project.mml.sourceMaxzoom) {
        params = {
            z: params.z - 1,
            x: Math.floor(params.x/2),
            y: Math.floor(params.y/2)
        };
    }

    var vtile = new mapnik.VectorTile(params.z, params.x, params.y),
        processed = 0,
        parse = function (err, data) {
            if (err) return cb(err);
            function done () {
                if (++processed === project.mml.source.length) cb(null, vtile);
            }
            if (!data.length) return done();
            vtile.setData(data, function(err) {
                if(err) {
                    console.log(err.message);
                    return cb(new Error('Unable to parse vector tile data for uri ' + resp.request.uri.href));
                }
                done();
            });
        };

    for (var i = 0; i < project.mml.source.length; i++) {
        var options = {
            uri: Utils.template(project.mml.source[i].url, params),
            encoding: null  // we want a buffer, not a string
        };
        this.fetch(project, options, parse);
    }
};

VectorBasedTile.prototype.fetch = function (project, options, cb) {
    var self = this,
        cachedir = project.getVectorCacheDir(),
        filepath = path.join(cachedir, options.uri.replace(/\//g, '.') + '.cache'),
        write = function (data) {
            fs.writeFile(filepath, data, function (err) {
                if (err) return cb(err);
                self.fetch(project, options, cb);
            });
        },
        onResponse = function (err, resp, body) {
            if (err) return cb(err);
            if (resp.statusCode !== 200) return cb(new Error('Unable to retrieve data from ' + resp.request.uri.href));
            var compression = false;
            if (resp.headers['content-encoding'] === 'gzip') compression = 'gunzip';
            else if (resp.headers['content-encoding'] === 'deflate') compression = 'inflate';
            else if (body && body[0] === 0x1F && body[1] === 0x8B) compression = 'gunzip';
            else if (body && body[0] === 0x78 && body[1] === 0x9C) compression = 'inflate';
            if (compression) {
                zlib[compression](body, function(err, data) {
                    if (err) return cb(err);
                    write(data);
                });
            } else {
                write(body);
            }
        };
    fs.readFile(filepath, function (err, data) {
        if (err) {
            if (err.code !== 'ENOENT') return cb(err);
            project.config.helpers.request(options, onResponse);
            return;
        }
        cb(null, data);
    });
};


VectorBasedTile.prototype.render = function (project, map, cb) {
    var self = this,
        opts = {
            buffer_size: map.bufferSize,
            z: this.z,
            x: this.x,
            y: this.y
        };
    this._render(project, map, function (err, vtile) {
        if (err) cb(err);
        else vtile.render(map, new mapnik.Image(self.width, self.height), opts, cb);
    });
};


VectorBasedTile.prototype.renderToVector = function (project, map, cb) {
    this._render(project, map, cb);
};


exports.Tile = VectorBasedTile;

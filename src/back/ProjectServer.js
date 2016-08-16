var fs = require('fs'),
    path = require('path'),
    Tile = require('./Tile.js').Tile,
    GeoUtils = require('./GeoUtils.js'),
    VectorBasedTile = require('./VectorBasedTile.js').Tile,
    MetatileBasedTile = require('./MetatileBasedTile.js').Tile,
    XRayTile = require('./XRayTile.js').Tile;
var TILEPREFIX = 'tile';

var ProjectServer = function (project, parent) {
    this.project = project;
    this.parent = parent;
    this._pollQueue = [];
    var self = this;
    this.project.when('loaded', function () {
        try {
            self.initMapPools();
            self.project.changeState('ready');
        } catch (err) {
            console.log(err.message);
            self.addToPollQueue({error: err.message});
        }
        fs.watch(self.project.root, function (type, filename) {
            if (filename) {
                if (filename.indexOf('.') === 0) return;
                self.project.config.log('File', filename, 'changed on disk');
            }
            self.addToPollQueue({isDirty: true});
        });
    });
    this.project.load();
};

ProjectServer.prototype.serve = function (uri, res) {
    var urlpath = uri.pathname,
        els = urlpath.split('/'),
        self = this;
    if (!urlpath) this.parent.redirect(this.project.getUrl(), res);
    else if (urlpath === '/') this.main(res);
    else if (urlpath === '/config/') this.config(res);
    else if (urlpath === '/poll/') this.poll(res);
    else if (urlpath === '/export/') this.export(res, uri.query);
    else if (urlpath === '/reload/') this.reload(res);
    else if (this.parent.hasProjectRoute(urlpath)) this.parent.serveProjectRoute(urlpath, uri, res, this.project);
    else if (els[1] === TILEPREFIX && els.length === 5) this.project.when('loaded', function tile () {self.serveTile(els[2], els[3], els[4], res, uri.query);});
    else if (els[1] === 'query' && els.length >= 5) this.project.when('loaded', function query () {self.queryTile(els[2], els[3], els[4], res, uri.query);});
    else if (els[1] === '.thumb.png') this.project.when('ready', function query () {self.thumb(res);});
    else this.parent.notFound(urlpath, res);
};

ProjectServer.prototype.serveTile = function (z, x, y, res, query) {
    y = y.split('.');
    var ext = y[1];
    y = y[0];
    var func;
    if (ext === 'json') func = this.jsontile;
    else if (ext === 'pbf') func = this.pbftile;
    else if (ext === 'xray') func = this.xraytile;
    else func = this.tile;
    try {
        func.call(this, z, x, y, res, query);
    } catch (err) {
        this.raise('Project not loaded properly.', res);
    }
};

ProjectServer.prototype.tile = function (z, x, y, res) {
    var self = this;
    this.mapPool.acquire(function (err, map) {
        var release = function () {self.mapPool.release(map);};
        if (err) return self.raise(err.message, res);
        var tileClass = self.project.mml.source ? VectorBasedTile : self.project.mml.metatile === 1 ? Tile : MetatileBasedTile;
        var tile = new tileClass(z, x, y, {width: self.project.tileSize(), height: self.project.tileSize(), metatile: self.project.mml.metatile});
        return tile.render(self.project, map, function (err, im) {
            if (err) return self.raise(err.message, res, release);
            im.encode('png', function (err, buffer) {
                if (err) return self.raise(err.message, res, release);
                res.writeHead(200, {'Content-Type': 'image/png', 'Content-Length': buffer.length});
                res.write(buffer);
                res.end();
                release();
            });
        });
    });
};

ProjectServer.prototype.jsontile = function (z, x, y, res, query) {
    var self = this;
    this.vectorMapPool.acquire(function (err, map) {
        var release = function () {self.vectorMapPool.release(map);};
        if (err) return self.raise(err.message, res);
        var tileClass = self.project.mml.source ? VectorBasedTile : Tile;
        var tile = new tileClass(z, x, y, {metatile: 1});
        return tile.renderToVector(self.project, map, function (err, tile) {
            if (err) return self.raise(err.message, res, release);
            var content;
            try {
                content = tile.toGeoJSON(query.layer || '__all__');
            } catch (err) {
                // This layer is not visible in this tile,
                // return an empty geojson;
                content = '{"type": "FeatureCollection", "features": []}';
            }
            if (typeof content !== 'string') content = JSON.stringify(content);  // Mapnik 3.1.0 now returns a string
            res.writeHead(200, {'Content-Type': 'application/javascript'});
            res.write(content);
            res.end();
            release();
        });
    });
};

ProjectServer.prototype.pbftile = function (z, x, y, res) {
    var self = this;
    this.vectorMapPool.acquire(function (err, map) {
        var release = function () {self.vectorMapPool.release(map);};
        if (err) return self.raise(err.message, res);
        var tileClass = self.project.mml.source ? VectorBasedTile : Tile;
        var tile = new tileClass(z, x, y, {metatile: 1});
        return tile.renderToVector(self.project, map, function (err, tile) {
            if (err) return self.raise(err.message, res, release);
            var content = tile.getData();
            res.writeHead(200, {'Content-Type': 'application/x-protobuf'});
            res.write(content);
            res.end();
            release();
        });
    });
};

ProjectServer.prototype.xraytile = function (z, x, y, res, query) {
    var self = this;
    this.vectorMapPool.acquire(function (err, map) {
        var release = function () {self.vectorMapPool.release(map);};
        if (err) return self.raise(err.message, res, release);
        var tileClass = self.project.mml.source ? VectorBasedTile : Tile;
        var tile = new tileClass(z, x, y, {metatile: 1, buffer_size: 1});
        return tile.renderToVector(self.project, map, function (err, t) {
            if (err) return self.raise(err.message, res, release);
            var xtile = new XRayTile(z, x, y, t.getData(), {layer: query.layer, background: query.background});
            xtile.render(self.project, map, function (err, im) {
                if (err) return self.raise(err.message, res, release);
                im.encode('png', function (err, buffer) {
                    if (err) return self.raise(err.message, res, release);
                    res.writeHead(200, {'Content-Type': 'image/png', 'Content-Length': buffer.length});
                    res.write(buffer);
                    res.end();
                    release();
                });
            });
        });
    });
};

ProjectServer.prototype.queryTile = function (z, lat, lon, res, query) {
    var self = this;
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    this.vectorMapPool.acquire(function (err, map) {
        var release = function () {self.vectorMapPool.release(map);};
        var xy = GeoUtils.zoomLatLngToXY(z, lat, lon),
            x = xy[0], y = xy[1];
        if (err) return self.raise(err.message, res, release);
        var tileClass = self.project.mml.source ? VectorBasedTile : Tile;
        var tile = new tileClass(z, x, y, {metatile: 1});
        return tile.renderToVector(self.project, map, function (err, t) {
            if (err) return self.raise(err.message, res, release);
            var options = {tolerance: parseInt(query.tolerance, 10) || 100};
            var results = [], layers = [];
            var doQuery = function (results, options) {
                var features = t.query(lon, lat, options);
                for (var i = 0; i < features.length; i++) {
                    results.push({
                        distance: features[i].distance,
                        layer: features[i].layer,
                        attributes: features[i].attributes()
                    });
                }
            };
            if (query.layer && query.layer !== '__all__') layers = query.layer.split(',');
            if (!layers.length) {
                doQuery(results, options);
            } else {
                for (var i = 0; i < layers.length; i++) {
                    options.layer = layers[i];
                    doQuery(results, options);
                }
            }
            res.writeHead(200, {'Content-Type': 'application/javascript'});
            res.write(JSON.stringify(results));
            res.end();
            release();
        });
    });
};

ProjectServer.prototype.thumb = function (res) {
    var thumbPath = path.join(this.project.root, '.thumb.png'),
        self = this;
    fs.exists(thumbPath, function (exists) {
        if (!exists) thumbPath = path.join(self.parent.config.root, 'src/front/logo.svg');
        self.parent.serveFile(thumbPath, res);
    });
};

ProjectServer.prototype.config = function (res) {
    res.writeHead(200, {
        'Content-Type': 'application/javascript'
    });
    var tpl = 'L.K.Config.project = %;';
    res.write(tpl.replace('%', JSON.stringify(this.project.toFront())));
    res.end();
};

ProjectServer.prototype.export = function (res, options) {
    this.project.export(options, function (err, buffer) {
        if (err) return self.raise(err.message, res);
        res.writeHead(200, {
            'Content-Disposition': 'attachment; filename: "xxxx"'
        });
        res.write(buffer);
        res.end();
    });
};

ProjectServer.prototype.main = function (res) {
    this.parent.serveHTML('front/project.html', res);
};

ProjectServer.prototype.addToPollQueue = function (message) {
    if (this._pollQueue.indexOf(message) === -1) this._pollQueue.push(message);
};

ProjectServer.prototype.raise = function (message, res, cb) {
    console.trace();
    console.log(message);
    if (message) this.addToPollQueue({error: message});
    res.writeHead(500);
    res.end();
    if (cb) cb();
};

ProjectServer.prototype.poll = function (res) {
    var data = '', len;
    if (this._pollQueue.length) {
        data = JSON.stringify(this._pollQueue);
        this._pollQueue = [];
    }
    len = Buffer.byteLength(data, 'utf8');
    res.writeHead(len ? 200 : 204, {
        'Content-Type': 'application/json',
        'Content-Length': len,
        'Cache-Control': 'private, no-cache, must-revalidate'
    });
    res.end(data);
};

ProjectServer.prototype.reload = function (res) {
    var self = this;
    try {
        this.project.reload();
    } catch (err) {
        return this.raise(err.message, res);
    }
    this.project.when('loaded', function () {
        self.mapPool.drain(function() {
            self.mapPool.destroyAllNow();
        });
        self.vectorMapPool.drain(function() {
            self.vectorMapPool.destroyAllNow();
        });
        try {
            self.initMapPools();
        } catch (err) {
            return self.raise(err.message, res);
        }
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(self.project.toFront()));
    });
};

ProjectServer.prototype.initMapPools = function () {
    var bufferSize = this.project.mml.bufferSize || 256;
    this.mapPool = this.project.createMapPool({bufferSize: bufferSize});
    this.vectorMapPool = this.project.createMapPool({size: 256, bufferSize: bufferSize});
};

exports.ProjectServer = ProjectServer;

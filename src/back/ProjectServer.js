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
        self.initMapPools();
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
    else this.parent.notFound(urlpath, res);
};

ProjectServer.prototype.serveTile = function (z, x, y, res, query) {
    y = y.split('.');
    var ext = y[1];
    y = y[0];
    if (ext === 'json') this.jsontile(z, x, y, res, query);
    else if (ext === 'pbf') this.pbftile(z, x, y, res);
    else if (ext === 'xray') this.xraytile(z, x, y, res, query);
    else this.tile(z, x, y, res);
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
            var options = {tolerance: query.tolerance || 100};
            if (query.layer && query.layer !== '__all__') options.layer = query.layer;
            var features = t.query(lon, lat, options), results = [];
            for (var i = 0; i < features.length; i++) {
                results.push({
                    distance: features[i].distance,
                    layer: features[i].layer,
                    attributes: features[i].attributes()
                });
            }
            res.writeHead(200, {'Content-Type': 'application/javascript'});
            res.write(JSON.stringify(results));
            res.end();
            release();
        });
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
    var js = this.project.config._js.reduce(function(a, b) {
        return a + '<script src="' + b + '"></script>\n';
    }, '');
    var css = this.project.config._css.reduce(function(a, b) {
        return a + '<link rel="stylesheet" href="' + b + '" />\n';
    }, '');
    fs.readFile(path.join(kosmtik.src, 'front/project.html'), {encoding: 'utf8'}, function(err, data) {
        if(err) throw err;
        data = data.replace('%%JS%%', js);
        data = data.replace('%%CSS%%', css);
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': data.length
        });
        res.end(data);
    });
};

ProjectServer.prototype.addToPollQueue = function (message) {
    if (this._pollQueue.indexOf(message) === -1) this._pollQueue.push(message);
};

ProjectServer.prototype.raise = function (message, res, cb) {
    console.log(message);
    this.addToPollQueue({error: message});
    res.writeHead(500);
    res.end();
    if (cb) cb();
};

ProjectServer.prototype.poll = function (res) {
    var data;
    if (this._pollQueue.length) {
        data = JSON.stringify(this._pollQueue);
        this._pollQueue = [];
    } else {
        data = '';
    }
    res.writeHead(data.length ? 200 : 204, {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
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
    this.mapPool = this.project.createMapPool();
    this.vectorMapPool = this.project.createMapPool({size: 256});
};

exports.ProjectServer = ProjectServer;

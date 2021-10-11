var fs = require('fs'),
    path = require('path'),
    Tile = require('./Tile.js').Tile,
    GeoUtils = require('./GeoUtils.js'),
    Utils = require('./Utils.js'),
    VectorBasedTile = require('./VectorBasedTile.js').Tile,
    MetatileBasedTile = require('./MetatileBasedTile.js').Tile,
    XRayTile = require('./XRayTile.js').Tile;
var TILEPREFIX = 'tile';

class ProjectServer {
    constructor(project, parent) {
        this.project = project;
        this.parent = parent;
        this._pollQueue = [];
        var self = this,
            onChange = function (type, filename) {
                if (filename) {
                    if (filename.indexOf('.') === 0) return;
                    self.project.config.log('File', filename, 'changed on disk');
                }
                self.addToPollQueue({isDirty: true});
            };
        this.project.when('loaded', function () {
            try {
                self.initMapPools();
            } catch (err) {
                console.log(err.message);
                self.addToPollQueue({error: err.message});
            }
            fs.watch(self.project.filepath, onChange);
            for (var style of self.project.mml.Stylesheet) {
                fs.watch(path.join(project.root, style.id), onChange);
            }
        });
        this.project.load();
    };

    serve(uri, req, res) {
        var urlpath = uri.pathname,
            els = urlpath.split('/'),
            self = this;
        if (!urlpath) this.parent.redirect(this.project.getUrl(), res);
        else if (urlpath === '/') this.main(res);
        else if (urlpath === '/config/') this.config(res);
        else if (urlpath === '/poll/') this.poll(res);
        else if (urlpath === '/export/') this.export(res, uri.query);
        else if (urlpath === '/reload/') this.reload(res);
        else if (urlpath === '/clear-vector-cache/') this.clearVectorCache(res);
        else if (this.parent.hasProjectRoute(urlpath)) this.parent.serveProjectRoute(urlpath, uri, req, res, this.project);
        else if (els[1] === TILEPREFIX && els.length === 5) this.project.when('loaded', function tile () {self.serveTile(els[2], els[3], els[4], res, uri.query);});
        else if (els[1] === 'query' && els.length >= 5) this.project.when('loaded', function query () {self.queryTile(els[2], els[3], els[4], res, uri.query);});
        else this.parent.notFound(urlpath, res);
    };

    serveTile(z, x, y, res, query) {
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

    tile(z, x, y, res) {
        var self = this,
            yels = y.split('@'),
            y = yels[0],
            scale = yels[1] ? parseInt(yels[1], 10) : 1,
            mapScale = scale * (this.project.mml.scale || 1),
            size = this.project.tileSize() * scale,  // retina?
            mapPool = scale === 2 ? this.retinaPool : this.mapPool;
        mapPool.acquire(function (err, map) {
            var release = function () {mapPool.release(map);};
            if (err) return self.raise(err.message, res);
            var tileClass = self.project.mml.source ? VectorBasedTile : self.project.metatile() === 1 ? Tile : MetatileBasedTile;
            var tile = new tileClass(z, x, y, {size: size, metatile: self.project.metatile(), mapScale: mapScale});
            return tile.render(self.project, map, function (err, im) {
                if (err) return self.raise(err.message, res, release);
                im.encode('png', (function (err, buffer) {
                    if (err) return self.raise(err.message, res, release);
                    res.writeHead(200, {'Content-Type': 'image/png', 'Content-Length': buffer.length});
                    res.write(buffer);
                    res.end();
                    release();
                }).bind(im));
            });
        });
    };

    jsontile(z, x, y, res, query) {
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
                res.writeHead(200, {'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*'});
                res.write(content);
                res.end();
                release();
            });
        });
    };

    pbftile(z, x, y, res) {
        var self = this;
        this.vectorMapPool.acquire(function (err, map) {
            var release = function () {self.vectorMapPool.release(map);};
            if (err) return self.raise(err.message, res);
            var tileClass = self.project.mml.source ? VectorBasedTile : Tile;
            try {
                var tile = new tileClass(z, x, y, {metatile: 1});
            } catch (err) {
                return self.raise(err.message, res, release);
            }
            return tile.renderToVector(self.project, map, function (err, tile) {
                if (err) return self.raise(err.message, res, release);
                var content = tile.getData();
                res.writeHead(200, {'Content-Type': 'application/x-protobuf', 'Access-Control-Allow-Origin': '*'});
                res.write(content);
                res.end();
                release();
            });
        });
    };

    xraytile(z, x, y, res, query) {
        var self = this;
        this.vectorMapPool.acquire(function (err, map) {
            var release = function () {self.vectorMapPool.release(map);};
            if (err) return self.raise(err.message, res, release);
            var tileClass = self.project.mml.source ? VectorBasedTile : Tile;
            var tile = new tileClass(z, x, y, {metatile: 1, buffer_size: 1});
            return tile.renderToVector(self.project, map, function (err, t) {
                if (err) return self.raise(err.message, res, release);
                if (t.getData().length == 0) {
                    res.writeHead(204, {'Content-Type': 'image/png', 'Content-Length': 0});
                    res.end();
                    release();
                    return;
                }
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

    queryTile(z, lat, lon, res, query) {
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

    config(res) {
        res.writeHead(200, {
            'Content-Type': 'application/javascript'
        });
        var tpl = 'L.K.Config.project = %;';
        res.write(tpl.replace('%', JSON.stringify(this.project.toFront())));
        res.end();
    };

    clearVectorCache(res) {
        var self = this;
        Utils.cleardir(this.project.getVectorCacheDir(), function (err) {
            if (err) return self.raise(err.message, res);
            res.writeHead(204, {
                'Content-Length': 0,
                'Content-Type': 'text/html'  // Firefox complains without Content-Type, even if the body is empty.
            });
            res.end();
        });
    };

    export(res, options) {
        var self = this;
        this.project.export(options, function (err, buffer) {
            if (err) return self.raise(err.message, res);
            res.writeHead(200, {
                'Content-Disposition': 'attachment; filename: "xxxx"'
            });
            res.write(buffer);
            res.end();
        });
    };

    main(res) {
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

    addToPollQueue(message) {
        if (this._pollQueue.indexOf(message) === -1) this._pollQueue.push(message);
    };

    raise(message, res, cb) {
        console.trace();
        console.log(message);
        if (message) this.addToPollQueue({error: message});
        res.writeHead(500);
        res.end();
        if (cb) cb();
    };

    poll(res) {
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

    reload(res) {
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

    initMapPools() {
        this.mapPool = this.project.createMapPool();
        this.retinaPool = this.project.createMapPool({scale: 2});
        this.vectorMapPool = this.project.createMapPool({size: 256});
    };
}

exports = module.exports = { ProjectServer };

var fs = require('fs'),
    mapnik = require('mapnik'),
    Tile = require('./Tile.js').Tile,
    path = require('path');

class MetatileBasedTile {
    constructor(z, x, y, options) {
        this.z = z;
        this.x = x;
        this.y = y;
        this.metatile = options.metatile || 1;
        this.metaX = Math.floor(x / this.metatile);
        this.metaY = Math.floor(y / this.metatile);
        this.format = options.format || 'png';
        this.size = options.size || 256;
        this.mapScale = options.mapScale || 1;
        this.options = options;
    }

    render(project, map, cb) {
        var self = this, basePath = project.getMetaCacheDir(),
            baseName = this.z + '.' + this.metaX + '.' + this.metaY + 'x' + this.mapScale,
            metaPath = path.join(basePath,  baseName + '.meta'),
            lockPath = path.join(basePath, baseName + '.lock');

        fs.readFile(metaPath, function (err, data) {
            if (err) {
                if (err.code !== 'ENOENT') return cb(err);
                fs.writeFile(lockPath, '', {flag: 'wx'}, function (err) {
                    if (err && err.code === 'EEXIST') {
                        try {
                            var watcher = fs.watch(lockPath);
                            watcher.on('change', function (event) {  // Someone else is building the metatile, keep calm and wait.
                                if (event === 'rename') { // lock has been deleted
                                    watcher.close();
                                    self.render(project, map, cb);  // Try again
                                }
                                // else just wait again
                            });
                        } catch (err) {
                            if (err.code !== 'ENOENT') return cb(err);
                        }
                    } else if (err) {
                        return cb(err);
                    } else  {
                        self.renderMetatile(metaPath, project, map, function (err, buffer) {
                            fs.unlink(lockPath, function (err2) {
                                if (err) return cb(err);
                                if (err2 && err2.code !== 'ENOENT') return cb(err2);
                                self.extractFromBytes(buffer, cb);
                            });
                        });
                    }
                });
            } else {
                self.extractFromBytes(data, cb);
            }
        });
    }

    extractFromBytes(buffer, cb) {
        var self = this;
        mapnik.Image.fromBytes(buffer, function (err, im) {
            if (err) return cb(err);
            var view = im.view(self.size * (self.x % self.metatile), self.size * (self.y % self.metatile), self.size, self.size);
            cb(null, view);
        });
    }

    renderMetatile(metaPath, project, map, cb) {
        var self = this;
        var tile = new Tile(self.z, self.metaX, self.metaY, {size: this.metatile * this.size, scale: this.metatile, mapScale: this.mapScale});
        tile.render(project, map, function (err, im) {
            if (err) return cb(err);
            im.encode(self.format, function (err, buffer) {
                if (err) return cb(err);
                fs.writeFile(metaPath, buffer, {flag: 'wx'}, function (err) {
                    if (err && err.code !== 'EEXIST') return cb(err);
                    cb(null, buffer);
                });
            });
        });
    };
}

exports = module.exports = { Tile: MetatileBasedTile };

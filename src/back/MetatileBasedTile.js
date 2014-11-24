var fs = require('fs'),
    mapnik = require('mapnik'),
    Tile = require('./Tile.js').Tile,
    path = require('path');

var MetatileBasedTile = function (z, x, y, options) {
    this.z = z;
    this.x = x;
    this.y = y;
    this.metatile = options.metatile || 1;
    this.metaX = Math.floor(x / this.metatile);
    this.metaY = Math.floor(y / this.metatile);
    this.options = options;
};

MetatileBasedTile.prototype.render = function (project, map, cb) {
    var self = this,
        metaPath = path.join(project.cachePath, this.z + '.' + this.metaX + '.' + this.metaY + '.meta'),
        lockPath = path.join(project.cachePath, this.z + '.' + this.metaX + '.' + this.metaY + '.lock');

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
                        if (err && err.code !== 'ENOENT') return cb(err);
                    }
                } else if (err && err.code !== 'EEXIST') {
                    return cb(err);
                } else  {
                    if (err) return cb(err);
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

};

MetatileBasedTile.prototype.extractFromBytes = function (buffer, cb) {
    var self = this;
    mapnik.Image.fromBytes(buffer, function (err, im) {
        if (err) return cb(err);
        var view = im.view(256 * (self.x % self.metatile), 256 * (self.y % self.metatile), 256, 256);
        cb(null, view);
    });

};

MetatileBasedTile.prototype.renderMetatile = function (metaPath, project, map, cb) {
    var self = this;
    var tile = new Tile(self.z, self.metaX, self.metaY, {size: this.options.metatile * 256, scale: this.options.metatile});
    tile.render(project, map, function (err, im) {
        if (err) return cb(err);
        im.encode('png', function (err, buffer) {
            if (err) return cb(err);
            fs.writeFile(metaPath, buffer, {flag: 'wx'}, function (err) {
                if (err && err.code !== 'EEXIST') return cb(err);
                cb(null, buffer);
            });
        });
    });
};

exports.Tile = MetatileBasedTile;

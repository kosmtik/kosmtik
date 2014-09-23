var fs = require('fs'),
    Tile = require('./Tile.js').Tile,
    TILEPREFIX = 'tiles';

var ProjectServer = function (project, parent) {
    this.project = project;
    this.parent = parent;
    var self = this;
    this.project.when('loaded', function () {
        self.mapPool = self.project.createMapPool();
    });
    this.project.load();
};

ProjectServer.prototype.serve = function (uri, res) {
    var urlpath = uri.pathname,
        els = urlpath.split('/'),
        self = this;
    if (!urlpath) this.parent.redirect(this.project.getUrl(), res);
    else if (urlpath === '/') this.main(res);
    else if (urlpath === '/options/') this.options(res);
    else if (urlpath === '/export/') this.export(res, uri.query);
    else if (els[1] === TILEPREFIX && els.length === 5) this.project.when('loaded', function tile () {self.tile(els[2], els[3], els[4], res);});
    else this.parent.notFound(urlpath, res);
};

ProjectServer.prototype.tile = function (z, x, y, res) {
    var self = this;
    this.mapPool.acquire(function (err, map) {
        if (err) throw err;
        var tile = new Tile(z, x, y, {width: self.project.tileSize(), height: self.project.tileSize(), scale: self.project.mml.metatile});
        return tile.render(map, function (err, im) {
            if (err) throw err;
            im.encode('png', function (err, buffer) {
                res.writeHead(200, {'Content-Type': 'image/png', 'Content-Length': buffer.length});
                res.write(buffer);
                res.end();
                self.mapPool.release(map);
            });
        });        
    });
};

ProjectServer.prototype.options = function (res) {
    res.writeHead(200, {
        "Content-Type": "application/javascript",
    });
    var tpl = "var project = %;";
    res.write(tpl.replace('%', JSON.stringify(this.project.toFront())));
    res.end();
};

ProjectServer.prototype.export = function (res, options) {
    this.project.export(options, function (err, buffer) {
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
    fs.readFile('src/front/project.html', {encoding: 'utf8'}, function(err, data) {
        if(err) throw err;
        data = data.replace('%%JS%%', js);
        data = data.replace('%%CSS%%', css);
        res.writeHead(200, {
            "Content-Type": 'text/html',
            "Content-Length" : data.length
        });
        res.end(data);
    });
};

exports.ProjectServer = ProjectServer;

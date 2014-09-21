var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    util = require('util'),
    ConfigEmitter = require('./ConfigEmitter.js').ConfigEmitter,
    path = require('path'),
    ProjectServer = require('./server/ProjectServer.js').ProjectServer,
    MIMES = {
        ".html" : "text/html",
        ".css" : "text/css",
        ".js" : "application/javascript",
        ".png" : "image/png",
        ".gif" : "image/gif",
        ".jpg" : "image/jpeg"
    };

var Server = function (config, root, options) {
    this.CLASSNAME = 'server';
    ConfigEmitter.call(this, config);
    this.initRoutes();
    options = options || {};
    this.projects = {};
    this.server = http.createServer();
    this.server.on('request', this.serve.bind(this));
    this.server.timeout = 0;
    this.port = options.port || 6789;
    this.root = root;

    this.emitAndForward('init');
    this.server.listen(this.port);
    this.config.log('Server started, you can browse http://127.0.0.1:' + this.port);
};

util.inherits(Server, ConfigEmitter);

Server.prototype.registerProject = function (project) {
    this.projects[project.id] = new ProjectServer(project, this);  // TODO avoid cross ref
};

Server.prototype.serve = function (req, res) {
    console.warn('[httpserver]', req.url);
    var uri = url.parse(req.url, true),
        urlpath = uri.pathname,
        els = urlpath.split('/');
    if (urlpath === '/') this.serveHome(uri, req, res);
    else if (this.hasRoute(urlpath)) this._routes[urlpath].call(this, req, res);
    else if (this.projects[els[1]]) this.forwardToProject(uri, els[1], res);
    else this.serveFile(path.join(this.root, urlpath), res);
};

Server.prototype.forwardToProject = function (uri, id, res) {
    uri.pathname = uri.pathname.replace('/' + id, '');
    this.projects[id].serve(uri, res);
};

Server.prototype.serveHome = function (uri, req, res) {
    // Go to project for now
    if (Object.keys(this.projects).length) return this.redirect(Object.keys(this.projects)[0], res);
    return this.serveFile('src/front/index.html', res);
};

Server.prototype.redirect = function (newuri, res) {
    res.writeHead(302, {"Location": newuri});
    res.end();
};

Server.prototype.serveFile = function (filepath, res) {
    var self = this,
        ext = path.extname(filepath);
    if (!MIMES[ext]) return this.notFound(filepath, res);
    fs.exists(filepath, function(exists) {
        if (exists) {
            fs.readFile(filepath, function(err, contents) {
                if(!err) {
                    res.writeHead(200, {
                        "Content-Type": MIMES[ext],
                        "Content-Length" : contents.length
                    });
                    res.end(contents);
                }
            });
        } else {
            self.notFound(filepath, res);
        }
    });
};

Server.prototype.notFound = function (filepath, res) {
    res.writeHead(404);
    res.end('Not Found: ' + filepath);
};

Server.prototype.initRoutes = function () {
    this._routes = {};
};

Server.prototype.addRoute = function (path, callback) {
    this._routes[path] = callback;
};

Server.prototype.hasRoute = function (path) {
    return !!this._routes[path];
};

Server.prototype.pushToFront = function (res, anonymous) {
    // Ugly but GOOD
    if (anonymous.name) throw 'Cannot use bridge helper with named function:' + anonymous.name;
    res.writeHead(200, {
        "Content-Type": "application/javascript",
    });
    res.write(anonymous.toString().substring(13, anonymous.toString().length - 1));
    res.end();
};

exports.Server = Server;

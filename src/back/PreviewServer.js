var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    util = require('util'),
    path = require('path'),
    ConfigEmitter = require('./ConfigEmitter.js').ConfigEmitter,
    Project = require('./Project.js').Project,
    ProjectServer = require('./ProjectServer.js').ProjectServer,
    MIMES = {
        '.html' : 'text/html',
        '.css' : 'text/css',
        '.js' : 'application/javascript',
        '.png' : 'image/png',
        '.gif' : 'image/gif',
        '.jpg' : 'image/jpeg',
        '.woff' : 'application/octet-stream',
        '.ttf' : 'application/octet-stream',
        '.svg' : 'image/svg+xml',
        '.ico' : 'image/x-icon'
    };

var PreviewServer = function (config, root, options) {
    this.CLASSNAME = 'server';
    ConfigEmitter.call(this, config);
    this.config.server = this;
    this.initRoutes();
    options = options || {};
    this.projects = {};
    this.server = http.createServer();
    this.server.on('request', this.serve.bind(this));
    this.server.timeout = 0;
    this.root = root;
    this.emitAndForward('init');
    this.config.on('command:serve', this.listen.bind(this));
};

util.inherits(PreviewServer, ConfigEmitter);

PreviewServer.prototype.listen = function () {
    if (this.config.parsed_opts.path) {
        var project = new Project(this.config, this.config.parsed_opts.path);
        this.registerProject(project);
        this.setDefaultProject(project);
    }
    this.server.listen(this.config.parsed_opts.port, this.config.parsed_opts.host);
    this.config.log('PreviewServer started, you can browse http://' + this.config.parsed_opts.host + ':' + this.config.parsed_opts.port);
    this.emitAndForward('listen');
};

PreviewServer.prototype.registerProject = function (project) {
    this.projects[project.id] = new ProjectServer(project, this);  // TODO avoid cross ref
};

PreviewServer.prototype.setDefaultProject = function (project) {
    this.defaultProject = project;
};

PreviewServer.prototype.serve = function (req, res) {
    res.on('finish', function () {
        // 204 are empty responses from poller, do not pollute
        if (this.statusCode !== 204) console.warn('[httpserver]', req.url, this.statusCode);
    });
    var uri = url.parse(req.url, true),
        urlpath = uri.pathname,
        els = urlpath.split('/');
    if (urlpath === '/') this.serveHome(uri, req, res);
    else if (this.hasRoute(urlpath)) this._routes[urlpath].call(this, req, res);
    else if (this.matchProject(els[1])) this.forwardToProject(uri, els[1], res);
    else this.serveFile(path.join(this.root, urlpath), res);
};

PreviewServer.prototype.matchProject = function (id) {
    return this.projects[id] || (this.config.userConfig.projects && this.config.userConfig.projects[id]);
};

PreviewServer.prototype.forwardToProject = function (uri, id, res) {
    if (!this.projects[id]) this.loadProjectFromConfig(id);
    uri.pathname = uri.pathname.replace('/' + id, '');
    this.projects[id].serve(uri, res);
};

PreviewServer.prototype.loadProjectFromConfig = function (id) {
    var project = new Project(this.config, this.config.userConfig.projects[id].path);
    this.registerProject(project);
};

PreviewServer.prototype.serveHome = function (uri, req, res) {
    // Go to project for now
    // if (this.defaultProject) return this.redirect(this.defaultProject.id, res);
    return this.serveHTML('front/index.html', res);
};

PreviewServer.prototype.redirect = function (newuri, res) {
    res.writeHead(302, {'Location': newuri, 'Cache-Control': 'private, no-cache, must-revalidate'});
    res.end();
};

PreviewServer.prototype.serveFile = function (filepath, res) {
    var self = this,
        ext = path.extname(filepath);
    if (!MIMES[ext]) return this.notFound(filepath, res);
    fs.exists(filepath, function(exists) {
        if (exists) {
            fs.readFile(filepath, function(err, contents) {
                if(!err) {
                    res.writeHead(200, {
                        'Content-Type': MIMES[ext],
                        'Content-Length' : contents.length
                    });
                    res.end(contents);
                }
            });
        } else {
            self.notFound(filepath, res);
        }
    });
};

PreviewServer.prototype.serveHTML = function (filepath, res) {
    var js = this.config._js.reduce(function(a, b) {
        return a + '<script src="' + b + '"></script>\n';
    }, '');
    var css = this.config._css.reduce(function(a, b) {
        return a + '<link rel="stylesheet" href="' + b + '" />\n';
    }, '');
    fs.readFile(path.join(kosmtik.src, filepath), {encoding: 'utf8'}, function(err, data) {
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

PreviewServer.prototype.notFound = function (filepath, res) {
    res.writeHead(404);
    res.end('Not Found: ' + filepath);
};

PreviewServer.prototype.initRoutes = function () {
    this._routes = {};
    this._project_routes = {};
};

PreviewServer.prototype.addRoute = function (path, callback) {
    this._routes[path] = callback;
};

PreviewServer.prototype.hasRoute = function (path) {
    return !!this._routes[path];
};

PreviewServer.prototype.addProjectRoute = function (path, callback) {
    this._project_routes[path] = callback;
};

PreviewServer.prototype.hasProjectRoute = function (path) {
    return !!this._project_routes[path];
};

PreviewServer.prototype.serveProjectRoute = function (path, uri, res, project) {
    return this._project_routes[path].call(this, uri, res, project);
};

PreviewServer.prototype.pushToFront = function (res, anonymous) {
    // Ugly but GOOD
    if (anonymous.name) throw 'Cannot use bridge helper with named function:' + anonymous.name;
    res.writeHead(200, {
        'Content-Type': 'application/javascript',
    });
    res.write(anonymous.toString().substring(13, anonymous.toString().length - 1));
    res.end();
};

exports.PreviewServer = PreviewServer;

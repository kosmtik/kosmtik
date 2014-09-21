#!/usr/bin/env node

var Config = require('./src/Config.js').Config,
    Project = require('./src/back/Project.js').Project,
    Server = require('./src/back/Server.js').Server,
    fs = require('fs');

var config = new Config();

if (config.parsed_opts[0] === "plugins") {
    if (config.parsed_opts.list) {
        console.log('Installed plugins');
        for (var i = 0; i < config.plugins.length; i++) {
            console.log(config.plugins[i]);
        }
    }
} else if (config.parsed_opts[0] === 'export' && config.parsed_opts.project) {
    var callback;
    if (config.parsed_opts.output) {
        callback = function (err, buffer) {
            fs.writeFile(config.parsed_opts.output, buffer, function done () {
                console.log('Exported project to', config.parsed_opts.output);
            });
        };
    } else {
        callback = function (err, buffer) {
            process.stdout.write(buffer);
        };
    }
    var project = new Project(config, config.parsed_opts.project),
        options = {
            format: config.parsed_opts.format,
            width: config.parsed_opts.width,
            height: config.parsed_opts.height
        };
    project.export(options, callback);
} else {
    var server = new Server(config, __dirname);
    if (config.parsed_opts[0] === 'project' && config.parsed_opts.path) {
        var project = new Project(config, config.parsed_opts.path);
        server.registerProject(project);
    }
}

#!/usr/bin/env node

var Config = require('./src/Config.js').Config,
    Project = require('./src/back/Project.js').Project,
    Server = require('./src/back/PreviewServer.js').PreviewServer,
    fs = require('fs'),
    npm = require('npm');

var config = new Config(__dirname, process.env.KOSMTIK_CONFIGPATH);
var server = new Server(config, __dirname);
config.parseOptions();

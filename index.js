#!/usr/bin/env node

var Config = require('./src/Config.js').Config,
    Project = require('./src/back/Project.js').Project,
    Server = require('./src/back/Server.js').Server,
    fs = require('fs'),
    npm = require('npm');

var config = new Config();
var server = new Server(config, __dirname);
config.parseOptions();

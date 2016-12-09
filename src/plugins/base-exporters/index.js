var fs = require('fs'),
    path = require('path'),
    _has = require('lodash.has');

var BaseExporters = function (config) {
    var self = this;
    this.parsed_opts = {};

    config.on('command:export', this.handleCommand);
    config.registerExporter('xml', path.join(__dirname, 'XML.js'));
    config.registerExporter('mml', path.join(__dirname, 'MML.js'));
    config.registerExporter('yml', path.join(__dirname, 'YAML.js'));
    config.registerExporter('yaml', path.join(__dirname, 'YAML.js'));
    config.registerExporter('png', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png8', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png24', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png32', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png256', path.join(__dirname, 'PNG.js'));
    config.addJS('/src/plugins/base-exporters/front/export.js');

    config.commands.export = config.opts.command('export <project>')
        .description('Export a project.')
        .option('--mapnik-version [version]',
            'Optional mapnik reference version to be passed to Carto.',
            config.defaultMapnikVersion())
        .option('--keep-cache',
            'Do not flush cached metatiles on project load.')
        .option('--renderer [name]',
            'Specify a renderer by its name, carto is the default.',
            'carto')
        .option('--metatile <metatile>',
            'Override mml metatile setting [Default: mml setting].')
        .option('--output <output>',
            'Filepath to save in')
        .option('--width [width]',
            'Width of the export. Default: 1000',
            parseInt,
            1000)
        .option('--height [height]',
            'Height of the export. Default: 1000',
            parseInt,
            1000)
        .option('--bounds <bbox>',
            'BBox to use in format minX,minY,maxX,maxY. Default: project extent')
        .option('--scale [scale]',
            'Scale the exported image. Default: 1',
            parseInt,
            1)
        .option('--format [format]',
            'Format of the export. Default: xml',
            function (val) {
                if (val in config.exporters) {
                    return val;
                }

                return 'xml';
            },
            'xml')
        .action(function (project, options) {
            if (_has(options, 'output')) {
                config.parsed_opts.output = options.output;
            }
            if (_has(options, 'width')) {
                config.parsed_opts.width = options.width;
            }
            if (_has(options, 'height')) {
                config.parsed_opts.height = options.height;
            }
            if (_has(options, 'bounds')) {
                config.parsed_opts.bounds = options.bounds;
            }
            if (_has(options, 'scale')) {
                config.parsed_opts.scale = options.scale;
            }
            if (_has(options, 'format')) {
                config.parsed_opts.format = options.format;
            }
            if (_has(options, 'renderer')) {
                config.parsed_opts.renderer = options.renderer;
            }
            if (_has(options, 'metatile')) {
                config.parsed_opts.metatile = options.metatile;
            }
            // since commander does not support individual variable names
            // we have to set them manually
            if (_has(options, 'mapnikVersion')) {
                config.parsed_opts.mapnik_version = options.mapnikVersion;
            }
            if (_has(options, 'keepCache')) {
                config.parsed_opts.keepcache = options.keepcache;
            }

            config.parsed_opts.project = project;
            config.parsed_opts.commandName = 'export';
    });
};

BaseExporters.prototype.handleCommand = function () {
    var self = this;
    if (this.parsed_opts.project) {
        var callback;
        if (this.parsed_opts.output) {
            callback = function (err, buffer) {
                fs.writeFile(self.parsed_opts.output, buffer, function done () {
                    console.log('Exported project to', self.parsed_opts.output);
                });
            };
        } else {
            callback = function (err, buffer) {
                process.stdout.write(buffer);
            };
        }
        var Project = require(path.join(this.root, 'src/back/Project.js')).Project,
            project = new Project(this, this.parsed_opts.project),
            options = this.parsed_opts;
        project.when('loaded', function () {
            project.export(options, callback);
        });
        project.load();
    }
};

exports.Plugin = BaseExporters;

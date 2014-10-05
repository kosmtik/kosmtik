var fs = require('fs'),
    path = require('path');

var BaseExporters = function (config) {
    config.commands.export = config.opts.command('export').help('Export a project');
    config.commands.export.option('project', {
        position: 1,
        help: 'Project to export.'
    });
    config.commands.export.option('output', {
        help: 'Filepath to save in',
        metavar: 'PATH'
    });
    config.commands.export.option('width', {
        help: 'Width of the export',
        metavar: 'INT',
        default: 1000
    });
    config.commands.export.option('height', {
        help: 'Height of the export',
        metavar: 'INT',
        default: 1000
    });
    config.commands.export.option('bbox', {
        help: 'BBox to use [Default: project extent]',
        metavar: 'minX,minY,maxX,maxY'
    });
    config.commands.export.option('scale', {
        help: 'Scale the exported image',
        metavar: 'INT',
        default: 1
    });
    config.on('command:export', this.handleCommand);
    config.registerExporter('xml', path.join(__dirname, 'XML.js'));
    config.registerExporter('mml', path.join(__dirname, 'MML.js'));
    config.registerExporter('png', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png8', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png24', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png32', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png256', path.join(__dirname, 'PNG.js'));
    config.on('parseopts', this.parseOpts);
    config.addJS('/src/plugins/base-exporters/front/export.js');
};

BaseExporters.prototype.parseOpts = function (e) {
    this.commands.export.option('format', {
        help: 'Format of the export',
        metavar: 'FORMAT',
        default: 'xml',
        choices: Object.keys(this.exporters)
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
            options = {
                format: this.parsed_opts.format,
                width: this.parsed_opts.width,
                height: this.parsed_opts.height
            };
        project.export(options, callback);
    }
};

exports.Plugin = BaseExporters;

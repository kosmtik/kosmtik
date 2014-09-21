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
    config.registerExporter('xml', path.join(__dirname, 'XML.js'));
    config.registerExporter('png', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png8', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png24', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png32', path.join(__dirname, 'PNG.js'));
    config.registerExporter('png256', path.join(__dirname, 'PNG.js'));
    config.on('parseopts', this.parseOpts);
    config.addJS('/src/plugins/base-exporters/front/tab.js');
};

BaseExporters.prototype.parseOpts = function (e) {
    this.commands.export.option('format', {
        help: 'Format of the export',
        metavar: 'FORMAT',
        default: 'xml',
        choices: Object.keys(this.exporters)
    });
};

exports.Plugin = BaseExporters;

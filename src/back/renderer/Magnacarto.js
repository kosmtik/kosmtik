var Magnacarto = require('magnacarto'),
    semver = require('semver');


var mc = function (project) {
    this.project = project;
};

mc.prototype.render = function () {
    var opts = {
            baseDir: this.project.root,
        },
        mapnikVersion = this.project.mml.mapnik_version || this.project.config.parsed_opts.mapnik_version,
        mml = '';

    if (semver.gte(mapnikVersion, '3.0.0')) opts.builderType = 'mapnik3';
    else opts.builderType = 'mapnik2';

    if (typeof this.project.mml === 'object') mml = JSON.stringify(this.project.mml);
    else mml = this.project.mml;

    this.project.config.log('Using mapnik version', mapnikVersion);
    return new Magnacarto(opts).buildFromString(mml);

};

exports.Magnacarto = mc;

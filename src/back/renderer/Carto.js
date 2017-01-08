var carto = require('@mapbox/carto');


var Carto = function (project) {
    this.project = project;
};

Carto.prototype.render = function () {
    var env = {
            filename: this.project.filepath,
            local_data_dir: this.project.root,
            validation_data: { fonts: this.project.mapnik.fonts() },
            returnErrors: true,
            effects: []
        },
        options = {
            mapnik_version: this.project.mml.mapnik_version || this.project.config.parsed_opts.mapnik_version
        };
    this.project.config.log('Using mapnik version', options.mapnik_version);
    return new carto.Renderer(env, options).render(this.project.mml);

};

exports.Renderer = Carto;

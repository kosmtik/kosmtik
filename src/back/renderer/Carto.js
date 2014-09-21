var carto = require('carto');


var Carto = function (project) {
    this.project = project;
};

Carto.prototype.render = function () {

    return new carto.Renderer({
        filename: this.project.filepath,
        local_data_dir: this.project.root,
        validation_data: { fonts: this.project.mapnik.fonts() },
        returnErrors: true,
        effects: []
    }).render(this.project.mml);

};

exports.Carto = Carto;

var carto = require('carto');

class Carto {
    constructor(project) {
        this.project = project;
    }

    render() {
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
        var output = new carto.Renderer(env, options).render(this.project.mml);
    
        if (output.msg) {
            output.msg.forEach(function (v) {
                if (v.type === 'error') {
                    console.error(carto.Util.getMessageToPrint(v));
                }
                else if (v.type === 'warning') {
                    console.warn(carto.Util.getMessageToPrint(v));
                }
            });
        }
    
        return output.data;
    };
};

exports = module.exports = { Renderer: Carto };

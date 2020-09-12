var mapnik = require('mapnik'),
    Utils = require('./Utils.js'),
    fs = require('fs'),
    path = require('path'),
    crypto = require('crypto');

class XRayTile {
    constructor(z, x, y, data, options) {
        this.z = +z;
        this.x = +x;
        this.y = +y;
        this.data = data;
        this.options = options || {};
    };

    render(project, map, cb) {
        var styleMap = this.styleMap(project),
            vtile = new mapnik.VectorTile(this.z, this.x, this.y);
        if (this.data.length){
            vtile.setData(this.data, function(err) {
                if(err) {
                    console.log(err.message);
                    return cb(err);
                }
                vtile.render(styleMap, new mapnik.Image(256, 256), cb);  
            });
        }
    };

    styleMap(project) {
        var self = this,
            map = new mapnik.Map(256, 256),
            idx = 0,
            chosenLayers = (self.options.layer) ? self.options.layer.split(',') : [],
            layers = project.mml.Layer.reduce(function (prev, layer) {
                if (chosenLayers.length && chosenLayers.indexOf(layer.id) === -1) return prev;
                if (idx >= XRayTile.colors.length) idx = 0;
                return prev + Utils.template(XRayTile.layerTemplate, {id: layer.id, rgb: XRayTile.colors[idx++]});
            }, ''),
            xml = Utils.template(XRayTile.mapTemplate, {layers: layers || '', bg: this.options.background || '#000000'});
        map.fromStringSync(xml);
        return map;
    };

    stringToRGB(s) {
        var hash = crypto.createHash('md5').update(s).digest('hex').slice(0, 3);
        return [hash.charCodeAt(0) + 100, hash.charCodeAt(1) + 100, hash.charCodeAt(2) + 100].join(',');
    };
}

XRayTile.mapTemplate = fs.readFileSync(path.join(__dirname, 'xray', 'map.xml'), 'utf8');
XRayTile.layerTemplate = fs.readFileSync(path.join(__dirname, 'xray', 'layer.xml'), 'utf8');
XRayTile.colors = [
    '218,223,225', '217,30,24', '102,51,153', '68,108,179', '247,202,24', '38,166,91', '78,205,196', '219,10,91', '232,126,4', '135,211,124'
];

exports = module.exports = { Tile: XRayTile };

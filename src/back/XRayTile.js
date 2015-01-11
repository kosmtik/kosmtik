var util = require('util'),
    mapnik = require('mapnik'),
    Utils = require('./Utils.js'),
    fs = require('fs'),
    path = require('path'),
    crypto = require('crypto');

var XRayTile = function (z, x, y, data, options) {
    this.z = +z;
    this.x = +x;
    this.y = +y;
    this.data = data;
    this.options = options || {};
};

XRayTile.prototype.render = function (project, map, cb) {
    var self = this,
        styleMap = this.styleMap(project),
        vtile = new mapnik.VectorTile(this.z, this.x, this.y);
    vtile.setData(this.data);
    vtile.parse();
    vtile.render(styleMap, new mapnik.Image(256, 256), cb);
};

XRayTile.prototype.styleMap = function (project) {
    var self = this,
        map = new mapnik.Map(256, 256),
        idx = 0,
        chosenLayers = (self.options.layer)? self.options.layer.split(',') : [],
        layers = project.mml.Layer.reduce(function (prev, layer) {
            if (chosenLayers.length && chosenLayers.indexOf(layer.id) === -1) return prev;
            if (idx >= XRayTile.colors.length) idx = 0;
            return prev + Utils.template(XRayTile.layer_template, {id: layer.id, rgb: XRayTile.colors[idx++]});
        }, ''),
        xml = Utils.template(XRayTile.map_template, {layers: layers || '', bg: this.options.background || '#000000'});
    map.fromStringSync(xml);
    return map;
};

XRayTile.prototype.stringToRGB = function (s) {
    var hash = crypto.createHash('md5').update(s).digest('hex').slice(0,3);
    return [hash.charCodeAt(0) + 100, hash.charCodeAt(1) + 100, hash.charCodeAt(2) + 100].join(',')
}

XRayTile.map_template = fs.readFileSync(path.join(__dirname, 'xray', 'map.xml'), 'utf8');
XRayTile.layer_template = fs.readFileSync(path.join(__dirname, 'xray', 'layer.xml'), 'utf8');
XRayTile.colors = [
    '218,223,225', '217,30,24', '102,51,153', '68,108,179', '247,202,24', '38,166,91', '78,205,196', '219,10,91', '232,126,4', '135,211,124'
];


exports.Tile = XRayTile;

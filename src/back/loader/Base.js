var fs = require('fs'),
    path = require('path'),
    url = require('url');

var BaseLoader = function (project) {
    this.project = project;
};

BaseLoader.prototype.postprocess = function () {
    this.mml.metatile = +(this.mml.metatile || this.mml.source ? 1 : 2);  // Default vectortiles to 1, classic to 2.
    if (this.mml.Stylesheet) {
        this.mml.Stylesheet = this.mml.Stylesheet.map(this.normalizeStylesheet.bind(this));
    }
    if (this.mml.styles) {
        this.mml.Stylesheet = (this.mml.Stylesheet || []).concat(this.mml.styles.map(this.normalizeStylesheet.bind(this)));
    }
    if (!this.mml.Layer) this.mml.Layer = [];
    if (this.mml.layers) {
        this.mml.Layer = (this.mml.Layer || []).concat(this.mml.layers.map(this.expandLayerName.bind(this)));
    }
    this.mml.Layer = this.mml.Layer.map(this.normalizeLayer);
    if (this.mml.source) {
        if (typeof this.mml.source === 'string') this.mml.source = this.mml.source.split(this.mml.source_separator || ',');
        this.mml.source = this.mml.source.map(this.normalizeSource);
    }
    // Do not hardcode me, hombre!
    if (!this.mml.srs) this.mml.srs = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
};

BaseLoader.prototype.normalizeLayer = function (layer) {
    if (!layer.srs) layer.srs = this.srs;
    if (!layer.name) layer.name = layer.id;
    return layer;
};

BaseLoader.prototype.normalizeSource = function (source) {
    if (typeof source === 'string') {
        var uri = url.parse(source);
        // Since 0.12, url.parse escapes unwise chars in URL, but we need
        // to keep the variables, like {x}, {y} as is.
        uri.href = uri.href.replace(/%7B/g, '{').replace(/%7D/g, '}');
        source = {
            protocol: uri.protocol
        };
        if (source.protocol === 'tmsource:') {
            source.path = uri.path;
        } else if (source.protocol.indexOf('http') === 0) {
            source.tilejson = uri.href;
        } else if (source.protocol.indexOf('tms') === 0) {
            source.url = uri.href.replace(/^tms/, 'http');
        }
    }
    return source;
};

BaseLoader.prototype.expandLayerName = function (name) {
    var className = '';
    if (name.indexOf('.') !== -1) {
        var els = name.split('.');
        name = els[0];
        className = els[1];
    }
    return {id: name, 'class': className};
};

BaseLoader.prototype.normalizeStylesheet = function (style) {
    if (typeof style !== 'string') {
        return { id: style.id, data: style.data };
    }
    return { id: style, data: fs.readFileSync(path.join(this.project.root, style), 'utf8') };
};

BaseLoader.prototype.load = function () {
    this.mml = this.loadFile();
    this.postprocess();
    return this.mml;
};

exports.BaseLoader = BaseLoader;

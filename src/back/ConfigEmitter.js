var util = require('util'),
    StateBase = require('./StateBase.js').StateBase;

var ConfigEmitter = function (config) {
    StateBase.call(this);
    this.config = config;
};

util.inherits(ConfigEmitter, StateBase);

ConfigEmitter.prototype.emitAndForward = function (type, e) {
    this.emit(type, e);
    e = e || {};
    e[this.CLASSNAME] = this;
    type = this.CLASSNAME + ':' + type;
    StateBase.prototype.emit.call(this.config, type, e);
};

exports.ConfigEmitter = ConfigEmitter;

var StateBase = require('./StateBase.js').StateBase;

class ConfigEmitter extends StateBase {
    constructor(config) {
        super();
        this.config = config;
    }

    emitAndForward(type, e) {
        this.emit(type, e);
        e = e || {};
        e[this.CLASSNAME] = this;
        type = this.CLASSNAME + ':' + type;
        StateBase.prototype.emit.call(this.config, type, e);
    };
}

exports = module.exports = exports = { ConfigEmitter };
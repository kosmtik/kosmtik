var EventEmitter = require('events').EventEmitter;

class StateBase extends EventEmitter {
    constructor() {
        super();
        this._state_before = {};
        this._state_to_process = {};
        this._state_after = {};
        this._state_done = {};
    };

    beforeState (type, listener) {
        this._state_before[type] = this._state_before[type] || [];
        this._state_before[type].push(listener);
    };

    changeState(type, e) {
        this._state_done[type] = false;
        var done = function () {
            this._state_done[type] = true;
            if (this._state_after[type]) {
                for (var i = 0; i < this._state_after[type].length; i++) {
                    this._state_after[type][i]();
                }
            }
            delete this._state_after[type];
        }.bind(this);
        e = e || {};
        e.continue = function () {
            if(this._state_to_process[type]) {
                listeners[listeners.length - this._state_to_process[type]--].call(this, e);
            } else {
                done();
            }
        }.bind(this);
        e[this.CLASSNAME] = this;
        var listeners = this._state_before[type] || [],
            configType = this.CLASSNAME + ':' + type;
        if (this.config && this.config._state_before[configType]) listeners = listeners.concat(this.config._state_before[configType] || []);
        if (!this._state_to_process[type]) {
            this._state_to_process[type] = listeners.length;
            e.continue();
        }
    };

    when(type, callback) {
        if (this._state_done[type]) callback();
        else this.afterState(type, callback);
    };

    afterState(type, callback) {
        this._state_after[type] = this._state_after[type] || [];
        this._state_after[type].push(callback);
    };
}

exports = module.exports = { StateBase };
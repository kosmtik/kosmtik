var util = require('util'),
    events = require('events');

var StateBase = function () {
    events.EventEmitter.call(this);
    this._state_before = {};
    this._state_processed = {};
    this._state_after = {};
    this._state_done = {};
};

util.inherits(StateBase, events.EventEmitter);


StateBase.prototype.beforeState = function (type, listener) {
    this._state_before[type] = this._state_before[type] || [];
    this._state_before[type].push(listener);
};

StateBase.prototype.changeState = function (type, e) {

    var done = function () {
        this._state_done[type] = true;
        if (this._state_after[type]) {
            for (var i = 0; i < this._state_after[type].length; i++) {
                this._state_after[type][i]();
            }
        }
        delete this._state_after[type];
    }.bind(this);
    e = e || {};
    e.start = function () {
        this._state_processed[type]++;
    }.bind(this);
    e.end = function () {
        this._state_processed[type]--;
        if (!this._state_processed[type] && !to_process) done();
    }.bind(this);
    e[this.CLASSNAME] = this;
    var listeners = this._state_before[type] || [],
        configType = this.CLASSNAME + ':' + type;
    if (this.config && this.config._state_before[configType]) listeners = listeners.concat(this.config._state_before[configType] || []);
    var to_process = listeners.length;  // rename me
    if (listeners && !this._state_processed[type]) {
        this._state_processed[type] = 0;
        e.start();
        for (var i = 0; i < listeners.length; i++) {
            to_process--;
            listeners[i].call(this, e);
        }
        e.end();
    }

};

StateBase.prototype.when = function (type, callback) {
    if (this._state_done[type]) callback();
    else this._state_after[type] ? this._state_after[type].push(callback) : this._state_after[type] = [callback];
};

exports.StateBase = StateBase;


// config.beforeState('project:loaded', myfunc)
// project.beforeState('loaded', myfunc)

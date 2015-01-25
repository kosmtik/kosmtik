var util = require('util'),
    events = require('events');

var StateBase = function () {
    events.EventEmitter.call(this);
    this._state_before = {};
    this._state_to_process = {};
    this._state_after = {};
    this._state_done = {};
};

util.inherits(StateBase, events.EventEmitter);


StateBase.prototype.beforeState = function (type, listener) {
    this._state_before[type] = this._state_before[type] || [];
    this._state_before[type].push(listener);
};

StateBase.prototype.changeState = function (type, e) {

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

StateBase.prototype.when = function (type, callback) {
    if (this._state_done[type]) callback();
    else this.afterState(type, callback);
};

StateBase.prototype.afterState = function (type, callback) {
    this._state_after[type] = this._state_after[type] || [];
    this._state_after[type].push(callback);
};

exports.StateBase = StateBase;


// config.beforeState('project:loaded', myfunc)
// project.beforeState('loaded', myfunc)

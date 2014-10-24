var request = require('request');

var Helpers = function (config) {
    this.config = config;
};

Helpers.prototype.request = function (options, callback) {
    if(this.config.parsed_opts.proxy) options.proxy = this.config.parsed_opts.proxy;
    return request(options, callback);
};

exports.Helpers = Helpers;

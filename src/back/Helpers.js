var request = require('request'),
    kosmtikPackage = require('../../package'),
    version = kosmtikPackage.version;


var Helpers = function (config) {
    this.config = config;
};

Helpers.prototype.request = function (options, callback) {
    if(this.config.parsed_opts.proxy) options.proxy = this.config.parsed_opts.proxy;
    if(!options.headers) options.headers = {};
    options.headers["User-Agent"] = "kosmtik " + version;
    return request(options, callback);
};

exports.Helpers = Helpers;

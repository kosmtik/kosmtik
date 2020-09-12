var request = require('request'),
    version = require('../../package').version;

class Helpers {
    constructor(config) {
        this.config = config;
    }

    request(options, callback) {
        if(this.config.parsed_opts.proxy) options.proxy = this.config.parsed_opts.proxy;
        if(!options.headers) options.headers = {};
        options.headers['User-Agent'] = 'kosmtik ' + version;
        return request(options, callback);
    };
}

exports = module.exports = { Helpers };

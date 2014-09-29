var Config = require('../src/Config.js').Config,
    assert = require('assert');

describe('#Config()', function () {

    it('should initialize user config even without configpath', function () {
        var config = new Config(__dirname);
        assert(config.userConfig);
    });

    it('should initialize user config even with wrong configpath', function () {
        var config = new Config(__dirname, 'xxx/yyy');
        assert(config.userConfig);
    });

});

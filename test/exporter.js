var Config = require('../src/Config.js').Config,
    Project = require('../src/back/Project.js').Project,
    fs = require('fs'),
    assert = require('assert');

describe('#XML()', function () {

    it('should export in XML', function () {
        var config = new Config(__dirname, 'config.yml'),
            project = new Project(config, 'test/data/minimalist-project.mml');
        project.load();
        project.export({format: 'xml'}, function (err, data) {
            assert.equal(data + '\n', fs.readFileSync('test/data/minimalist-project.xml', 'utf8'));
        });
    });

});

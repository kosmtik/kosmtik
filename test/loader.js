var Config = require('../src/Config.js').Config,
    Project = require('../src/back/Project.js').Project,
    assert = require('assert');

describe('#MML()', function () {

    it('can load an MML file', function () {
        var config = new Config(__dirname, 'config.yml'),
            project = new Project(config, 'test/data/minimalist-project.mml');
        project.load();
        assert(project.mml);
        assert.equal(project.mml.name, 'ProjectName');
    });

});

describe('#YAML()', function () {

    it('can load a YAML file', function () {
        var config = new Config(__dirname, 'test/data/config.yml'),
            project = new Project(config, 'test/data/minimalist-project.yml');
        project.load();
        assert(project.mml);
        assert.equal(project.mml.name, 'ProjectName');
    });

});

var Config = require('../src/Config.js').Config,
    Project = require('../src/back/Project.js').Project;

function preWarmTheFontCache() {
    var config = new Config(__dirname, 'config.yml');
    new Project(config, 'test/data/minimalist-project.mml');
}


exports.mochaGlobalSetup = function() {
    preWarmTheFontCache();
};
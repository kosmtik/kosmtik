var Config = require('../src/Config.js').Config,
    Project = require('../src/back/Project.js').Project,
    Tile = require('../src/back/Tile.js').Tile,
    fs = require('fs'),
    assert = require('assert'),
    mapnik = require('mapnik');

describe('#Tile()', function () {
    var config, project, map;

    before(function () {
        config = new Config(__dirname);
        project = new Project(config, 'test/data/world/project.yml');
        map = new mapnik.Map(256, 256);
        project.render();
        map.fromStringSync(project.xml, {base: project.root});
    });

    describe('#render()', function () {

        it('should render a PNG of the world', function (done) {
            var tile = new Tile(0, 0, 0);
            tile.render(project, map, function (err, im) {
                if (err) throw err;
                im.encode('png', function (err, buffer) {
                    if (err) throw err;
                    assert.deepEqual(buffer, fs.readFileSync('test/data/expected/tile.world.0.0.0.png'));
                    done();
                });
            });
        });

        it('should render a PNG of Hispaniola', function (done) {
            var tile = new Tile(6, 19, 28);
            tile.render(project, map, function (err, im) {
                if (err) throw err;
                im.encode('png', function (err, buffer) {
                    if (err) throw err;
                    assert.deepEqual(buffer, fs.readFileSync('test/data/expected/tile.world.6.19.28.png'));
                    done();
                });
            });
        });

    });

    describe('#renderToVector()', function () {

        it('should render a GeoJSON', function (done) {
            var tile = new Tile(6, 19, 28);
            tile.renderToVector(project, map, function (err, vtile) {
                if (err) throw err;
                assert.equal(vtile.toGeoJSON('__all__'), fs.readFileSync('test/data/expected/tile.world.6.19.28.geojson'));
                done();
            });
        });

        it('should render a PBF', function (done) {
            var tile = new Tile(6, 19, 28);
            tile.renderToVector(project, map, function (err, vtile) {
                if (err) throw err;
                assert.deepEqual(vtile.getData(), fs.readFileSync('test/data/expected/tile.world.6.19.28.pbf'));
                done();
            });
        });

    });

});

var GeoUtils = require('../src/back/GeoUtils.js'),
    assert = require('assert');

describe('#zoomLatLngToXY()', function () {

    it('0/-85/-179.9999 lat should return 0/0', function () {
        assert.deepEqual(GeoUtils.zoomLatLngToXY(0, -85, -179.99978348919964), [0, 0]);
    });

});

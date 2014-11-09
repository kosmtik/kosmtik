var Utils = require('../src/back/Utils.js'),
    assert = require('assert');

describe('#tree()', function () {

    it('should retrieve dir tree', function () {
        var files = Utils.tree('./test/data/tree');
        assert.deepEqual(
            files.map(function (x) {return x.path;}),
            [
                'test/data/tree/afile.txt',
                'test/data/tree/subdir',
                'test/data/tree/subdir/anotherfile.js',
                'test/data/tree/subdir/anothersubdir',
                'test/data/tree/subdir/anothersubdir/yetafile.csv' ]);
    });

});

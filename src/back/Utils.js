var fs = require('fs'),
    path = require('path');

module.exports = {

    mkdirs: function (dirpath, callback) {
        fs.mkdir(dirpath, function (err) {
            if (err && err.code === 'ENOENT') module.exports.mkdirs(path.dirname(dirpath), function () {module.exports.mkdirs(dirpath, callback)});
            else if (err && err.code !== 'EEXIST') callback(err);
            else callback();
        })
    },

    sinh: function (x) {
        var y = Math.exp(x);
        return (y - 1/y) / 2;
    }

};

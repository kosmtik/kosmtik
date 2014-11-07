var fs = require('fs'),
    path = require('path');

module.exports = {

    mkdirs: function (dirpath, callback) {
        fs.mkdir(dirpath, function (err) {
            if (err && err.code === 'ENOENT') module.exports.mkdirs(path.dirname(dirpath), function () {module.exports.mkdirs(dirpath, callback);});
            else if (err && err.code !== 'EEXIST') callback(err);
            else callback();
        });
    },

    sinh: function (x) {
        var y = Math.exp(x);
        return (y - 1/y) / 2;
    },

    template: function (str, data) {
        return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
            var value = data[key];
            if (value === undefined) {
                throw new Error('No value provided for variable ' + str);
            } else if (typeof value === 'function') {
                value = value(data);
            }
            return value;
        });
    },

};

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

    cleardir: function (dirpath, callback) {
        var files = [], i = 0;
        try {
            files = module.exports.tree(dirpath);
        } catch (err) {
            if (err && err.code !== 'ENOENT') callback(err);
        }
        function loop (err) {
            if (err) return callback(err);
            var file = files[i++];
            if (!file) return callback();
            if (file.stat.isFile()) fs.unlink(file.path, loop);
        }
        loop();
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

    tree: function(dir) {
        var results = [];
        var list = fs.readdirSync(dir);
        list.forEach(function(file) {
            file = path.join(dir, file);
            try {
                var stat = fs.statSync(file);
            } catch (e) {
                // Dead link?
                return;
            }
            results.push({path: file, stat: stat});
            if (stat && stat.isDirectory()) results = results.concat(module.exports.tree(file));
        });
        return results;
    }

};

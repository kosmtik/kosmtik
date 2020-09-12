var fs = require('fs'),
    path = require('path');

function mkdirs(dirpath, callback) {
    fs.mkdir(dirpath, function (err) {
        if (err && err.code === 'ENOENT') mkdirs(path.dirname(dirpath), function () { mkdirs(dirpath, callback); });
        else if (err && err.code !== 'EEXIST') callback(err);
        else callback();
    });
}

function cleardir(dirpath, callback) {
    var files = [], i = 0;
    try {
        files = tree(dirpath);
    } catch (err) {
        if (err && err.code !== 'ENOENT') callback(err);
    }
    function loop(err) {
        if (err) return callback(err);
        var file = files[i++];
        if (!file) return callback();
        if (file.stat.isFile()) fs.unlink(file.path, loop);
    }
    loop();
}

function sinh(x) {
    var y = Math.exp(x);
    return (y - 1 / y) / 2;
}

function template(str, data) {
    return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
        var value = data[key];
        if (value === undefined) {
            throw new Error('No value provided for variable ' + str);
        } else if (typeof value === 'function') {
            value = value(data);
        }
        return value;
    });
}

function tree(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        try {
            var stat = fs.statSync(file);
        } catch (e) {
            // Dead link?
            return;
        }
        results.push({ path: file, stat: stat });
        if (stat && stat.isDirectory()) results = results.concat(tree(file));
    });
    return results;
}

exports = module.exports = {
    mkdirs,
    cleardir,
    sinh,
    template,
    tree
};
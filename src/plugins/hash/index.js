var Hash = function (config) {
    config.addJS('/node_modules/leaflet-hash/leaflet-hash.js');
    config.addJS('/hash.js');
    config.on('server:init', this.attachRoutes.bind(this));
};

Hash.prototype.extendMap = function (req, res) {

    var front = function () {
        L.K.Map.addInitHook(function () {
            this.whenReady(function () {
                this.hash = new L.Hash(this);
            });
        });
    };
    this.pushToFront(res, front);
};

Hash.prototype.attachRoutes = function (e) {
    e.server.addRoute('/hash.js', this.extendMap);
};

exports.Plugin = Hash;

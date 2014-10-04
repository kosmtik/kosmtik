var Hash = function (config) {
    config.addJS('/node_modules/leaflet-hash/leaflet-hash.js');
    config.addJS('/hash.js');
    config.on('server:init', this.attachRoutes.bind(this));
};

Hash.prototype.extendMap = function (req, res) {

    var front = function () {
        L.K.Map.addInitHook(function () {
            this.hash = new L.Hash(this);
            if (this.hash.parseHash(location.hash)) {
                this.hash.update();  // Do not wait for first setTimeout;
            } else {
                if (L.K.Config.project) this.setView(L.K.Config.project.center, L.K.Config.project.zoom);
                else console.error('Missing center and zoom in project config');
            }
        });
    };
    this.pushToFront(res, front);
};

Hash.prototype.attachRoutes = function (e) {
    e.server.addRoute('/hash.js', this.extendMap);
};

exports.Plugin = Hash;

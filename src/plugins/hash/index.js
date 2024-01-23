class Hash {
    constructor(config) {
        config.addJS('/node_modules/leaflet-hash/leaflet-hash.js');
        config.addJS('/hash.js');
        config.on('server:init', this.attachRoutes.bind(this));
    };

    extendMap(req, res) {

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

    attachRoutes(e) {
        e.server.addRoute('/hash.js', this.extendMap);
    };
}

exports = module.exports = { Plugin: Hash };

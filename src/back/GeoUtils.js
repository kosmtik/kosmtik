var sinh = require('./Utils.js').sinh;

module.exports = {

    zoomXYToLatLng: function (z, x, y) {
        var n = Math.pow(2.0, z),
            lon_deg = x / n * 360.0 - 180.0,
            lat_rad = Math.atan(sinh(Math.PI * (1 - 2 * y / n))),
            lat_deg = lat_rad * 180.0 / Math.PI;
        return [lon_deg, lat_deg];
    },

    zoomLatLngToXY: function (z, lat, lng) {
        var xy = module.exports.zoomLatLngToFloatXY(z, lat, lng);
        return [Math.floor(xy[0]), Math.floor(xy[1])];
    },

    zoomLatLngToFloatXY: function (z, lat, lng) {
        var n = Math.pow(2.0, z),
            lat_rad = lat / 180.0 * Math.PI,
            y = (1.0 - Math.log(Math.tan(lat_rad) + (1 / Math.cos(lat_rad))) / Math.PI) / 2.0 * n,
            x = ((lng + 180.0) / 360.0) * n;
        return [x, y];
    }

};

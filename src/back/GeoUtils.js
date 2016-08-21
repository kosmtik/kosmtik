var sinh = require('./Utils.js').sinh;

module.exports = {

    zoomXYToLatLng: function (z, x, y) {
        var n = Math.pow(2.0, z),
            lonDeg = x / n * 360.0 - 180.0,
            latRad = Math.atan(sinh(Math.PI * (1 - 2 * y / n))),
            latDeg = latRad * 180.0 / Math.PI;
        return [latDeg, lonDeg];
    },

    zoomLatLngToXY: function (z, lat, lng) {
        var xy = module.exports.zoomLatLngToFloatXY(z, lat, lng);
        return [Math.floor(xy[0]), Math.floor(xy[1])];
    },

    zoomLatLngToFloatXY: function (z, lat, lng) {
        var n = Math.pow(2.0, z),
            latRad = lat / 180.0 * Math.PI,
            y = (1.0 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2.0 * n,
            x = ((lng + 180.0) / 360.0) * n;
        return [x, y];
    }

};

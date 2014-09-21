L.Kosmtik = L.K = {};


/*************/
/*   Utils   */
/*************/
L.Kosmtik.buildQueryString = function (params) {
    var query_string = [];
    for (var key in params) {
        query_string.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    }
    return query_string.join('&');
};

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

L.Kosmtik.Xhr = {

    _ajax: function (settings) {
        var xhr = new window.XMLHttpRequest();
        xhr.open(settings.verb, settings.uri, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                settings.callback.call(settings.context || xhr, xhr.status, xhr.responseText, xhr);
            }
        };
        xhr.send(settings.data);
    },

    get: function(uri, options) {
        options.verb = 'GET';
        options.uri = uri;
        L.K.Xhr._ajax(options);
    },

    post: function(uri, options) {
        options.verb = 'POST';
        options.uri = uri;
        L.K.Xhr._ajax(options);
    }

};

L.Kosmtik.Poll = L.Class.extend({

    includes: [L.Mixin.Events],

    initialize: function (uri) {
        this.uri = uri;
        this.delay = 1000;
    },

    poll: function () {
        L.K.Xhr.get(this.uri, {
            callback: this.polled,
            context: this
        });
    },

    polled: function (status, data) {
        if (status === 304 || !data) return this.loop(1);
        if (status !== 200) return this.onError({status: status, error: data});
        try {
            data = JSON.parse(data);
        } catch (err) {
            return this.onError({error: err});
        }
        for (var i = 0; i < data.length; i++) {
            this.fire('message', data[i]);
        }
        this.loop(1);
    },

    onError: function (e) {
        this.fire('error', e);
        this.loop(this.delay + 1);
    },

    loop: function (delay) {
        this.delay = delay;
        this._id = window.setTimeout(L.bind(this.poll, this), this.delay * 1000);
    },

    start: function () {
        this.loop(1);
        return this;
    },

    stop: function () {
        if (this._id) {
            window.clearTimeout(this._id);
            this._id = null;
        }
        return this;
    }

});

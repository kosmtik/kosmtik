
L.Kosmtik.Autocomplete = L.Evented.extend({

    options: {
        placeholder: 'Start typing…',
        emptyMessage: 'No result',
        minChar: 3,
        submitDelay: 300
    },

    CACHE: '',
    RESULTS: [],
    KEYS: {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        TAB: 9,
        RETURN: 13,
        ESC: 27,
        APPLE: 91,
        SHIFT: 16,
        ALT: 17,
        CTRL: 18
    },

    initialize: function (container, options) {
        this.container = container;
        L.setOptions(this, options);

        this.options = L.Util.extend(this.options, options);
        var CURRENT = null;

        try {
            Object.defineProperty(this, 'CURRENT', {
                get: function () {
                    return CURRENT;
                },
                set: function (index) {
                    if (typeof index === 'object') {
                        index = this.resultToIndex(index);
                    }
                    CURRENT = index;
                }
            });
        } catch (e) {
            // Hello IE8 and monsters
        }

        this.createInput();
        this.createResultsContainer();
    },

    createInput: function () {
        this.input = L.DomUtil.create('input', 'k-autcomplete-input', this.container);
        this.input.type = 'text';
        this.input.placeholder = this.options.placeholder;
        this.input.autocomplete = 'off';
        L.DomEvent.disableClickPropagation(this.input);

        L.DomEvent.on(this.input, 'keydown', this.onKeyDown, this);
        L.DomEvent.on(this.input, 'keyup', this.onKeyUp, this);
        L.DomEvent.on(this.input, 'blur', this.onBlur, this);
        L.DomEvent.on(this.input, 'focus', this.onFocus, this);
    },

    createResultsContainer: function () {
        this.resultsContainer = L.DomUtil.create('ul', 'k-autocomplete-results', document.querySelector('body'));
    },

    resizeContainer: function() {
        var l = this.getLeft(this.input);
        var t = this.getTop(this.input) + this.input.offsetHeight;
        this.resultsContainer.style.left = l + 'px';
        this.resultsContainer.style.top = t + 'px';
        var width = this.options.width ? this.options.width : this.input.offsetWidth - 2;
        this.resultsContainer.style.width = width + 'px';
    },

    onKeyDown: function (e) {
        switch (e.keyCode) {
            case this.KEYS.TAB:
                if(this.CURRENT !== null)
                {
                    this.setChoice();
                }
                L.DomEvent.stop(e);
                break;
            case this.KEYS.RETURN:
                L.DomEvent.stop(e);
                this.setChoice();
                break;
            case this.KEYS.ESC:
                L.DomEvent.stop(e);
                this.hide();
                this.input.blur();
                break;
            case this.KEYS.DOWN:
                if(this.RESULTS.length > 0) {
                    if(this.CURRENT !== null && this.CURRENT < this.RESULTS.length - 1) {
                        this.CURRENT++;
                        this.highlight();
                    }
                    else if(this.CURRENT === null) {
                        this.CURRENT = 0;
                        this.highlight();
                    }
                }
                L.DomEvent.stop(e);
                break;
            case this.KEYS.UP:
                if(this.CURRENT !== null) {
                    L.DomEvent.stop(e);
                }
                if(this.RESULTS.length > 0) {
                    if(this.CURRENT > 0) {
                        this.CURRENT--;
                        this.highlight();
                    }
                    else if(this.CURRENT === 0) {
                        this.CURRENT = null;
                        this.highlight();
                    }
                }
                break;
        }
    },

    onKeyUp: function (e) {
        var special = [
            this.KEYS.TAB,
            this.KEYS.RETURN,
            this.KEYS.LEFT,
            this.KEYS.RIGHT,
            this.KEYS.DOWN,
            this.KEYS.UP,
            this.KEYS.APPLE,
            this.KEYS.SHIFT,
            this.KEYS.ALT,
            this.KEYS.CTRL
        ];
        if (special.indexOf(e.keyCode) === -1)
        {
            if (typeof this.submitDelay === 'number') {
                window.clearTimeout(this.submitDelay);
                delete this.submitDelay;
            }
            this.submitDelay = window.setTimeout(L.Util.bind(this.typeahead, this), this.options.submitDelay);
        }
    },

    onBlur: function (e) {
        this.fire('blur');
        var self = this;
        setTimeout(function () {
            self.hide();
        }, 100);
    },

    onFocus: function (e) {
        this.fire('focus');
        this.input.select();
    },

    clear: function () {
        this.RESULTS = [];
        this.CURRENT = null;
        this.CACHE = '';
        this.resultsContainer.innerHTML = '';
    },

    hide: function() {
        this.fire('hide');
        this.clear();
        this.resultsContainer.style.display = 'none';
    },

    setChoice: function (choice) {
        choice = choice || this.RESULTS[this.CURRENT];
        if (choice) {
            this.hide();
            this.input.value = '';
            this.fire('selected', {choice: choice});
            if (this.options.callback) this.options.callback(choice);
        }
    },

    typeahead: function() {
        var val = this.input.value;
        if (val.length < this.options.minChar) {
            this.clear();
            return;
        }
        if(!val) {
            this.clear();
            return;
        }
        if( val + '' === this.CACHE + '') {
            return;
        }
        else {
            this.CACHE = val;
        }
        this.fire('typeahead', {value: val});
    },

    _formatResult: function (item, el) {
        var name = L.DomUtil.create('strong', '', el),
            detailsContainer = L.DomUtil.create('small', '', el);
        name.innerHTML = item.name;
        if (item.description) detailsContainer.innerHTML = item.description;
    },

    formatResult: function (item, el) {
        return (this.options.formatResult || this._formatResult).call(this, item, el);
    },

    createResult: function (item, index) {
        var el = L.DomUtil.create('li', '', this.resultsContainer);
        if (!item.html) this.formatResult(item, el);
        else el.innerHTML = el.html;
        item.el = el;
        L.DomEvent.on(el, 'mouseover', function (e) {
            this.CURRENT = index;
            this.highlight();
        }, this);
        L.DomEvent.on(el, 'mousedown', function (e) {
            this.setChoice();
        }, this);
        return item;
    },

    resultToIndex: function (result) {
        var out = null;
        this.forEach(this.RESULTS, function (item, index) {
            if (item === result) {
                out = index;
                return;
            }
        });
        return out;
    },

    handleResults: function(items) {
        var self = this;
        this.clear();
        this.resultsContainer.style.display = 'block';
        this.resizeContainer();
        this.forEach(items, function (item, index) {
            self.RESULTS.push(self.createResult(item, index));
        });
        if (items.length === 0) {
            var noresult = L.DomUtil.create('li', 'k-autocomplete-no-result', this.resultsContainer);
            noresult.innerHTML = this.options.emptyMessage;
        }
        this.CURRENT = 0;
        this.highlight();
    },

    highlight: function () {
        var self = this;
        this.forEach(this.RESULTS, function (item, index) {
            if (index === self.CURRENT) {
                L.DomUtil.addClass(item.el, 'on');
            }
            else {
                L.DomUtil.removeClass(item.el, 'on');
            }
        });
    },

    getLeft: function (el) {
        var tmp = el.offsetLeft;
        el = el.offsetParent;
        while(el) {
            tmp += el.offsetLeft;
            el = el.offsetParent;
        }
        return tmp;
    },

    getTop: function (el) {
        var tmp = el.offsetTop;
        el = el.offsetParent;
        while(el) {
            tmp += el.offsetTop;
            el = el.offsetParent;
        }
        return tmp;
    },

    forEach: function (els, callback) {
        Array.prototype.forEach.call(els, callback);
    }

});

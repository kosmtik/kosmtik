L.Kosmtik.ExportFormatChooser = L.FormBuilder.SelectAbstract.extend({

    getOptions: function () {
        return L.K.Config.exportFormats.map(function (item) {
            return [item, item];
        });
    }

});

L.K.Map.addInitHook(function () {
    this.whenReady(function () {
        var container = L.DomUtil.create('div', 'export-container'),
            title = L.DomUtil.create('h3', '', container);
        var params = {
            format: 'png',
            width: 1000,
            height: 1000
        };
        var builder = new L.K.FormBuilder(params, [
            ['format', {handler: L.Kosmtik.ExportFormatChooser, helpText: 'Choose the export format'}],
            'width',
            'height'
        ]);
        container.appendChild(builder.build());
        var submit = L.DomUtil.create('a', 'button', container);
        submit.innerHTML = 'Export map';
        L.DomEvent
            .on(submit, 'click', L.DomEvent.stop)
            .on(submit, 'click', function () {
                var win = window.open('./export/?' + L.K.buildQueryString(params));
            });
        title.innerHTML = 'Export';
        this.sidebar.addTab({
            label: 'Export',
            content: container
        });
        this.sidebar.rebuild();
    });
});

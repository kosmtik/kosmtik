L.Kosmtik.ExportFormatChooser = L.FormBuilder.Select.extend({

    getOptions: function () {
        return L.K.Config.exportFormats.map(function (item) {
            return [item, item];
        });
    }

});

L.K.Map.addInitHook(function () {
    this.whenReady(function () {
        var container = L.DomUtil.create('div', 'export-container'),
            title = L.DomUtil.create('h3', '', container),
            formContainer = L.DomUtil.create('div', '', container);
        title.innerHTML = 'Export';
        var params = {
            format: 'png',
            width: 1000,
            height: 1000
        };
        var elementDefinitions = {
            width: ['width', {handler: 'IntInput', helpText: 'Width of the export, in px.'}],
            height: ['height', {handler: 'IntInput', helpText: 'Height of the export, in px.'}]
        };
        var editableParams = {
            'xml': [],
            'mml': []
        };
        var buildForm = function () {
            var elements = [
                ['format', {handler: L.K.ExportFormatChooser, helpText: 'Choose the export format', callback: buildForm}],
            ];
            var extraElements = editableParams[params.format] || ['width', 'height'];
            for (var i = 0; i < extraElements.length; i++) {
                elements.push(elementDefinitions[extraElements[i]]);
            }
            var builder = new L.K.FormBuilder(params, elements);
            formContainer.innerHTML = '';
            formContainer.appendChild(builder.build());
        };
        buildForm();
        var submit = L.DomUtil.create('a', 'button', container);
        submit.innerHTML = 'Export map';
        L.DomEvent
            .on(submit, 'click', L.DomEvent.stop)
            .on(submit, 'click', function () {
                var win = window.open('./export/?' + L.K.buildQueryString(params));
            });
        this.sidebar.addTab({
            label: 'Export',
            content: container
        });
        this.sidebar.rebuild();
    });
});

var Version = function (config) {
    config.on('command:version', this.handleCommand.bind(this, config.version));
};

Version.prototype.handleCommand = function (version) {
    console.log('Kosmtik version', version);
};

exports.Plugin = Version;

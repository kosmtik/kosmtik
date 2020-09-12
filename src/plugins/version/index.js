class Version {
    constructor(config) {
        config.on('command:version', this.handleCommand.bind(this, config.version));
    }

    handleCommand(version) {
        console.log('Kosmtik version', version);
    }
}

exports = { Plugin: Version };

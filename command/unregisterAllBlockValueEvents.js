var util = require('util');
var Command = require('../command');

var UnregisterAllBlockValueEventsCommand = function() {
    Command.call(this);
    this.code = 'q';
};

util.inherits(UnregisterAllBlockValueEventsCommand, Command);

UnregisterAllBlockValueEventsCommand.prototype.encode = function() {
    return new Buffer([
        this.code.charCodeAt(0)
    ]);
};

module.exports = UnregisterAllBlockValueEventsCommand;

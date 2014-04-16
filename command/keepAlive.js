var util = require('util');
var Command = require('../command');

var KeepAliveCommand = function() {
    Command.call(this);
    this.code = 'a;'
};

util.inherits(KeepAliveCommand, Command);

KeepAliveCommand.prototype.encode = function() {
    return new Buffer([
        this.code.charCodeAt(0)
    ]);
};

module.exports = KeepAliveCommand;

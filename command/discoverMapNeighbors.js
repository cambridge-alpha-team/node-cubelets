var util = require('util');
var Command = require('../command');

var DiscoverMapNeighborsCommand = function() {
	Command.call(this);
    this.code = 'm';
};

util.inherits(DiscoverMapNeighborsCommand, Command);

DiscoverMapNeighborsCommand.prototype.encode = function() {
	return new Buffer([
		this.code.charCodeAt(0)
	]);
};

module.exports = DiscoverMapNeighborsCommand;
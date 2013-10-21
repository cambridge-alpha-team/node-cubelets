var util = require('util');
var Command = require('../command');
var Encoder = require('../encoder');

var SetDefaultBlockValueCommand = function(id) {
	this.id = id;
	Command.call(this);
};

util.inherits(SetDefaultBlockValueCommand, Command);

SetDefaultBlockValueCommand.prototype.encode = function() {
	var encodedID = Encoder.encodeID(this.id);
	return new Buffer([
		't'.charCodeAt(0),
		0x0,
		encodedID.readUInt8(0),
		encodedID.readUInt8(1),
		encodedID.readUInt8(2)
	]);
};

module.exports = SetDefaultBlockValueCommand;
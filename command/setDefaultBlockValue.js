var util = require('util');
var Command = require('../command');
var Encoder = require('../encoder');

var SetDefaultBlockValueCommand = function(id) {
	Command.call(this);
	this.code = 't';
	this.id = id;
};

util.inherits(SetDefaultBlockValueCommand, Command);

SetDefaultBlockValueCommand.prototype.encode = function() {
	var encodedID = Encoder.encodeID(this.id);
	return new Buffer([
		this.code.charCodeAt(0),
		0x0,
		encodedID.readUInt8(0),
		encodedID.readUInt8(1),
		encodedID.readUInt8(2)
	]);
};

module.exports = SetDefaultBlockValueCommand;
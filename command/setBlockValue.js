var util = require('util');
var Command = require('../command');
var Encoder = require('../encoder');

var SetBlockValueCommand = function(id, value) {
	Command.call(this);
	this.code = 's';
	this.id = id;
	this.value = value;
};

util.inherits(SetBlockValueCommand, Command);

SetBlockValueCommand.prototype.encode = function() {
	var encodedID = Encoder.encodeID(this.id);
	return new Buffer([
		this.code.charCodeAt(0),
		this.value,
		encodedID.readUInt8(0),
		encodedID.readUInt8(1),
		encodedID.readUInt8(2)
	]);
};

module.exports = SetBlockValueCommand;
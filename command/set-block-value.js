var util = require('util');
var Command = require('../command');
var Encoder = require('../encoder');

var SetBlockValueCommand = function(id, value) {
	this.id = id;
	this.value = value;
	Command.call(this);
};

util.inherits(SetBlockValueCommand, Command);

SetBlockValueCommand.prototype.encode = function() {
	var encodedID = Encoder.encodeID(this.id);
	return new Buffer([
		's'.charCodeAt(0),
		this.value,
		encodedID.readUInt8(0),
		encodedID.readUInt8(1),
		encodedID.readUInt8(2)
	]);
};

module.exports = SetBlockValueCommand;
var util = require('util');
var Command = require('../command');
var Encoder = require('../encoder');

var BlinkLEDCommand = function(id, LED) {
	Command.call(this);
	this.code = 'e';
	this.id = id;
	this.LED = LED;
};

util.inherits(BlinkLEDCommand, Command);

BlinkLEDCommand.prototype.encode = function() {
	var encodedID = Encoder.encodeID(this.id);
	return new Buffer([
		(this.code).charCodeAt(0),
		(this.LED ? 'v' : 'z').charCodeAt(0),
		encodedID.readUInt8(0),
		encodedID.readUInt8(1),
		encodedID.readUInt8(2)
	]);
};

module.exports = BlinkLEDCommand;
var util = require('util');
var Command = require('../command');
var Encoder = require('../encoder');

var RegisterBlockValueEventCommand = function(id) {
    Command.call(this);
    this.code = 'b';
    this.id = id;
};

util.inherits(RegisterBlockValueEventCommand, Command);

RegisterBlockValueEventCommand.prototype.encode = function() {
    var encodedID = Encoder.encodeID(this.id);
    return new Buffer([
        this.code.charCodeAt(0),
        encodedID.readUInt8(0),
        encodedID.readUInt8(1),
        encodedID.readUInt8(2)
    ]);
};

module.exports = RegisterBlockValueEventCommand;

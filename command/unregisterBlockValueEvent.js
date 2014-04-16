var util = require('util');
var Command = require('../command');
var Encoder = require('../encoder');

var UnregisterBlockValueEventCommand = function(id) {
    Command.call(this);
    this.code = 'u';
    this.id = id;
};

util.inherits(UnregisterBlockValueEventCommand, Command);

UnregisterBlockValueEventCommand.prototype.encode = function() {
    var encodedID = Encoder.encodeID(this.id);
    return new Buffer([
        this.code.charCodeAt(0),
        encodedID.readUInt8(0),
        encodedID.readUInt8(1),
        encodedID.readUInt8(2)
    ]);
};

module.exports = UnregisterBlockValueEventCommand;

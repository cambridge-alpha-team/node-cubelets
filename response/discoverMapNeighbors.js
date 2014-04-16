var util = require('util');
var Response = require('../response');
var Decoder = require('../decoder');

var DiscoverMapNeighborsResponse = function(data, type) {
    this.map = [];
    Response.call(this, data, type);
};

util.inherits(DiscoverMapNeighborsResponse, Response);

DiscoverMapNeighborsResponse.prototype.decode = function() {
    this.map = Decoder.decodeMap(this.data);
};

module.exports = DiscoverMapNeighborsResponse;

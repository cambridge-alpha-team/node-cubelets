var util = require('util');
var events = require('events');
var async = require('async');
var MockConnection = require('../connection/mock');
var __ = require('underscore');

var Scanner = function() {
    events.EventEmitter.call(this);
    this.scan = function(callback) {
        var scanner = this;
        var connections = {
            'Cubelet-RGB': new MockConnection(),
            'Cubelet-CCC': new MockConnection()
        };
        for (var name in connections) {
            scanner.emit('pass', connections[name], name, { mock: true });
        }
        scanner.emit('fail', new Error('Mocking a scan failure.'), null, name);
        scanner.emit('complete', null, __(connections).values());
        if (callback) {
            callback(null, __(connections).values());
        }
    };
};

util.inherits(Scanner, events.EventEmitter);
module.exports = Scanner;

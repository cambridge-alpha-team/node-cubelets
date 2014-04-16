var util = require('util');
var events = require('events');
var Parser = require('../parser');
var Encoder = require('../encoder');
var cubelets = require('../index');

var Connection = function(config) {
    events.EventEmitter.call(this);
    var connection = this;
    var parser = null;
    var isOpen = false;
    this.open = function(callback) {
        if (isOpen) {
            if (callback) {
                callback(null);
            }
            return;
        }
        parser = new Parser();
        parser.on('response', function(response) {
            connection.emit('response', response);
        });
        isOpen = true;
        connection.emit('open');
        if (callback) {
            callback(null);
        }
    };
    this.close = function(callback) {
        isOpen = false;
        if (parser) {
            parser.removeAllListeners('response');
            parser = null;
        }
        connection.emit('close');
        if (callback) {
            callback(null);
        }
    };
    this.isOpen = function() {
        return isOpen;
    };
    this.isClosed = function() {
        return !isOpen;
    };
    this.postCommand = function(command, callback) {
        if (!isOpen) {
            if (callback) {
                callback(new Error('Connection not open.'));
            }
            return;
        }
        console.log('Command:', command);
        connection.write(command.encode(), callback);
        setTimeout(function() {
            function respond(code, data) {
                var message = Buffer.concat([new Buffer([
                    '<'.charCodeAt(0), code.charCodeAt(0), data.length, '>'.charCodeAt(0)
                ]), data]);
                parser.parse(message);
            }
            if (command instanceof cubelets.DiscoverMapNeighborsCommand) {
                respond('n', Buffer.concat([
                    Encoder.encodeID(1),
                    Encoder.encodeID(2),
                    Encoder.encodeID(3),
                    Encoder.encodeID(4),
                    Encoder.encodeID(5),
                    Encoder.encodeID(6),
                    Encoder.encodeID(7)
                ]));
            }
        }, 1000);
    };
    this.write = function(data, callback) {
        if (!isOpen) {
            if (callback) {
                callback(new Error('Connection not open.'));
            }
            return;
        }
        console.log(JSON.stringify(data));
    };
    this.getStream = function() {
        return {};
    };
};

util.inherits(Connection, events.EventEmitter);
module.exports = Connection;
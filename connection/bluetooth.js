var util = require('util');
var events = require('events');
var BluetoothSerialPort = require('bluetooth-serial-port').BluetoothSerialPort;
var Parser = require('../parser');

var Connection = function(config) {
    events.EventEmitter.call(this);
    var address = config['address'];
    var channel = config['channel'];
    var connection = this;
    var parser = null;
    var serialPort = null;
    var isOpen = false;
    this.open = function(callback) {
        if (isOpen) {
            if (callback) {
                callback(null);
            }
            return;
        }
        serialPort = new BluetoothSerialPort();
        serialPort.connect(address, channel, function() {
            parser = new Parser();
            parser.on('response', function(response) {
                connection.emit('response', response);
            });
            serialPort.on('data', function(data) {
                parser.parse(data);
            });
            serialPort.on('failure', function(error) {
                connection.emit('error', error);
                connection.close();
            });
            isOpen = true;
            connection.emit('open');
            if (callback) {
                callback(null);
            }
        }, function(error) {
            isOpen = false;
            connection.emit('error', error);
            if (callback) {
                callback(error);
            }
        });
    };
    this.close = function(callback) {
        isOpen = false;
        if (!serialPort) {
            connection.emit('close');
            if (callback) {
                callback(null);
            }
            return;
        }
        serialPort.removeAllListeners('data');
        serialPort.removeAllListeners('failure');
        serialPort.close();
        serialPort = null;
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
        connection.write(command.encode(), callback);
    };
    this.write = function(data, callback) {
        if (!isOpen) {
            if (callback) {
                callback(new Error('Connection not open.'));
            }
            return;
        }
        if (typeof callback !== 'function') {
            callback = function() {} // Callback is *required* for write()
        }
        serialPort.write(data, function(error, bytesWritten) {
            if (error) {
                connection.emit('error', error);
                callback(error);
            }
            else {
                callback(error, bytesWritten);
            }
        });
    };
    this.getStream = function() {
        return serialPort;
    };
};

util.inherits(Connection, events.EventEmitter);
module.exports = Connection;
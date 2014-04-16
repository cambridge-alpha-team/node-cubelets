var util = require('util');
var events = require('events');
var SerialPort = require('serialport').SerialPort;
var Parser = require('../parser');
var Response = require('../response');

var Connection = function(config) {
    events.EventEmitter.call(this);
    var path = config['path'] || ((process.platform === 'win32') ?
        'COM1' : '/dev/cu.Cubelet-RGB-AMP-SPP');
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
        isOpen = false;
        serialPort = new SerialPort(path, {}, false);
        serialPort.open(function(error) {
            if (error) {
                connection.emit('error', error);
                if (callback) {
                    callback(error);
                }
                return;
            }
            serialPort.on('error', function(error) {
                connection.emit('error', error);
            });
            parser = new Parser();
            parser.on('response', function(response) {
                connection.emit('response', response);
            });
            serialPort.on('data', function(data) {
                parser.parse(data);
            });
            serialPort.on('end', function() {
                connection.close();
            });
            serialPort.on('close', function(error) {
                if (error) {
                    connection.emit('error', error);
                }
                connection.close();
            });
            isOpen = true;
            connection.emit('open');
            if (callback) {
                callback(null);
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
        var closingSerialPort = serialPort;
        serialPort = null;
        closingSerialPort.drain(function(error) {
            if (error) {
                connection.emit('error', error);
                if (callback) {
                    callback(error);
                }
                return;
            }
            setTimeout(function() {
                closingSerialPort.close(function(error) {
                    closingSerialPort.removeAllListeners('data');
                    closingSerialPort.removeAllListeners('end');
                    closingSerialPort.removeAllListeners('close');
                    closingSerialPort.removeAllListeners('error');
                    closingSerialPort = null;
                    if (parser) {
                        parser.removeAllListeners('response');
                        parser = null;
                    }
                    if (error) {
                        connection.emit('error', error);
                        if (callback) {
                            callback(error);
                        }
                        return;
                    }
                    connection.emit('close');
                    if (callback) {
                        callback(null);
                    }
                });
            }, 5000); // Hack to workaround serialport closing issues
        });
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
        serialPort.write(command.encode(), callback);
    };
    this.write = function(data, callback) {
        if (isOpen) {
            serialPort.write(data, callback);
        }
    };
    this.getStream = function() {
        return serialPort;
    };
};

util.inherits(Connection, events.EventEmitter);
module.exports = Connection;
var util = require('util');
var events = require('events');
var async = require('async');
var SerialPort = require('serialport');
var SerialConnection = require('../connection/serial');
var KeepAliveCommand = require('../command/keepAlive');
var Responses = require('../config.json')['responses'];

var Scanner = function() {
    events.EventEmitter.call(this);
    this.scan = function(callback) {
        var scanner = this;
        SerialPort.list(function(error, devices) {
            if (error) {
                if (callback) {
                    callback(error);
                }
                return;
            }
            var connections = [];
            switch (process.platform) {
                case 'darwin':
                case 'linux':
                    // Filter devices by name
                    devices = devices.filter(function(device) {
                        return (device.comName && device.comName.indexOf('Cubelet') !== -1)
                    });
                    break;
            }
            var tasks = devices.map(function(device) {
                return function(callback) {
                    process.nextTick(function() {
                        var config = {
                            path: device.comName
                        };
                        var name = (function() {
                            var regex = /(.*)(Cubelet-[A-Za-z]*)(.*)/;
                            var match = regex.exec(device.comName);
                            return match.length >= 2 ? match[2] : 'Cubelet';
                        })();
                        var connection = new SerialConnection(config);
                        scanner.emit('probe', connection, name, config);
                        function ignoreError() { /* ignore errors */ }
                        connection.on('error', ignoreError);
                        connection.open(function(error) {
                            if (error) {
                                scanner.emit('fail', error, connection, name);
                                connection.removeListener('error', ignoreError);
                                callback(null);
                            }
                            else {
                                var timer = setTimeout(function() {
                                    var error = new Error('Timed out waiting for keep alive response.');
                                    connection.removeListener('response', detectResponse);
                                    connection.removeListener('error', ignoreError);
                                    scanner.emit('fail', error, connection, name);
                                    connection.close();
                                    callback(error);
                                }, 2000);
                                function detectResponse(response) {
                                    if (response.type == Responses.KEEP_ALIVE) {
                                        clearTimeout(timer);
                                        connection.removeListener('response', detectResponse);
                                        connection.removeListener('error', ignoreError);
                                        connections.push(connection);
                                        scanner.emit('pass', connection, name, config);
                                        connection.close();
                                        callback(null);
                                    }
                                }
                                connection.on('response', detectResponse);
                                connection.postCommand(new KeepAliveCommand());
                            }
                        });
                    });
                }
            });
            async.parallel(tasks, function(error) {
                if (error) {
                    scanner.emit('complete', error, connections);
                    if (callback) {
                        callback(error, connections);
                    }
                }
                else {
                    scanner.emit('complete', null, connections);
                    if (callback) {
                        callback(null, connections);
                    }
                }
            });
        });
    };
};

util.inherits(Scanner, events.EventEmitter);
module.exports = Scanner;

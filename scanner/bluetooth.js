var util = require('util');
var events = require('events');
var async = require('async');
var BluetoothSerialPort = require('bluetooth-serial-port').BluetoothSerialPort;
var BluetoothConnection = require('../connection/bluetooth');

var Scanner = function() {
    events.EventEmitter.call(this);
    this.scan = function(callback) {
        var scanner = this;
        var connections = [];
        var serialPort = new BluetoothSerialPort();
        serialPort.on('found', function(address, name) {
            beginScan();
            console.log('Found ' + name);
            if (name.indexOf('Cubelet') !== -1) {
                serialPort.findSerialPortChannel(address, function(channel) {
                    var config = {
                        address: address,
                        channel: channel
                    };
                    var connection = new BluetoothConnection(config);
                    scanner.emit('pass', connection, name, config);
                    connections.push(connection);
                    endScan();
                });
            }
            else {
                scanner.emit('fail', new Error('Not named like a Moss Brain.'), null, name);
                endScan();
            }
        });
        var isFinished = false;
        var isComplete = false;
        var numberScanning = 0;
        function beginScan() {
            numberScanning++;
        }
        serialPort.on('finished', function() {
            isFinished = true;
            setTimeout(function() {
                complete();
            }, 1000);
        });
        function endScan() {
            numberScanning--;
            if (isFinished) {
                complete();
            }
        }
        function complete() {
            if (isFinished && !isComplete && numberScanning === 0) {
                isComplete = true;
                scanner.emit('complete', null, connections);
                if (callback) {
                    callback(null, connections)
                }
            }
        }
        serialPort.inquire();
    };
};

util.inherits(Scanner, events.EventEmitter);
module.exports = Scanner;

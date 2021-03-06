var events = require('events');
var util = require('util');
var async = require('async');
var Hash = require('hashish');
var ResponseParser = require('./parser');
var ResponseTypes = require('./config.json')['responses'];
var Encoder = require('./encoder');
var Decoder = require('./decoder');

// Flash targets
var Targets = {
  PIC:'pic',
  AVR:'avr'
};

var FlashLoader = function(cubelet, stream, encoding) {
  
  events.EventEmitter.call(this);

  // Origin cubelet in construction
  this.cubelet = cubelet;

  // Create a new response parser
  var parser = new ResponseParser(encoding);

  // Begin parsing responses
  stream.on('data', function(data) {
    parser.parse(data);
  });

  var emitter = this;

  var version = cubelet.currentFirmwareVersion;
  var capabilities = {
    'reset': (version >= 3.1)
  };

  this.load = function(program, cubelet) {
    // Ensure program is valid
    if (!program.valid) {
      emitter.emit('error', new Error('Invalid program.'));
      return;
    }

    // Check that cubelet exists
    if (!cubelet) {
      emitter.emit('error', new Error('No cubelet.'));
      return;
    }

    // Check that cubelet has a valid target MCU
    var target = cubelet.mcu;
    if (!Hash(Targets).detect(function(value) { return value === target })) {
      emitter.emit('error', new Error('Unknown flash target \'' + target + '\'.'));
      return;
    }

    // Parellelizes two tasks
    function parallel(tasks) {
      return function(callback) {
        async.parallel(tasks, callback);
      }
    }

    function errorMessageForCode(code) {
      switch (code) {
        case '?': return 'Bluetooth cubelet may need a hard reset.';
        case '4': return 'Target cubelet is not ready. Try flashing again in a moment. The target may need to be reset.';
        case 'Y': return 'Program upload to bluetooth cubelet failed. Make sure connection is still active and try again.';
        case 'Z': return 'Could not communicate with target cubelet after flashing. The target may need to be reset.';
        default:
          return 'Reason unknown.';
      }
    }

    // Waits for a given response
    function waitForCode(code, timeout) {
      return function(callback) {
        // Listen to raw data from parser
        parser.setRawMode(true);
        parser.on('raw', listen);

        // Set a timeout for receiving the data
        var timer = setTimeout(function() {
          parser.removeListener('raw', listen);
          callback(new Error([
            "Timed out waiting for \'" + code + "\'.",
              errorMessageForCode(code)].join(' ')));
        }, timeout);

        function listen(data) {
          // Check first byte of raw data
          if (data.readUInt8(0) === code.charCodeAt(0)) {
            parser.removeListener('raw', listen);
            clearTimeout(timer);
            callback(null);
          }
        }
      }
    }

    // Sends data and drains the buffer
    function send(data) {
      return function(callback) {
        process.nextTick(function() {
          stream.write(data, function(error) {
            if (error) {
              callback(error);
              return;
            }
            stream.drain(callback);
          })
        });
      }
    }

    // Sends a single-character code
    function sendCode(code) {
      return send(new Buffer([code.charCodeAt(0)]));
    }

    // Drains the buffer
    function drain(callback) {
      stream.drain(callback);
    }

    // Waits for a given interval
    function wait(interval) {
      return function(callback) {
        setTimeout(function() {
          callback(null);
        }, interval);
      }
    }

    // Sends a reset command and waits
    function sendResetCommandAndWait(timeout) {
      return function(callback) {
        async.series([
          parallel([
            send(new Buffer([
              0x15,
              0x3A,
              0x95,
              0x68,
              0xC1,
              0x9A,
              0x84
            ])),
            waitForCode('?', timeout)
          ]),
          send(new Buffer([
            0x59
          ]))
        ], callback);
      }
    }

    function sendDisableAutomapCommand(callback) {
      sendCode('5')(callback);
    }

    // Set parser to raw mode
    parser.setRawMode(true);

    function loadDeviceBuffer() {
      function sendReadyCommandAndWait(timeout) {
        return function(callback) {
          parallel([
            sendCode('3'),
            waitForCode('4', timeout)
          ])(callback)
        }
      }
      function sendProgramChecksumAndWait(timeout) {
        return function(callback) {
          parallel([
            send(new Buffer([
              '8'.charCodeAt(0),
              program.checksum.xor,
              program.checksum.sum
            ])),
            waitForCode('R', timeout)
          ])(callback)
        }
      }
      function sendProgramDataAndWait(timeout) {
        return function(callback) {
          async.series((function() {
            var series = [];
            var interval = 80;
            var size = 200;
            var p = 0;
            function progress(p) {
              return function(callback) {
                emitProgress('upload', {
                  progress: p,
                  total: program.data.length
                }, [1,2]);
                callback(null)
              }
            }
            var data;
            while (data = program.readData(size)) {
              (function(data) {
                if (program.hasDataAvailable()) {
                  series.push(send(data))
                  series.push(progress(p += data.length))
                  series.push(wait(interval))
                }
                else {
                  series.push(parallel([
                    send(data),
                    waitForCode('Y', timeout)
                  ]));
                  series.push(progress(program.data.length))
                }
              })(data)
            }
            return series
          })(), callback)
        }
      }
      function sendFlashCommandAndWait(timeout) {
        return function(callback) {
          switch (target) {
            case Targets.AVR:
              var encodedID = Encoder.encodeID(cubelet.id);
              async.series([
                parallel([
                  send(new Buffer([
                    'W'.charCodeAt(0),
                    encodedID.readUInt8(0),
                    encodedID.readUInt8(1),
                    encodedID.readUInt8(2)
                  ])),
                  waitForCode('R', timeout)
                ]),
                send(new Buffer([
                  'M'.charCodeAt(0),
                  encodedID.readUInt8(0),
                  encodedID.readUInt8(1),
                  encodedID.readUInt8(2),
                  program.pageCount,
                  program.lastPageSize
                ])),
                waitForFlash(timeout)
              ], callback);
              break;
            case Targets.PIC:
              var encodedID = Encoder.encodeID(cubelet.id);
              async.series([
                send(new Buffer([
                  'L'.charCodeAt(0),
                  encodedID.readUInt8(0),
                  encodedID.readUInt8(1),
                  encodedID.readUInt8(2)
                ])),
                waitForFlash(timeout)
              ], callback);
              break;
            default:
              callback(new Error('Flashing target \'' + target + '\' is not supported.'));
              break;
          }
        }
      }
      // Waits for flashing to complete
      function waitForFlash(timeout) {
        return function(callback) {
          // Listen to response from parser
          parser.setRawMode(false);
          parser.on('response', listen);

          // Timeout expiration handler
          function expire() {
            parser.removeListener('response', listen);
            callback(new Error("Timed out waiting for flash to complete."));
          }

          // Set a timeout for receiving response
          var timer = setTimeout(expire, timeout);

          function listen(response) {
            switch (response.type.code) {
              case ResponseTypes['FLASH_PROGRESS'].code:
                clearTimeout(timer);
                emitProgress('flash', {
                  progress: 20 * response.progress,
                  total: program.lineCount
                }, [2,2]);
                timer = setTimeout(expire, timeout);
                break;
              case ResponseTypes['FLASH_COMPLETE'].code:
                parser.removeListener('response', listen);
                clearTimeout(timer);
                emitProgress('flash', {
                  total: program.lineCount
                }, [2,2]);
                callback(null);
                break;
            }
          }
        };
      }
      function waitForSafeCheck(timeout) {
        return function(callback) {
          async.series([
            wait(1000),
            parallel([
              sendCode('1'),
              waitForCode('Z', timeout)
            ])
          ], callback);
        };
      }
      async.series([
        drain,
        sendDisableAutomapCommand,
        sendReadyCommandAndWait(30000),
        sendProgramChecksumAndWait(30000),
        sendProgramDataAndWait(30000),
        wait(2000),
        sendFlashCommandAndWait(30000),
        waitForSafeCheck(30000)
      ].concat(capabilities['reset'] ? [
        sendResetCommandAndWait(30000)
      ]:[]), function(error) {
        parser.setRawMode(false);
        emitLoadResult(error);
      });
    }

    function loadDevice() {
      function sendReadyCommandAndWait(timeout) {
        return function(callback) {
          var encodedID = Encoder.encodeID(cubelet.id);
          parallel([
            send(new Buffer([
              'T'.charCodeAt(0),
              encodedID.readUInt8(0),
              encodedID.readUInt8(1),
              encodedID.readUInt8(2)
            ])),
            waitForCode('!', timeout)
          ])(callback);
        }
      }
      function sendProgramPagesAndWait(timeout) {
        return function(callback) {
          async.series((function() {
            var series = [];
            var pages = program.getPages();
            var p = 0;
            function progress(p) {
              return function(callback) {
                emitProgress('flash', {
                  progress: p,
                  total: pages.length
                })
                callback(null)
              }
            }
            series.push(progress(0));
            pages.forEach(function(page) {
              series.push(parallel([
                send(page),
                waitForCode('G', timeout)
              ]));
              series.push(progress(p += 1));
            })
            series = series.concat([
              parallel([
                send(new Buffer([
                  0xFE,
                  0xFD
                ])),
                waitForCode('@', timeout)
              ]),
              wait(1000),
              sendDisableAutomapCommand,
              parallel([
                sendCode('#'),
                waitForCode('%', timeout)
              ])
            ])
            return series;
          })(), callback);
        }
      }
      async.series([
        drain,
        sendDisableAutomapCommand,
        sendReadyCommandAndWait(30000),
        sendProgramPagesAndWait(30000)
      ].concat(capabilities['reset'] ? [
        sendResetCommandAndWait(30000)
      ]:[]), function(error) {
        parser.setRawMode(false);
        emitLoadResult(error);
      });
    }

    function emitProgress(status, e, step) {
      step = step || [1,1];
      var s = step[0];
      var n = step[1];
      var x = e.progress;
      var t = e.total;
      var p = 0.0;
      x = (x === undefined) ? t : x;
      p = (t > 0) ? (x / t) : p;
      p = (1 / n) * p + ((s - 1) / n);
      e.progress = x;
      e.percent = 100.0 * p;
      emitter.emit(status, e);
    }

    function emitLoadResult(error) {
      if (error) {
        emitter.emit('error', error);
        return;
      }
      emitter.emit('success');
    }

    if (cubelet.id === this.cubelet.id) {
      loadDevice();
    }
    else {
      loadDeviceBuffer();
    }
  }
};

util.inherits(FlashLoader, events.EventEmitter);
module.exports = FlashLoader;
module.exports.Targets = Targets;
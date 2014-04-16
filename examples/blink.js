var cubelets = require(__dirname + '/..');

var connection = new cubelets.SerialConnection({ path: '/dev/cu.Cubelet-GPW-AMP-SPP' });

connection.on('open', function() {
  console.log('Connected.');
});

connection.on('close', function() {
  console.log('Goodbye.');
  process.exit(0);
});

connection.on('error', function(e) {
  console.error(e);
  process.exit(1);
});

connection.connect();

// Take keyboard input one character at a time.
var keyboard = process.stdin;
keyboard.setRawMode(true);
keyboard.resume();

var BlinkLEDCommand = require(__dirname + '/../command/blinkLED');
var SetBlockValueCommand = require(__dirname + '/../command/setBlockValue');

var LED = false;
var blockValue = 0;

keyboard.on('data', function(data) {
  var code = data.toString();
  switch (code) {
    case 'b':
      var command = new BlinkLEDCommand(6766, LED);
      console.log('Blink LED', LED ? 'on' : 'off');
      connection.write(command.encode());
      LED = !LED;
      break;
    case 'l':
      var command = new SetBlockValueCommand(17474, blockValue);
      console.log(command.encode());
      connection.write(command.encode());
      blockValue = blockValue === 0 ? 255 : 0;
      break;
  }
});
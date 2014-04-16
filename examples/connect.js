var cubelets = require(__dirname + '/..');

var connection = new cubelets.SerialConnection({ path: '/dev/cu.Cubelet-GPW-AMP-SPP' });

connection.on('open', function() {
  console.log('Connection open')
});

connection.on('close', function() {
  console.log('Connection closed')
});

connection.connect();

process.stdin.resume();
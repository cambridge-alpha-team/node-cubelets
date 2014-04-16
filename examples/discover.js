var cubelets = require(__dirname + '/..');

var connection = new cubelets.SerialConnection({ path: '/dev/cu.Cubelet-GPW-AMP-SPP' });

connection.on('open', function() {

  var construction = new cubelets.Construction(connection);

  construction.on('change', function() {
    console.log('Construction changed:');
    console.log('The origin is', construction.origin());
    console.log('The direct neighbors are near', construction.near());
    console.log('The other cubelets are far', construction.far());
    console.log('All together they are', construction.all());
    console.log('And mapped by id', construction.map());
  });

  construction.discover();

});

connection.on('close', function() {
  console.log('Connection closed')
});

connection.connect();

process.stdin.resume();
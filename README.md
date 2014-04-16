node-cubelets
=============

Communicate with Cubelets using node.js

What are Cubelets?
==================

Cubelets are magnetic blocks that can be snapped together to make an endless variety of robots. You can communicate with and program them in node.js with a Bluetooth Cubelet.

Connect
=======

First, pair your Bluetooth Cubelet to OS X, Windows, or Linux. A serial connection will be used to communicate with the Cubelet using node-serialport.

To find the name of the device on OS X and Linux:

```
> ls /dev | grep Cubelet
cu.Cubelet-MOD
tty.Cubelet-MOD
```

On Windows, go to the Properties of the device in the Device Manager, and find the COM port for the Cubelet. The name will be something like "COM3", "COM42", etc.

Then, open a connection:

```
var cubelets = require('cubelets');
var connection = new cubelets.SerialConnection({ path: '/dev/cu.Cubelet-GPW-AMP-SPP' });

connection.on('open', function() {
  console.log('Connection open')
});

connection.connect();

```

Discover
========

Once connected, you can discover other Cubelets connected to the Bluetooth Cubelet.

```
var construction = new cubelets.Construction(connection);

construction.on('change', function() {
    console.log('Construction changed:');
    console.log('The origin is', construction.origin());
    console.log('The direct neighbors are near', construction.near());
    console.log('The other cubelets are far', construction.far());
    console.log('All together they are', construction.all());
    console.log('And mapped by id', construction.map());
});
```

The change event will fire when you add or remove direct neighbors to the robot construction, but the full map is only fetched once.

Command
=======

Once Cubelets are discovered, you can send commands to them. For example, to blink the LED on a Cubelet with ID ```1234```:

```
var LED = false; // Off
setInterval(function() {
  var command = new cubelets.BlinkLEDCommand(1234, LED);
  connection.write(command.encode());
  LED = !LED;
}, 500);
```



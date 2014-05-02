var fs = require('fs');
var util = require('util');
var assert = require('assert');
var events = require('events');
var Cubelet = require('./cubelet');
var Types = require('./config.json')['types'];
var Responses = require('./config.json')['responses'];
var DiscoverMapNeighborsCommand = require('./command/discoverMapNeighbors');
var __ = require('underscore');

var Construction = function(connection) {
    events.EventEmitter.call(this);
    assert(connection);

    var construction = this;
    var isConnected = false;
    var origin = null
    var near = [];
    var far = [];
    var map = {};

    this.connect = function(callback) {
        if (isConnected) {
            if (callback) {
                callback(null);
            }
            return;
        }
        connection.on('error', handleError);
        connection.on('response', handleResponse);
        connection.on('close', handleClose);
        connection.open(function(error) {
            if (error) {
                if (callback) {
                    callback(error);
                }
            }
            else {
                isConnected = true;
                process.nextTick(function() {
                    construction.emit('connect');
                    construction.discover();
                });
                if (callback) {
                    callback(null);
                }
            }
        });
    };

    this.disconnect = function(callback) {
        if (!isConnected) {
            if (callback) {
                callback(null);
            }
            return;
        }
        isConnected = false;
        process.nextTick(function() {
            construction.emit('disconnect');
        });
        if (connection) {
            connection.removeListener('error', handleError);
            connection.removeListener('response', handleResponse);
            connection.removeListener('close', handleClose);
            connection.close(callback);
        }
    };

    this.isConnected = function() {
        return isConnected;
    };

    this.isDisconnected = function() {
        return !isConnected;
    };

    this.getConnection = function() {
        return connection;
    };

    function handleError(error) {
        construction.emit('error', error);
    }

    function handleResponse(response) {
        if (response.type == Responses.DISCOVER_MAP_NEIGHBORS) {
            var discovery = response.map;
            var changed = false;
            var find = function(an, id) {
                return __(an).find(function(cubelet) {
                    return cubelet.id == id && cubelet.id != originID
                });
            }

            // Update origin
            var originID = discovery[0];
            var o = origin;
            if (!o) { changed = true; o = new Cubelet(originID, Types.BLUETOOTH); map[originID] = o }
            origin = o;

            // Update near
            var nearIDs = __(discovery.slice(1)).filter(function(id) { return id != 0 });
            var n = near;
            near = __(nearIDs).map(function(id) {
                var c = find(n, id);
                if (!c) { changed = true; c = new Cubelet(id); map[id] = c }
                return c;
            });

            // Update far
            var f = far;
            far = __(nearIDs).reduce(function(memo, id) {
                var c = find(f, id);
                if (c) { changed = true; return __(f).without(c) }
                else return f;
            }, f);

            if (1 || changed)
                construction.emit('change');
        }
    }

    function handleClose() {
        construction.disconnect();
    }

    this.discover = function() {
        if (isConnected) {
            connection.postCommand(new DiscoverMapNeighborsCommand());
        }
    };

    this.origin = function() {
        return origin;
    };

    this.near = function() {
        return near;
    };

    this.far = function() {
        return far;
    };

    this.all = function() {
        return (origin ? [origin]:[]).concat(near).concat(far);
    };

    this.map = function() {
        return map;
    };

    this.reset = function() {
        origin = null;
        near = [];
        far = [];
        map = {};
    };

    this.mock = function() {
        origin = new Cubelet(1, Types.BLUETOOTH);
        near = [
            new Cubelet(2, Types.DISTANCE),
            new Cubelet(3, Types.DRIVE),
            new Cubelet(4, Types.INVERSE),
            new Cubelet(5, Types.BATTERY),
            new Cubelet(6, Types.TEMPERATURE),
            new Cubelet(7, Types.PASSIVE)
        ];
    };

};

util.inherits(Construction, events.EventEmitter);
module.exports = Construction;

module.exports.create = function(connectionType, config) {
    if (typeof connectionType === 'object') {
        config = connectionType;
        connectionType = config['type'];
    }
    else if (typeof connectionType !== 'string') {
        throw new Error('Connection type must be a type of object or a string.');
    }
    var path = __dirname + '/connection/' + connectionType + '.js';
    if (!fs.existsSync(path)) {
        throw new Error('A connection module does not exist for type: \'' + connectionType +'\'.');
    }
    return new Construction(new (require(path))(config));
};

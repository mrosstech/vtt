// require libraries
const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// static hosting using express
app.use(express.static('public'));

// Signaling handlers
io.on('connection', function (socket) {
    console.log('a user connected');

    // when a client emits create or join
    socket.on('create or join', function(room) {
        console.log('create or join to room', room);

        // Count number of users in room
        // var numClients = io.sockets.adapter.rooms.get(room).size;
        // var numClients = myRoom.length;
        var numClients = 0;
        
        if (!io.sockets.adapter.rooms.get(room)) {
            numClients = 0;  // room hasn't been created yet
        } else {
            numClients = io.sockets.adapter.rooms.get(room).size;
        }
        if (numClients == 0) {   // no users in the room
        
            socket.join(room);
            socket.emit('created', room);
            console.log("Created room: " + room);
        } else if (numClients == 1) {  // only the creator is in the room
            socket.join(room);
            socket.emit('joined', room);
            console.log("Joined room: " + room);
        } else {                        // room is full
            socket.emit('full', room);
            console.log("Room is full!");
        }
        console.log(room, ' has ', numClients, ' clients');
    });

    // relay only handlers
    socket.on('ready', function (room) {
        socket.broadcast.to(room).emit('ready');
    });

    socket.on('candidate', function(event) {
        socket.broadcast.to(event.room).emit('candidate', event);
    });

    socket.on('offer', function(event) {
        socket.broadcast.to(event.room).emit('offer', event.sdp);
    });

    socket.on('answer', function(event) {
        socket.broadcast.to(event.room).emit('answer', event.sdp);

    });

});

// listener
http.listen(3000, function() {
    console.log('listening on *:3000');
});
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

// Game State
const players = {};
const ghost = {
    x: 0,
    z: 0,
    targetId: null
};

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    // Initialize new player
    players[socket.id] = {
        x: 0,
        y: 1, // height
        z: 0,
        rotation: 0,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };

    // Send current state to new player
    socket.emit('currentPlayers', players);
    socket.emit('ghostUpdate', ghost);

    // Notify others
    socket.broadcast.emit('newPlayer', { 
        id: socket.id, 
        player: players[socket.id] 
    });

    // Handle movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].rotation = movementData.rotation;
            
            // Broadcast to all other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: players[socket.id].x,
                y: players[socket.id].y,
                z: players[socket.id].z,
                rotation: players[socket.id].rotation
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Simple Ghost AI Loop (Server Tick)
setInterval(() => {
    const playerIds = Object.keys(players);
    if (playerIds.length > 0) {
        // Pick a random player to haunt if no target
        if (!ghost.targetId || !players[ghost.targetId]) {
            ghost.targetId = playerIds[Math.floor(Math.random() * playerIds.length)];
        }

        const target = players[ghost.targetId];
        
        // Move ghost towards target
        const dx = target.x - ghost.x;
        const dz = target.z - ghost.z;
        const distance = Math.sqrt(dx*dx + dz*dz);

        if (distance > 1) {
            ghost.x += (dx / distance) * 0.05; // Speed
            ghost.z += (dz / distance) * 0.05;
        }

        io.emit('ghostUpdate', ghost);
    }
}, 50); // 20 ticks per second

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

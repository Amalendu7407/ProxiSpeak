

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';


const app = express();
app.use(cors()); // Allows frontend and backend to connect without errors

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" } // Security settings allowing all connections
});

// Triggers whenever a new user opens the website
io.on('connection', (socket) => {
  console.log(`🔌 New user connected! Socket ID: ${socket.id}`);

  // Triggers when a user logs in from the frontend
  socket.on('join-space', (data) => {
    console.log(`${data.username} joined the office space!`);
    
    // Broadcast to everyone else that a new user has joined
    socket.broadcast.emit('user-joined', {
      socketId: socket.id,
      username: data.username,
      x: data.x,
      y: data.y
    });
  });
  // When the frontend sends the character's movement data
socket.on('move', async (data) => {
  // Send the new position to all other users
  socket.broadcast.emit('user-moved', {
    socketId: socket.id,
    x: data.x,
    y: data.y
  });

  // Member B's database ($near) code will go here later
});
       // WebRTC के सिग्नल्स को आगे बढ़ाना
  socket.on('webrtc-offer', (data) => {
    io.to(data.targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, offer: data.offer });
  });

  socket.on('webrtc-answer', (data) => {
    io.to(data.targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, answer: data.answer });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.targetSocketId).emit('ice-candidate', { senderSocketId: socket.id, candidate: data.candidate });
  });
  

  // Triggers when a user closes the website tab
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    io.emit('user-left', socket.id);
  });
});

// Start the server on port 5000
const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Member A server is running on: http://localhost:${PORT}`);
});



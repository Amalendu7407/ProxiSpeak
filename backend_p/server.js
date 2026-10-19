import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

// --- INTEGRATION: DATABASE MODULE IMPORTS ---
import './db.js'; // Connects to the MongoDB setup file
import { User } from './models/User.js'; // Imports the database storage model

const app = express();
app.use(cors()); // Allows frontend and backend to connect without errors

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" } // Security configurations for public connectivity
});

// --- WEEK 3: REDIS ENTERPRISE SCALING ADAPTER PLACEMENT ---
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();
// io.adapter(createAdapter(pubClient, subClient)); // Commeted out until local Redis setup is active


// --- LIVE WEBSOCKET CONTROL ROOM WITH FULL SYSTEM INTEGRATION ---

io.on('connection', (socket) => {
  console.log(`🔌 New user connected! Socket ID: ${socket.id}`);

  // 1. JOIN-SPACE EVENT: Handles new entries, records them, and shares background lists
  socket.on('join-space', async (data) => {
    try {
      console.log(`${data.username} joined the office space!`);
      
      // Member C Requirement: Find all current active users in the room
      const existingUsers = await User.find({});
      
      // Member C Requirement: Send the existing list ONLY to the freshly joined user
      socket.emit('existing-users', existingUsers.map(u => ({
        socketId: u.socketId,
        username: u.username,
        x: u.location[0],
        y: u.location[1]
      })));

      // Member B Requirement: Save the new user details into the database structure
      await User.create({
        username: data.username,
        socketId: socket.id,
        location: [data.x, data.y]
      });

      // Broadcast to everyone else that a new user has stepped onto the map
      socket.broadcast.emit('user-joined', {
        socketId: socket.id,
        username: data.username,
        x: data.x,
        y: data.y
      });
    } catch (err) {
      console.error('Error handling user entry workflows:', err);
    }
  });

  // 2. MOVE EVENT: Updates live grid map tracking variables and evaluates proximity matrix rules
  socket.on('move', async (data) => {
    try {
      // Member C Requirement: Fetch the database item to extract the username profile string
      const currentUser = await User.findOne({ socketId: socket.id });
      const currentUsername = currentUser ? currentUser.username : 'Unknown User';

      // Member C Requirement: Broadcast position update ENRICHED with the user's name string
      socket.broadcast.emit('user-moved', {
        socketId: socket.id,
        username: currentUsername,
        x: data.x,
        y: data.y
      });

      // Member B Requirement: Update the active user coordinate field inside MongoDB
      await User.findOneAndUpdate(
        { socketId: socket.id },
        { location: [data.x, data.y] }
      );

      // Member B Requirement: Spatial boundary execution query looking for targets inside a 100px range
      const nearbyUsers = await User.find({
        location: {
          \(near: [data.x, data.y],\)maxDistance: 100
        },
        socketId: { \$ne: socket.id }
      });

      // Forward target list to client browser triggers to open audio bridges
      socket.emit('proximity-update', nearbyUsers.map(u => u.socketId));
    } catch (err) {
      console.error('Error handling coordinates data loops:', err);
    }
  });

  // 3. WebRTC CHANNELS: Forwards live microphone data loops between browsers
  socket.on('webrtc-offer', (data) => {
    io.to(data.targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, offer: data.offer });
  });

  socket.on('webrtc-answer', (data) => {
    io.to(data.targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, answer: data.answer });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.targetSocketId).emit('ice-candidate', { senderSocketId: socket.id, candidate: data.candidate });
  });

  // 4. DISCONNECT EVENT: Drops tracking traces when someone exits the tab view
  socket.on('disconnect', async () => {
    try {
      console.log(`❌ User disconnected: ${socket.id}`);
      
      // Member B Requirement: Delete the disconnected user from MongoDB storage completely
      await User.deleteOne({ socketId: socket.id });
      
      // Signal remaining connections to drop the matching avatar
      io.emit('user-left', socket.id);
    } catch (err) {
      console.error('Error cleaning up disconnected records:', err);
    }
  });
});

// --- WEEK 4: PERSISTENT ROOM LAYOUT API ENDPOINTS ---

app.post('/api/layout', async (req, res) => {
  try {
    res.status(200).send({ message: "Office layout saved successfully!" });
  } catch (error) {
    res.status(500).send({ error: "Failed to save the office layout." });
  }
});

app.get('/api/layout', async (req, res) => {
  res.status(200).send({ obstacles: [] });
});


// Start the server on port 5000
const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Member A server is running on: http://localhost:${PORT}`);
});

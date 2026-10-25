import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { createClient } from 'redis';

// Database configurations mapped cleanly
import './db.js'; 
import { User } from './models/User.js'; 

const app = express();
app.use(cors()); // Enables cross-origin framework connectivity

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// WEEK 3: Redis configuration placeholder architecture
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

// LIVE WEBSOCKET CONTROL ROOM WITH SECURE DATA VALIDATIONS
io.on('connection', (socket) => {
  console.log(`🔌 New user connected! Socket ID: ${socket.id}`);

  // 1. JOIN-SPACE EVENT: Validates and saves profiles inside MongoDB
  socket.on('join-space', async (data = {}) => {
    const username = typeof data.username === 'string' ? data.username.trim() : '';
    const x = data.x == null ? NaN : Number(data.x);
    const y = data.y == null ? NaN : Number(data.y);

    if (!username || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 800 || y < 0 || y > 600) {
      socket.emit('database-error', { message: 'Invalid username or layout coordinates matrix.' });
      return;
    }

    try {
      await User.findOneAndUpdate(
        { socketId: socket.id },
        { $set: { username, socketId: socket.id, location: [x, y] } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );

      console.log(`👤 ${username} joined and synchronized safely with MongoDB`);

      // Notify remaining players about the new entry loop
      socket.broadcast.emit('user-joined', { socketId: socket.id, username, x, y });

      // Fetch all users to fulfill Member C's layout specifications
      const allUsers = await User.find({});
      io.emit('users-update', allUsers.map(u => ({
        id: u.socketId,
        x: u.location[0],
        y: u.location[1]
      })));

    } catch (error) {
      console.error('Failed to save joining user profiles:', error.message);
      socket.emit('database-error', { message: 'Could not process database user entries.' });
    }
  });

  // 2. MOVE EVENT: Updates live tracking nodes and checks 100px proximity boundaries
  socket.on('move', async (data = {}) => {
    const x = data.x == null ? NaN : Number(data.x);
    const y = data.y == null ? NaN : Number(data.y);

    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 800 || y < 0 || y > 600) {
      return;
    }

    try {
      const updatedUser = await User.findOneAndUpdate(
        { socketId: socket.id },
        { $set: { location: [x, y] } },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        console.log('User must register credentials before shifting tracking bounds:', socket.id);
        return;
      }

      // Sync active tracking maps across remotes (Member C requirement)
      const allUsers = await User.find({});
      io.emit('users-update', allUsers.map(u => ({
        id: u.socketId,
        x: u.location[0],
        y: u.location[1]
      })));

      // In-file Geospatial Query: Solves missing proximity.js file risks cleanly
      const nearbyUsers = await User.find({
        location: {
          $near: [x, y],
          $maxDistance: 100
        },
        socketId: { $ne: socket.id }
      });

      // Send the list of nearby user socket IDs to open media channels
      socket.emit('proximity-update', nearbyUsers.map(u => u.socketId));

    } catch (error) {
      console.error('Failed to update live user vectors:', error.message);
    }
  });

  // WebRTC Signal Forwarding Blocks
  socket.on('webrtc-offer', (data = {}) => {
    if (!data.targetSocketId || !data.offer) return;
    io.to(data.targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, offer: data.offer });
  });

  socket.on('webrtc-answer', (data = {}) => {
    if (!data.targetSocketId || !data.answer) return;
    io.to(data.targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, answer: data.answer });
  });

  socket.on('ice-candidate', (data = {}) => {
    if (!data.targetSocketId || !data.candidate) return;
    io.to(data.targetSocketId).emit('ice-candidate', { senderSocketId: socket.id, candidate: data.candidate });
  });

  // 3. DISCONNECT EVENT: Drops footprint records cleanly on tab closure
  socket.on('disconnect', async () => {
    try {
      await User.deleteOne({ socketId: socket.id });
      console.log('Cleaned up disconnected profile footprints from MongoDB:', socket.id);
    } catch (error) {
      console.error('Failed to remove expired credentials:', error.message);
    }
    io.emit('user-left', socket.id);
  });
});

// START SERVER ON TARGET PORT 3000
const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 ProxiSpeak server running flawlessly on port: http://localhost:${PORT}`);
});

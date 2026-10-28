
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
// import { createClient } from 'redis'; // WEEK 3: Redis (abhi use nahi ho raha)
 
import connectDB from './db.js';
import { User } from './models/User.js';
 
const app = express();
app.use(cors());
 
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});
 
// WEEK 3: Redis configuration placeholder
// const pubClient = createClient({ url: 'redis://localhost:6379' });
// const subClient = pubClient.duplicate();
 
io.on('connection', (socket) => {
  console.log(`🔌 New user connected! Socket ID: ${socket.id}`);
 
  // 1. JOIN-SPACE EVENT
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
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
      );
 
      console.log(`👤 ${username} joined and synchronized safely with MongoDB`);
 
      socket.broadcast.emit('user-joined', { socketId: socket.id, username, x, y });
 
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
 
  // 2. MOVE EVENT
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
        { returnDocument: 'after', runValidators: true }
      );
 
      if (!updatedUser) {
        console.log('User must register credentials before shifting tracking bounds:', socket.id);
        return;
      }
 
      const allUsers = await User.find({});
      io.emit('users-update', allUsers.map(u => ({
        id: u.socketId,
        x: u.location[0],
        y: u.location[1]
      })));
 
      // Needs a '2d' index on `location` (see models/User.js)
      const nearbyUsers = await User.find({
        location: {
          $near: [x, y],
          $maxDistance: 100
        },
        socketId: { $ne: socket.id }
      });
 
      socket.emit('proximity-update', nearbyUsers.map(u => u.socketId));
 
    } catch (error) {
      console.error('Failed to update live user vectors:', error.message);
    }
  });
 
  // WebRTC signal forwarding
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
 
  // 3. DISCONNECT EVENT: pehle notify, phir DB cleanup
  socket.on('disconnect', async () => {
    io.emit('user-left', socket.id);
    try {
      await User.deleteOne({ socketId: socket.id });
      console.log('Cleaned up disconnected profile footprints from MongoDB:', socket.id);
    } catch (error) {
      console.error('Failed to remove expired credentials:', error.message);
    }
  });
});
 
// START: pehle DB connect, indexes build, phir server listen
const PORT = 3000;
 
await connectDB();
await User.init(); // 2d index ban jaye, $near query ke liye zaroori
 
httpServer.listen(PORT, () => {
  console.log(`🚀 ProxiSpeak server running flawlessly on port: http://localhost:${PORT}`);
});
 

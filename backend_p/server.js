


/*import connectDB from './db.js';
import { User } from './models/User.js';
import getNearbyUsers from './utils/proximity.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';


const app = express();
app.use(cors()); // Allows frontend and backend to connect without errors

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" } // Security settings allowing all connections
});

// --- WEEK 3: REDIS ENTERPRISE SCALING ADAPTER PLACEMENT ---
// We initialize Redis client connections here before establishing active web socket connections
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

// We keep these commented out until you install Redis server application software locally
// io.adapter(createAdapter(pubClient, subClient));


// --- LIVE WEBSOCKET CONTROL ROOM ---

// Triggers whenever a new user opens the website
io.on('connection', (socket) => {
  console.log(`🔌 New user connected! Socket ID: ${socket.id}`);
  

  
  // Triggers when a user logs in from the frontend
  socket.on('join-space', (data) => {
    console.log(`${data.username} joined the office space!`);
    console.log(`${username} joined and was saved to MongoDB`);
    
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
  socket.on('disconnect', async () => {
    try {
      await User.deleteOne({ socketId: socket.id });

      console.log(
        'Disconnected user removed from MongoDB:',
        socket.id
      );
    } catch (error) {
      console.error(
        'Failed to remove disconnected user:',
        error.message
      );
    }

    // Preserve the existing event
    io.emit('user-left', socket.id);
  });
});


// Start the server on port 5000

const PORT = 5000;

async function startServer() {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(
        `🚀 Member A server is running on: http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
*/

import connectDB from './db.js';
import { User } from './models/User.js';
import getNearbyUsers from './utils/proximity.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// WEEK 3: Redis configuration
const pubClient = createClient({
  url: 'redis://localhost:6379'
});
const subClient = pubClient.duplicate();

// Keep disabled until Redis server is installed and configured.
// io.adapter(createAdapter(pubClient, subClient));

// LIVE WEBSOCKET CONTROL ROOM
io.on('connection', (socket) => {
  console.log(`New user connected! Socket ID: ${socket.id}`);

  // Save user information when they join
  socket.on('join-space', async (data = {}) => {
    const username =
      typeof data.username === 'string'
        ? data.username.trim()
        : '';

    const x = data.x == null ? NaN : Number(data.x);
    const y = data.y == null ? NaN : Number(data.y);

    if (
      !username ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 || x > 800 ||
      y < 0 || y > 600
    ) {
      socket.emit('database-error', {
        message: 'Invalid username or coordinates.'
      });
      return;
    }

    try {
      await User.findOneAndUpdate(
        { socketId: socket.id },
        {
          $set: {
            username,
            socketId: socket.id,
            location: [x, y]
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true
        }
      );

      console.log(`${username} joined and was saved to MongoDB`);

      socket.broadcast.emit('user-joined', {
        socketId: socket.id,
        username,
        x,
        y
      });
    } catch (error) {
      console.error('Failed to save joining user:', error.message);

      socket.emit('database-error', {
        message: 'Could not save user to database.'
      });
    }
  });

  // Update user location when they move
  socket.on('move', async (data = {}) => {
    const x = data.x == null ? NaN : Number(data.x);
    const y = data.y == null ? NaN : Number(data.y);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 || x > 800 ||
      y < 0 || y > 600
    ) {
      return;
    }

    try {
      const updatedUser = await User.findOneAndUpdate(
        { socketId: socket.id },
        { $set: { location: [x, y] } },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        console.log('User must join before moving:', socket.id);
        return;
      }

      // Tell other connected users about the movement
      socket.broadcast.emit('user-moved', {
        socketId: socket.id,
        x,
        y
      });

      // Find users within 100 units of this location
      const nearbyUsers = await getNearbyUsers(
        x,
        y,
        socket.id,
        100
      );

      socket.emit('nearby-users', nearbyUsers);
    } catch (error) {
      console.error('Failed to update location:', error.message);
    }
  });

  // WebRTC signaling: forward offer to target user
  socket.on('webrtc-offer', (data = {}) => {
    if (!data.targetSocketId || !data.offer) return;

    io.to(data.targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      offer: data.offer
    });
  });

  // WebRTC signaling: forward answer to target user
  socket.on('webrtc-answer', (data = {}) => {
    if (!data.targetSocketId || !data.answer) return;

    io.to(data.targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer: data.answer
    });
  });

  // WebRTC signaling: forward ICE candidate
  socket.on('ice-candidate', (data = {}) => {
    if (!data.targetSocketId || !data.candidate) return;

    io.to(data.targetSocketId).emit('ice-candidate', {
      senderSocketId: socket.id,
      candidate: data.candidate
    });
  });

  // Remove user when they disconnect
  socket.on('disconnect', async () => {
    try {
      await User.deleteOne({ socketId: socket.id });

      console.log(
        'Disconnected user removed from MongoDB:',
        socket.id
      );
    } catch (error) {
      console.error(
        'Failed to remove disconnected user:',
        error.message
      );
    }

    // Preserve the existing event
    io.emit('user-left', socket.id);
  });
});

// Start server on port 5000
const PORT = 5000;

async function startServer() {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(
        `Member A server is running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();

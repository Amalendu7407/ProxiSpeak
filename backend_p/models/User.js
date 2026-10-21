import mongoose from 'mongoose';

// User Schema template engineered for Member B's tracking and Member C's profile UI
const userSchema = new mongoose.Schema({
  // 1. Member C Requirement: Stores the display name to broadcast along with avatar movements
  username: { 
    type: String, 
    required: true 
  },
  
  // 2. Member B/C Requirement: Tracks the persistent connection token for targeted network audio routing
  socketId: { 
    type: String, 
    required: true 
  },
  
  // 3. Member B Requirement: Mapped as an [X, Y] array with a '2d' flat spatial index
  // This spatial indexing allows MongoDB to instantly run the 100px proximity calculations
  location: {
    type: [Number], 
    index: '2d'
  }
});

export const User = mongoose.model('User', userSchema);
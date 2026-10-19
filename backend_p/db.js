import mongoose from 'mongoose';
const MONGO_URI = 'mongodb://localhost:27017/proxispeak';
mongoose.connect(MONGO_URI)
  .then(() => console.log('📦 MongoDB connected successfully!'))
  .catch(err => console.error('❌ DB connection error:', err));

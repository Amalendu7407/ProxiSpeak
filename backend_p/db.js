

import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://localhost:27017/proxispeak';

export default async function connectDB() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully!');
}

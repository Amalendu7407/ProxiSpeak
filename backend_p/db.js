

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/proxispeak';

export default async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // DB na mile toh 5 sec mein clear error
        });
        console.log('MongoDB connected successfully!');
    } catch (err) {
        console.error('MongoDB connection FAILED:', err.message);
        throw err; // caller ko pata chale ki connect nahi hua
    }
}

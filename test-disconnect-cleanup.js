const mongoose = require('mongoose');
const User = require('./models/User');

async function testDisconnectCleanup() {
    const id = `disconnect_test_${Date.now()}`;
    const socketId = `${id}_socket`;

    try {
        await mongoose.connect('mongodb://localhost:27017/proxispeak');
        console.log('PASS: MongoDB connected');

        await User.create({
            username: id,
            socketId,
            location: [200, 200]
        });
        console.log('PASS: Test user created');

        await User.deleteOne({ socketId });
        console.log('PASS: User cleanup executed');

        const remainingUser = await User.findOne({ socketId });

        if (!remainingUser) {
            console.log('PASS: Disconnected user removed from database');
        } else {
            throw new Error('User cleanup verification failed');
        }
    } catch (error) {
        console.error('TEST FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState === 1) {
            await User.deleteOne({ socketId });
            await mongoose.disconnect();
            console.log('Test cleanup completed');
        }
    }
}

testDisconnectCleanup();

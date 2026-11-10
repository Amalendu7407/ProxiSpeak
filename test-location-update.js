
const mongoose = require('mongoose');
const User = require('./models/User');

async function testLocationUpdate() {
    const id = `location_test_${Date.now()}`;
    const socketId = `${id}_socket`;

    try {
        await mongoose.connect('mongodb://localhost:27017/proxispeak');
        console.log('PASS: MongoDB connected');

        await User.create({
            username: id,
            socketId,
            location: [100, 100]
        });
        console.log('PASS: Test user created');

        const updatedUser = await User.findOneAndUpdate(
            { socketId },
            { $set: { location: [250, 300] } },
            { returnDocument: 'after' }
        );

        if (
            updatedUser &&
            updatedUser.location[0] === 250 &&
            updatedUser.location[1] === 300
        ) {
            console.log('PASS: User location updated successfully');
            console.log('Updated location:', updatedUser.location);
        } else {
            throw new Error('Location update verification failed');
        }
    } catch (error) {
        console.error('TEST FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState === 1) {
            await User.deleteOne({ username: id, socketId });
            console.log('Test user cleaned up');
            await mongoose.disconnect();
        }
    }
}

testLocationUpdate();

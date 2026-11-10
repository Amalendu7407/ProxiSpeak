const mongoose = require('mongoose');
const User = require('./models/User');
const getNearbyUsers = require('./utils/proximity');

async function testProximity() {
    const testId = `proximity_test_${Date.now()}`;

    const testUsers = [
        {
            username: `${testId}_current`,
            socketId: `${testId}_socket_current`,
            location: [100, 100]
        },
        {
            username: `${testId}_nearby`,
            socketId: `${testId}_socket_nearby`,
            location: [150, 100]
        },
        {
            username: `${testId}_far`,
            socketId: `${testId}_socket_far`,
            location: [300, 100]
        }
    ];

    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/proxispeak');
        console.log('PASS: MongoDB connected');

        // Create test users
        await User.insertMany(testUsers);
        console.log('PASS: Test users created');

        // Search within a 100-pixel radius
        const nearbyUsers = await getNearbyUsers(
            100,
            100,
            `${testId}_socket_current`,
            100
        );

        console.log(
            'Nearby test users:',
            nearbyUsers.map(user => user.username)
        );

        // Verify the results
        const nearbyFound = nearbyUsers.some(
            user => user.username === `${testId}_nearby`
        );

        const farExcluded = !nearbyUsers.some(
            user => user.username === `${testId}_far`
        );

        const currentExcluded = !nearbyUsers.some(
            user => user.username === `${testId}_current`
        );

        if (nearbyFound && farExcluded && currentExcluded) {
            console.log('PASS: Proximity query works correctly!');
        } else {
            console.error('FAIL: Proximity query returned unexpected results');
            process.exitCode = 1;
        }
    } catch (error) {
        console.error('TEST FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        // Delete only the exact test records created by this run
        try {
            if (mongoose.connection.readyState === 1) {
                await User.deleteMany({
                    $or: testUsers.map(user => ({
                        username: user.username,
                        socketId: user.socketId
                    }))
                });

                console.log('Test records cleaned up');
            }
        } catch (cleanupError) {
            console.error('Test cleanup failed:', cleanupError.message);
            process.exitCode = 1;
        }

        await mongoose.disconnect();
    }
}

testProximity();
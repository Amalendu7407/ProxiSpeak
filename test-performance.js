const mongoose = require('mongoose');
const User = require('./models/User');
const getNearbyUsers = require('./utils/proximity');

async function testPerformance() {
    const prefix = `performance_${Date.now()}`;

    try {
        await mongoose.connect('mongodb://localhost:27017/proxispeak');
        console.log('PASS: MongoDB connected');

        const testUsers = [];

        for (let i = 0; i < 1000; i++) {
            testUsers.push({
                username: `${prefix}_${i}`,
                socketId: `${prefix}_socket_${i}`,
                location: [
                    Math.floor(Math.random() * 800),
                    Math.floor(Math.random() * 600)
                ]
            });
        }

        await User.insertMany(testUsers);
        console.log('PASS: 1000 test users created');

        // Warm-up query
        await getNearbyUsers(400, 300, `${prefix}_current`, 100);

        const times = [];

        for (let i = 0; i < 10; i++) {
            const start = performance.now();

            await getNearbyUsers(
                400,
                300,
                `${prefix}_current`,
                100
            );

            const end = performance.now();
            times.push(end - start);
        }

        const average = times.reduce((a, b) => a + b, 0) / times.length;

        console.log('Average query time:', average.toFixed(2), 'ms');
        console.log('Minimum query time:', Math.min(...times).toFixed(2), 'ms');
        console.log('Maximum query time:', Math.max(...times).toFixed(2), 'ms');

        if (average <= 20) {
            console.log('PASS: Average query time is within 20ms target');
        } else {
            console.log('INFO: Average query time exceeds 20ms target');
        }

    } catch (error) {
        console.error('TEST FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState === 1) {
            await User.deleteMany({
                username: { $regex: `^${prefix}_` }
            });

            console.log('Test users cleaned up');
            await mongoose.disconnect();
        }
    }
}

testPerformance();

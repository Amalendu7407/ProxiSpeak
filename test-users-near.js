const mongoose = require('mongoose');
const User = require('./models/User');

async function testUsersNear() {
    try {
        await mongoose.connect('mongodb://localhost:27017/proxispeak');
        console.log('PASS: MongoDB connected');

        const indexes = await User.collection.indexes();
        const locationIndex = indexes.find(
            index => index.name === 'location_2d'
        );

        if (!locationIndex || locationIndex.min !== 0 || locationIndex.max !== 800) {
            throw new Error('Expected location_2d index settings were not found');
        }

        console.log('PASS: Actual users collection has the updated 2D index');

        const result = await User.find({
            location: {
                $near: [100, 100],
                $maxDistance: 100
            }
        }).select('username socketId location').limit(10);

        console.log('PASS: Actual $near query executed');
        console.log('Matching users:', result.length);
        console.log(
            'Results:',
            result.map(user => ({
                username: user.username,
                location: user.location
            }))
        );
    } catch (error) {
        console.error('TEST FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

testUsersNear();
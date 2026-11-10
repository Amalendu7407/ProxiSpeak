const mongoose = require('mongoose');

async function testNearQuery() {
    const collectionName = `near_test_${Date.now()}`;

    const testSchema = new mongoose.Schema({
        username: String,
        socketId: String,
        location: [Number]
    });

    // Temporary test index: coordinates from 0 to 800
    testSchema.index(
        { location: '2d' },
        { min: 0, max: 800 }
    );

    const TestUser = mongoose.model(
        `NearTestUser_${Date.now()}`,
        testSchema,
        collectionName
    );

    try {
        await mongoose.connect(
            'mongodb://localhost:27017/proxispeak'
        );

        console.log('PASS: MongoDB connected');

        // Build the index in the temporary collection
        await TestUser.init();

        console.log('PASS: Temporary 2d index created');

        await TestUser.insertMany([
            {
                username: 'current',
                socketId: 'socket_current',
                location: [100, 100]
            },
            {
                username: 'nearby',
                socketId: 'socket_nearby',
                location: [150, 100]
            },
            {
                username: 'far',
                socketId: 'socket_far',
                location: [250, 100]
            }
        ]);

        console.log('PASS: Test users created');

        const nearbyUsers = await TestUser.find({
            socketId: { $ne: 'socket_current' },
            location: {
                $near: [100, 100],
                $maxDistance: 100
            }
        }).select('username socketId location');

        console.log(
            'Users within 100 pixels:',
            nearbyUsers.map(user => user.username)
        );

        const nearbyFound = nearbyUsers.some(
            user => user.username === 'nearby'
        );

        const farExcluded = !nearbyUsers.some(
            user => user.username === 'far'
        );

        if (nearbyFound && farExcluded) {
            console.log('PASS: $near query works correctly!');
        } else {
            console.error('FAIL: Unexpected query results');
            process.exitCode = 1;
        }
    } catch (error) {
        console.error('TEST FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        try {
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.db
                    .collection(collectionName)
                    .drop()
                    .catch(error => {
                        if (error.codeName !== 'NamespaceNotFound') {
                            throw error;
                        }
                    });

                console.log('Temporary test collection cleaned up');
            }
        } catch (cleanupError) {
            console.error(
                'Cleanup failed:',
                cleanupError.message
            );
            process.exitCode = 1;
        }

        await mongoose.disconnect();
    }
}

testNearQuery();
const mongoose = require('mongoose');
const Room = require('./models/Room');

async function testRoom() {
    const roomName = `Test Office ${Date.now()}`;

    try {
        await mongoose.connect('mongodb://localhost:27017/proxispeak');
        console.log('PASS: MongoDB connected');

        const room = await Room.create({
            name: roomName,
            width: 800,
            height: 600,
            obstacles: [
                {
                    type: 'wall',
                    x: 0,
                    y: 0,
                    width: 800,
                    height: 20
                },
                {
                    type: 'sofa',
                    x: 100,
                    y: 150,
                    width: 120,
                    height: 60
                },
                {
                    type: 'table',
                    x: 350,
                    y: 250,
                    width: 80,
                    height: 50
                }
            ]
        });

        console.log('PASS: Room and obstacles saved');

        const savedRoom = await Room.findOne({ name: roomName });

        if (
            savedRoom &&
            savedRoom.obstacles.length === 3
        ) {
            console.log('PASS: Room retrieved successfully');
            console.log('Room:', savedRoom.name);
            console.log('Obstacles:', savedRoom.obstacles.length);
        } else {
            throw new Error('Room retrieval verification failed');
        }

    } catch (error) {
        console.error('TEST FAILED:', error.message);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState === 1) {
            await Room.deleteOne({ name: roomName });
            console.log('Test room cleaned up');
            await mongoose.disconnect();
        }
    }
}

testRoom();

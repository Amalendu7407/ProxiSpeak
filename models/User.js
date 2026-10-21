const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    socketId: {
        type: String,
        default: ''
    },
    location: {
        type: [Number],
        default: [0, 0]
    }
});

// Create a 2D index for canvas pixel coordinates
userSchema.index(
    { location: '2d' },
    { min: 0, max: 800 }
);

module.exports = mongoose.model('User', userSchema);
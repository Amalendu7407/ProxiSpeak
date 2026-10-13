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

// Create a 2D index for geospatial queries
userSchema.index({ location: '2d' });

module.exports = mongoose.model('User', userSchema);
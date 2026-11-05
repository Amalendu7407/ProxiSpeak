const mongoose = require('mongoose');

const obstacleSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['wall', 'sofa', 'table', 'chair', 'furniture']
    },
    x: {
        type: Number,
        required: true,
        min: 0
    },
    y: {
        type: Number,
        required: true,
        min: 0
    },
    width: {
        type: Number,
        required: true,
        min: 1
    },
    height: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: true });

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    width: {
        type: Number,
        default: 800,
        min: 1
    },
    height: {
        type: Number,
        default: 600,
        min: 1
    },
    obstacles: {
        type: [obstacleSchema],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);


import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    socketId: {
        type: String,
        required: true
    },
    location: {
        type: [Number],
        default: [0, 0]
    }
});

userSchema.index(
    { location: '2d' },
    { min: 0, max: 800 }
);

export const User = mongoose.model('User', userSchema);


import { User } from '../models/User.js';

export default async function getNearbyUsers(
    x,
    y,
    currentSocketId,
    radius = 100
) {
    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(radius) ||
        radius < 0 ||
        x < 0 || x > 800 ||
        y < 0 || y > 600 ||
        typeof currentSocketId !== 'string' ||
        currentSocketId.length === 0
    ) {
        throw new Error('Invalid coordinates, radius, or socket ID');
    }

    return await User.find({
        socketId: { $ne: currentSocketId },
        location: {
            $near: [x, y],
            $maxDistance: radius
        }
    }).select('username socketId location');
}

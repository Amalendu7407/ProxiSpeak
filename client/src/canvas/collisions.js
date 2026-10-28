import { clamp, calculateDistance } from '../utils/math.js';

export function checkCircleRectCollision(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const distance = calculateDistance(cx, cy, closestX, closestY);
  return distance < radius;
}

export function resolveMovement(proposedX, proposedY, currentX, currentY, radius, walls = [], bounds = { width: 1600, height: 1200 }) {
  let nextX = proposedX;
  let nextY = proposedY;

  // 1. Clamp to map outer boundaries
  nextX = clamp(nextX, radius, bounds.width - radius);
  nextY = clamp(nextY, radius, bounds.height - radius);

  // 2. Test X axis movement independently (enables smooth sliding along vertical walls)
  let collidedX = false;
  for (const wall of walls) {
    if (checkCircleRectCollision(nextX, currentY, radius, wall)) {
      collidedX = true;
      break;
    }
  }
  if (collidedX) {
    nextX = currentX;
  }

  // 3. Test Y axis movement independently (enables smooth sliding along horizontal walls)
  let collidedY = false;
  for (const wall of walls) {
    if (checkCircleRectCollision(nextX, nextY, radius, wall)) {
      collidedY = true;
      break;
    }
  }
  if (collidedY) {
    nextY = currentY;
  }

  return { x: nextX, y: nextY };
}

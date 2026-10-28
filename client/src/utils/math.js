export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Linear distance attenuation model
 * volume = clamp(1 - distance / audioRadius, 0, 1)
 */
export function calculateAttenuation(distance, audioRadius = 250) {
  if (audioRadius <= 0) return 0;
  if (distance >= audioRadius) return 0;
  return clamp(1 - distance / audioRadius, 0, 1);
}

/**
 * Horizontal stereo pan mapped to [-1, 1]
 * -1 = full left, 0 = center, +1 = full right
 */
export function calculatePan(localX, remoteX, audioRadius = 250) {
  if (audioRadius <= 0) return 0;
  const deltaX = remoteX - localX;
  return clamp(deltaX / audioRadius, -1, 1);
}

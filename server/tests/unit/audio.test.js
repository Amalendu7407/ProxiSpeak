import { describe, it, expect } from 'vitest';

// Pure math formulas for testing distance attenuation and panning
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function calculateAttenuation(distance, audioRadius = 250) {
  if (audioRadius <= 0) return 0;
  if (distance >= audioRadius) return 0;
  return clamp(1 - distance / audioRadius, 0, 1);
}

function calculatePan(localX, remoteX, audioRadius = 250) {
  if (audioRadius <= 0) return 0;
  const deltaX = remoteX - localX;
  return clamp(deltaX / audioRadius, -1, 1);
}

describe('Spatial Audio Math Unit Tests', () => {
  it('calculates linear volume attenuation accurately', () => {
    const audioRadius = 250;

    // Direct overlap -> full volume 1.0
    expect(calculateAttenuation(0, audioRadius)).toBe(1.0);

    // Halfway -> volume 0.5
    expect(calculateAttenuation(125, audioRadius)).toBe(0.5);

    // Quarter distance -> volume 0.75
    expect(calculateAttenuation(62.5, audioRadius)).toBe(0.75);

    // Exactly at perimeter -> volume 0
    expect(calculateAttenuation(250, audioRadius)).toBe(0);

    // Beyond perimeter -> volume 0
    expect(calculateAttenuation(350, audioRadius)).toBe(0);
    expect(calculateAttenuation(1000, audioRadius)).toBe(0);

    // Negative or zero radius safe handling
    expect(calculateAttenuation(50, 0)).toBe(0);
    expect(calculateAttenuation(50, -100)).toBe(0);
  });

  it('calculates 2D horizontal stereo panning from -1.0 to +1.0', () => {
    const audioRadius = 250;
    const localX = 500;

    // Remote avatar at same horizontal position -> center pan 0.0
    expect(calculatePan(localX, 500, audioRadius)).toBe(0);

    // Remote avatar 250px to the right -> full right +1.0
    expect(calculatePan(localX, 750, audioRadius)).toBe(1.0);

    // Remote avatar 250px to the left -> full left -1.0
    expect(calculatePan(localX, 250, audioRadius)).toBe(-1.0);

    // Remote avatar 125px to the right -> pan +0.5
    expect(calculatePan(localX, 625, audioRadius)).toBe(0.5);

    // Remote avatar 125px to the left -> pan -0.5
    expect(calculatePan(localX, 375, audioRadius)).toBe(-0.5);

    // Beyond audio radius -> clamped to -1.0 and +1.0
    expect(calculatePan(localX, 1200, audioRadius)).toBe(1.0);
    expect(calculatePan(localX, -200, audioRadius)).toBe(-1.0);
  });
});

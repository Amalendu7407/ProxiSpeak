import { describe, it, expect } from 'vitest';
import { calculateAttenuation, calculatePan, calculateDistance, clamp, lerp } from './math.js';

describe('Client Math & Audio Spatialization Tests', () => {
  it('correctly clamps values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('correctly interpolates positions (lerp)', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0.1)).toBeCloseTo(11);
  });

  it('calculates Euclidean distance accurately', () => {
    expect(calculateDistance(0, 0, 30, 40)).toBe(50);
  });

  it('calculates attenuation curve accurately', () => {
    const radius = 250;
    expect(calculateAttenuation(0, radius)).toBe(1);
    expect(calculateAttenuation(125, radius)).toBe(0.5);
    expect(calculateAttenuation(250, radius)).toBe(0);
    expect(calculateAttenuation(300, radius)).toBe(0);
  });

  it('calculates stereo panning values accurately', () => {
    const radius = 250;
    const localX = 500;
    expect(calculatePan(localX, 500, radius)).toBe(0);
    expect(calculatePan(localX, 750, radius)).toBe(1);
    expect(calculatePan(localX, 250, radius)).toBe(-1);
  });
});

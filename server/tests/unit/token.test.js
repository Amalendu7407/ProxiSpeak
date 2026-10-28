import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshTokenString,
  hashToken,
} from '../../src/utils/token.js';

describe('Token Utilities Unit Tests', () => {
  it('generates and verifies valid JWT access token', () => {
    const payload = {
      userId: '60c72b2f9b1d8b2bad000001',
      email: 'user@infotact.com',
      role: 'user',
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.iss).toBe('proxispeak-auth');
    expect(decoded.aud).toBe('proxispeak-app');
  });

  it('rejects tampered or malformed token', () => {
    const token = generateAccessToken({ userId: '123', email: 'test@infotact.com' });
    const tampered = token.slice(0, -5) + 'abcde';

    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('generates unique random refresh token strings', () => {
    const t1 = generateRefreshTokenString();
    const t2 = generateRefreshTokenString();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBe(80); // 40 bytes hex = 80 chars
  });

  it('generates consistent SHA-256 hash for tokens', () => {
    const raw = 'random_secret_token_12345';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });
});

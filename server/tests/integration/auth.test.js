import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, clearTestDB, teardownTestDB } from '../setupMongo.js';
import { User } from '../../src/models/User.js';
import { RefreshToken } from '../../src/models/RefreshToken.js';

describe('Authentication & Profile REST API Integration Tests', () => {
  let app;
  let request;

  beforeAll(async () => {
    await setupTestDB();
    app = createApp();
    request = supertest(app);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/auth/register', () => {
    it('successfully registers a user with the allowed domain (@infotact.com)', async () => {
      const res = await request.post('/api/auth/register').send({
        name: 'Alice Smith',
        email: 'alice@infotact.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Alice Smith');
      expect(res.body.user.email).toBe('alice@infotact.com');
      expect(res.body.user.passwordHash).toBeUndefined(); // Never expose password hash
      expect(res.body.accessToken).toBeDefined();

      // Check HttpOnly refresh cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);

      // Verify user in database
      const dbUser = await User.findOne({ email: 'alice@infotact.com' });
      expect(dbUser).toBeDefined();
      expect(dbUser.passwordHash).toBeDefined();
      expect(dbUser.passwordHash).not.toBe('Password123!');
    });

    it('rejects registration with an unauthorized email domain (@gmail.com)', async () => {
      const res = await request.post('/api/auth/register').send({
        name: 'Bob Unauthorized',
        email: 'bob@gmail.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('@infotact.com');
    });

    it('rejects duplicate email registration (409 Conflict)', async () => {
      await request.post('/api/auth/register').send({
        name: 'Alice Smith',
        email: 'alice@infotact.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      const res = await request.post('/api/auth/register').send({
        name: 'Alice Duplicate',
        email: 'alice@infotact.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already exists');
    });

    it('rejects registration when passwords do not match', async () => {
      const res = await request.post('/api/auth/register').send({
        name: 'Alice',
        email: 'alice@infotact.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request.post('/api/auth/register').send({
        name: 'Alice Smith',
        email: 'alice@infotact.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    });

    it('logs in with correct credentials and returns access token', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'alice@infotact.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('alice@infotact.com');
    });

    it('rejects login with incorrect password with generic error', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'alice@infotact.com',
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects login with non-existent email with generic error', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'nonexistent@infotact.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/refresh and Token Rotation', () => {
    it('rotates refresh token and issues new access token', async () => {
      const regRes = await request.post('/api/auth/register').send({
        name: 'Alice Smith',
        email: 'alice@infotact.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      const cookie = regRes.headers['set-cookie'];

      const refreshRes = await request
        .post('/api/auth/refresh')
        .set('Cookie', cookie)
        .send();

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.accessToken).not.toBe(regRes.body.accessToken);

      // Verify the new cookie is returned
      const newCookie = refreshRes.headers['set-cookie'];
      expect(newCookie).toBeDefined();
    });

    it('detects token reuse and revokes all tokens for that user', async () => {
      const regRes = await request.post('/api/auth/register').send({
        name: 'Alice Smith',
        email: 'alice@infotact.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      const initialCookie = regRes.headers['set-cookie'];

      // First refresh (valid)
      const firstRefresh = await request
        .post('/api/auth/refresh')
        .set('Cookie', initialCookie)
        .send();
      expect(firstRefresh.status).toBe(200);

      // Attacker or stale client attempts to replay the FIRST token
      const replayAttempt = await request
        .post('/api/auth/refresh')
        .set('Cookie', initialCookie)
        .send();

      expect(replayAttempt.status).toBe(401);
      expect(replayAttempt.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // Verify all tokens for this user are now revoked
      const activeTokens = await RefreshToken.find({ revokedAt: null });
      expect(activeTokens.length).toBe(0);
    });
  });

  describe('GET /api/auth/me Protected Endpoint', () => {
    it('returns current profile with valid Bearer token', async () => {
      const regRes = await request.post('/api/auth/register').send({
        name: 'Alice Smith',
        email: 'alice@infotact.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      const token = regRes.body.accessToken;

      const meRes = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.name).toBe('Alice Smith');
      expect(meRes.body.user.email).toBe('alice@infotact.com');
    });

    it('rejects access without Authorization header', async () => {
      const res = await request.get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});

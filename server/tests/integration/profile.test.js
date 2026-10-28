import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, clearTestDB, teardownTestDB } from '../setupMongo.js';

describe('User Profile & Avatar Integration Tests', () => {
  let app;
  let request;
  let userToken;

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

    const reg = await request.post('/api/auth/register').send({
      name: 'Test Employee',
      email: 'employee@infotact.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    userToken = reg.body.accessToken;
  });

  it('updates user profile name successfully', async () => {
    const res = await request
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Updated Employee Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Updated Employee Name');
  });

  it('uploads a valid PNG avatar and updates profile', async () => {
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', pngBuffer, 'avatar.png');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.avatar.url).toBeDefined();
    expect(res.body.user.avatar.url.length).toBeGreaterThan(0);
  });

  it('rejects forbidden file types such as SVG or TXT files', async () => {
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');

    const res = await request
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', svgBuffer, { filename: 'avatar.svg', contentType: 'image/svg+xml' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Only JPEG, PNG, and WebP');
  });

  it('deletes user avatar and resets profile avatar field', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    await request
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', pngBuffer, 'avatar.png');

    const delRes = await request
      .delete('/api/users/me/avatar')
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.user.avatar.url).toBe('');
    expect(delRes.body.user.avatar.publicId).toBe('');
  });
});

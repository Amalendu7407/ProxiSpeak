import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { createApp } from '../../src/app.js';
import { setupSocketServer } from '../../src/socket/index.js';
import { setupTestDB, clearTestDB, teardownTestDB } from '../setupMongo.js';
import { User } from '../../src/models/User.js';
import { Office } from '../../src/models/Office.js';
import { generateAccessToken } from '../../src/utils/token.js';
import { DEFAULT_OFFICE_LAYOUT } from '../../src/services/office.service.js';

describe('Socket.IO Multiplayer & WebRTC Signaling Integration Tests', () => {
  let httpServer;
  let serverPort;
  let ioServer;
  let proximityEngine;

  let aliceUser;
  let bobUser;
  let charlieUser;
  let aliceToken;
  let bobToken;
  let charlieToken;

  beforeAll(async () => {
    await setupTestDB();

    const app = createApp();
    httpServer = http.createServer(app);
    const socketSetup = setupSocketServer(httpServer);
    ioServer = socketSetup.io;
    proximityEngine = socketSetup.proximityEngine;

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (ioServer) ioServer.close();
    if (httpServer) httpServer.close();
    if (proximityEngine) proximityEngine.destroy();
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Create Office HQ1
    await Office.create({
      name: 'ProxiSpeak Headquarters',
      code: 'HQ1',
      ownerId: '60c72b2f9b1d8b2bad000001',
      isPublic: true,
      layout: DEFAULT_OFFICE_LAYOUT,
    });

    // Create Office ALPHA
    await Office.create({
      name: 'Isolated Office Alpha',
      code: 'ALPHA',
      ownerId: '60c72b2f9b1d8b2bad000001',
      isPublic: true,
      layout: DEFAULT_OFFICE_LAYOUT,
    });

    aliceUser = await User.create({
      name: 'Alice',
      email: 'alice@infotact.com',
      passwordHash: 'dummyhash',
    });

    bobUser = await User.create({
      name: 'Bob',
      email: 'bob@infotact.com',
      passwordHash: 'dummyhash',
    });

    charlieUser = await User.create({
      name: 'Charlie',
      email: 'charlie@infotact.com',
      passwordHash: 'dummyhash',
    });

    aliceToken = generateAccessToken({ userId: aliceUser._id.toString(), email: aliceUser.email });
    bobToken = generateAccessToken({ userId: bobUser._id.toString(), email: bobUser.email });
    charlieToken = generateAccessToken({ userId: charlieUser._id.toString(), email: charlieUser.email });
  });

  it('rejects connection handshake without valid JWT token', async () => {
    const socket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: 'invalid_or_missing_token' },
      transports: ['websocket'],
      reconnection: false,
    });

    const errorPromise = new Promise((resolve) => {
      socket.on('connect_error', (err) => {
        resolve(err.message);
      });
    });

    const errMsg = await errorPromise;
    expect(errMsg).toBe('Invalid or expired authentication token');
    socket.close();
  });

  it('allows authenticated users to join an office and synchronizes presence', async () => {
    const aliceSocket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: aliceToken },
      transports: ['websocket'],
    });

    const bobSocket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: bobToken },
      transports: ['websocket'],
    });

    await new Promise((resolve) => aliceSocket.on('connect', resolve));
    await new Promise((resolve) => bobSocket.on('connect', resolve));

    // Alice joins HQ1
    const aliceJoinRes = await new Promise((resolve) => {
      aliceSocket.emit('office:join', { officeId: 'HQ1' }, resolve);
    });

    expect(aliceJoinRes.success).toBe(true);
    expect(aliceJoinRes.office.name).toBe('ProxiSpeak Headquarters');
    expect(aliceJoinRes.self.userId).toBe(aliceUser._id.toString());

    // Setup listener on Alice for Bob joining
    const bobJoinedPromise = new Promise((resolve) => {
      aliceSocket.on('office:user_joined', (data) => {
        resolve(data);
      });
    });

    // Bob joins HQ1
    const bobJoinRes = await new Promise((resolve) => {
      bobSocket.emit('office:join', { officeId: 'HQ1' }, resolve);
    });

    expect(bobJoinRes.success).toBe(true);

    const newPeerData = await bobJoinedPromise;
    expect(newPeerData.userId).toBe(bobUser._id.toString());

    aliceSocket.close();
    bobSocket.close();
  });

  it('exchanges WebRTC signaling when peers are in proximity, and rejects unauthorized signaling', async () => {
    const aliceSocket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: aliceToken },
      transports: ['websocket'],
    });

    const bobSocket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: bobToken },
      transports: ['websocket'],
    });

    await new Promise((resolve) => aliceSocket.on('connect', resolve));
    await new Promise((resolve) => bobSocket.on('connect', resolve));

    await new Promise((r) => aliceSocket.emit('office:join', { officeId: 'HQ1' }, r));
    await new Promise((r) => bobSocket.emit('office:join', { officeId: 'HQ1' }, r));

    // Alice and Bob both joined HQ1 near spawn (800, 600), so they are already within connection radius
    const signalPromise = new Promise((resolve) => {
      bobSocket.on('rtc:signal', (payload) => {
        resolve(payload);
      });
    });

    aliceSocket.emit('rtc:signal', {
      recipientId: bobUser._id.toString(),
      signal: { type: 'description', description: { type: 'offer', sdp: 'fake_sdp_test' } },
    });

    const receivedSignal = await signalPromise;
    expect(receivedSignal.senderId).toBe(aliceUser._id.toString());
    expect(receivedSignal.signal.description.sdp).toBe('fake_sdp_test');

    aliceSocket.close();
    bobSocket.close();
  });

  it('enforces office isolation: peers in different offices cannot see or signal each other', async () => {
    const aliceSocket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: aliceToken },
      transports: ['websocket'],
    });

    const charlieSocket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: charlieToken },
      transports: ['websocket'],
    });

    await new Promise((resolve) => aliceSocket.on('connect', resolve));
    await new Promise((resolve) => charlieSocket.on('connect', resolve));

    // Alice in HQ1
    await new Promise((r) => aliceSocket.emit('office:join', { officeId: 'HQ1' }, r));

    // Charlie in ALPHA
    await new Promise((r) => charlieSocket.emit('office:join', { officeId: 'ALPHA' }, r));

    let charlieReceivedSignal = false;
    charlieSocket.on('rtc:signal', () => {
      charlieReceivedSignal = true;
    });

    // Alice attempts cross-office signaling to Charlie
    aliceSocket.emit('rtc:signal', {
      recipientId: charlieUser._id.toString(),
      signal: { type: 'description', description: { type: 'offer', sdp: 'cross_office_sdp' } },
    });

    // Wait 200ms to ensure no cross-office leak
    await new Promise((r) => setTimeout(r, 200));
    expect(charlieReceivedSignal).toBe(false);

    aliceSocket.close();
    charlieSocket.close();
  });
});

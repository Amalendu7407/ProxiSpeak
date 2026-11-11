

import { expect } from 'chai';
import { io } from 'socket.io-client';

const URL = 'http://127.0.0.1:3000';

describe('ProxiSpeak Backend Unit Testing', function () {
  this.timeout(10000);

  let clientA;
  let clientB;

  const connectClient = () =>
    new Promise((resolve, reject) => {
      const socket = io(URL, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });

      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => {
        reject(new Error(`Server connection failed: ${err.message}`));
      });
    });

  const waitFor = (socket, event, ms = 5000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${event} event not received within ${ms}ms`));
      }, ms);

      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

  before(async function () {
    this.timeout(20000);
    await import('./server.js');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  });

  beforeEach(async () => {
    clientA = await connectClient();
    clientB = await connectClient();
  });

  afterEach(() => {
    clientA?.disconnect();
    clientB?.disconnect();
  });

  it('should connect and receive a socket id', () => {
    expect(clientA.connected).to.equal(true);
    expect(clientA.id).to.be.a('string');
  });

  it('should broadcast user-joined to other clients on join-space', async () => {
    const joined = waitFor(clientB, 'user-joined');

    clientA.emit('join-space', {
      username: 'Alice',
      x: 50,
      y: 50,
    });

    const data = await joined;

    expect(data).to.include({
      username: 'Alice',
      x: 50,
      y: 50,
    });

    expect(data.socketId).to.equal(clientA.id);
  });

  it('should send users-update with positions after join-space', async () => {
    const update = waitFor(clientA, 'users-update');

    clientA.emit('join-space', {
      username: 'Alice',
      x: 10,
      y: 20,
    });

    const users = await update;
    const me = users.find((u) => u.id === clientA.id);

    expect(me).to.deep.equal({
      id: clientA.id,
      x: 10,
      y: 20,
    });
  });

  it('should reject join-space with an empty username', async () => {
    const err = waitFor(clientA, 'database-error');

    clientA.emit('join-space', {
      username: '   ',
      x: 50,
      y: 50,
    });

    const data = await err;
    expect(data.message).to.be.a('string');
  });

  it('should reject join-space with out-of-range coordinates', async () => {
    const err = waitFor(clientA, 'database-error');

    clientA.emit('join-space', {
      username: 'Bob',
      x: 9999,
      y: 50,
    });

    const data = await err;
    expect(data.message).to.be.a('string');
  });

  // NEARBY USER TEST
  it('should report a nearby user on move (within 100px)', async () => {
    const aUpdate = waitFor(clientA, 'users-update');

    clientA.emit('join-space', {
      username: 'Alice',
      x: 100,
      y: 100,
    });

    await aUpdate;

    // Wait for Bob's actual join confirmation
    const bobJoined = waitFor(clientA, 'user-joined');

    clientB.emit('join-space', {
      username: 'Bob',
      x: 500,
      y: 500,
    });

    await bobJoined;

    // Bob moves near Alice
    const proximity = waitFor(clientB, 'proximity-update');

    clientB.emit('move', {
      x: 130,
      y: 120,
    });

    const nearby = await proximity;

    expect(nearby).to.include(clientA.id);
  });

  // FAR USER TEST
  it('should NOT report a far user on move (beyond 100px)', async () => {
    const aUpdate = waitFor(clientA, 'users-update');

    clientA.emit('join-space', {
      username: 'Alice',
      x: 100,
      y: 100,
    });

    await aUpdate;

    // Wait for Bob's actual join confirmation
    const bobJoined = waitFor(clientA, 'user-joined');

    clientB.emit('join-space', {
      username: 'Bob',
      x: 500,
      y: 500,
    });

    await bobJoined;

    // Bob moves far away
    const proximity = waitFor(clientB, 'proximity-update');

    clientB.emit('move', {
      x: 600,
      y: 500,
    });

    const nearby = await proximity;

    expect(nearby).to.not.include(clientA.id);
  });

  it('should emit user-left to others when a client disconnects', async () => {
    const left = waitFor(clientB, 'user-left');
    const aId = clientA.id;

    clientA.disconnect();

    const leftId = await left;
    expect(leftId).to.equal(aId);
  });
});


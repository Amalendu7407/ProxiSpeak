import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialGrid, calculateDistance } from '../../src/proximity/SpatialGrid.js';
import { ProximityEngine } from '../../src/proximity/ProximityEngine.js';

describe('SpatialGrid Unit Tests', () => {
  let grid;

  beforeEach(() => {
    grid = new SpatialGrid(150);
  });

  it('calculates Euclidean distance accurately', () => {
    expect(calculateDistance(0, 0, 3, 4)).toBe(5);
    expect(calculateDistance(100, 100, 100, 100)).toBe(0);
    expect(calculateDistance(100, 200, 400, 600)).toBe(500);
  });

  it('inserts and retrieves entities', () => {
    grid.insert('user_1', 100, 100, { name: 'Alice' });
    const entity = grid.get('user_1');
    expect(entity).toBeDefined();
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(100);
    expect(entity.data.name).toBe('Alice');
  });

  it('updates position and shifts cells when entity moves across boundary', () => {
    grid.insert('user_1', 50, 50);
    expect(grid.get('user_1').cellKey).toBe('0:0');

    grid.update('user_1', 200, 200);
    expect(grid.get('user_1').cellKey).toBe('1:1');
    expect(grid.cells.get('0:0')).toBeUndefined();
    expect(grid.cells.get('1:1').has('user_1')).toBe(true);
  });

  it('removes entity cleanly', () => {
    grid.insert('user_1', 100, 100);
    grid.remove('user_1');
    expect(grid.get('user_1')).toBeUndefined();
    expect(grid.cells.get('0:0')).toBeUndefined();
  });

  it('finds nearby entities within radius and excludes self', () => {
    grid.insert('user_1', 100, 100);
    grid.insert('user_2', 150, 100); // dist = 50
    grid.insert('user_3', 350, 100); // dist = 250
    grid.insert('user_4', 800, 800); // dist >> 300

    const nearby = grid.getNearby(100, 100, 260, 'user_1');
    const ids = nearby.map((n) => n.id);

    expect(ids).toContain('user_2');
    expect(ids).toContain('user_3');
    expect(ids).not.toContain('user_1');
    expect(ids).not.toContain('user_4');
  });
});

describe('ProximityEngine Unit Tests', () => {
  let engine;

  beforeEach(() => {
    engine = new ProximityEngine({
      audioRadius: 250,
      connectionRadius: 300,
      disconnectionRadius: 360,
      gridCellSize: 150,
    });
  });

  it('triggers enter event when peer enters connection radius', () => {
    // Add Alice at (100, 100)
    engine.addUser('office_1', { userId: 'alice', socketId: 's_alice', x: 100, y: 100 });

    // Add Bob at (500, 100) (distance = 400 > 300, no connection)
    const bobInitial = engine.addUser('office_1', { userId: 'bob', socketId: 's_bob', x: 500, y: 100 });
    expect(bobInitial.enters.length).toBe(0);

    // Bob moves to (350, 100) (distance = 250 <= 300 -> ENTER!)
    const moveRes = engine.updatePosition('office_1', 'bob', 350, 100);
    expect(moveRes.enters.length).toBe(1);
    expect(moveRes.enters[0].peerId).toBe('alice');
    expect(moveRes.enters[0].distance).toBe(250);
    expect(moveRes.enters[0].canHear).toBe(true);

    const aliceState = engine.getUser('office_1', 'alice');
    expect(aliceState.connectedPeers.has('bob')).toBe(true);
  });

  it('maintains connection with hysteresis between connection and disconnection radius', () => {
    // Start connected: dist = 200
    engine.addUser('office_1', { userId: 'alice', socketId: 's_alice', x: 100, y: 100 });
    engine.addUser('office_1', { userId: 'bob', socketId: 's_bob', x: 300, y: 100 });

    // Bob moves to (430, 100) -> distance = 330
    // 330 is > connectionRadius (300) BUT <= disconnectionRadius (360)
    // Hysteresis must keep the connection alive!
    const move1 = engine.updatePosition('office_1', 'bob', 430, 100);
    expect(move1.leaves.length).toBe(0);
    expect(engine.getUser('office_1', 'alice').connectedPeers.has('bob')).toBe(true);

    // Bob moves to (470, 100) -> distance = 370 > disconnectionRadius (360) -> LEAVE!
    const move2 = engine.updatePosition('office_1', 'bob', 470, 100);
    expect(move2.leaves.length).toBe(1);
    expect(move2.leaves[0].peerId).toBe('alice');
    expect(engine.getUser('office_1', 'alice').connectedPeers.has('bob')).toBe(false);
  });

  it('isolates users between different offices', () => {
    engine.addUser('office_A', { userId: 'alice', socketId: 's_alice', x: 100, y: 100 });
    engine.addUser('office_B', { userId: 'bob', socketId: 's_bob', x: 100, y: 100 });

    // Same coordinates but different offices => no connection!
    const alice = engine.getUser('office_A', 'alice');
    expect(alice.connectedPeers.has('bob')).toBe(false);

    const nearbyA = engine.calculateProximityTransitions('office_A', 'alice');
    expect(nearbyA.enters.length).toBe(0);
    expect(nearbyA.activePeers.length).toBe(0);
  });

  it('clamps positions to boundary limits', () => {
    engine.addUser('office_1', { userId: 'alice', socketId: 's_alice', x: 800, y: 600 });
    const clamped = engine.updatePosition(
      'office_1',
      'alice',
      -500,
      9999,
      { width: 1600, height: 1200 },
      { validateSpeed: false }
    );

    expect(clamped.x).toBe(20);
    expect(clamped.y).toBe(1180);
  });

  it('prevents unrealistic speed teleportation', () => {
    engine.addUser('office_1', { userId: 'alice', socketId: 's_alice', x: 100, y: 100 });
    // Attempt instant teleport to 1000, 1000 in same millisecond
    const res = engine.updatePosition('office_1', 'alice', 1000, 1000, { width: 1600, height: 1200 });
    // Movement should be throttled/clamped towards target rather than instant teleport
    expect(res.x).toBeLessThan(150);
    expect(res.y).toBeLessThan(150);
  });

  it('cleans up disconnected user and leaves peer relationships', () => {
    engine.addUser('office_1', { userId: 'alice', socketId: 's_alice', x: 100, y: 100 });
    engine.addUser('office_1', { userId: 'bob', socketId: 's_bob', x: 200, y: 100 });

    expect(engine.getUser('office_1', 'alice').connectedPeers.has('bob')).toBe(true);

    const removeRes = engine.removeUser('office_1', 'bob');
    expect(removeRes.disconnectedPeers.length).toBe(1);
    expect(removeRes.disconnectedPeers[0].peerId).toBe('alice');

    expect(engine.getUser('office_1', 'alice').connectedPeers.has('bob')).toBe(false);
    expect(engine.getUser('office_1', 'bob')).toBeNull();
  });
});

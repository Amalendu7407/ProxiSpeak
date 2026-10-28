import { SpatialGrid, calculateDistance } from './SpatialGrid.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class ProximityEngine {
  constructor(options = {}) {
    this.audioRadius = options.audioRadius ?? config.proximity.audioRadius;
    this.connectionRadius = options.connectionRadius ?? config.proximity.connectionRadius;
    this.disconnectionRadius = options.disconnectionRadius ?? config.proximity.disconnectionRadius;
    this.gridCellSize = options.gridCellSize ?? config.proximity.gridCellSize;

    // Map of officeId -> { grid: SpatialGrid, users: Map<userId, UserState> }
    this.offices = new Map();

    // Map of socketId -> { officeId, userId }
    this.socketToUser = new Map();

    // Start periodic stale session cleanup (every 30 seconds)
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions(60000); // 60 seconds inactivity
    }, 30000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  _getOrCreateOffice(officeId) {
    if (!this.offices.has(officeId)) {
      this.offices.set(officeId, {
        grid: new SpatialGrid(this.gridCellSize),
        users: new Map(),
      });
    }
    return this.offices.get(officeId);
  }

  /**
   * Register a user into an office
   */
  addUser(officeId, user) {
    const { userId, socketId, x = 800, y = 600, profile = {}, muted = false } = user;
    const office = this._getOrCreateOffice(officeId);

    // If user was previously in another office with this socket, remove first
    this.removeUserBySocketId(socketId);

    const userState = {
      userId,
      socketId,
      officeId,
      x,
      y,
      profile,
      muted,
      lastUpdated: Date.now(),
      connectedPeers: new Set(), // Set of peer userIds currently connected
    };

    office.users.set(userId, userState);
    office.grid.insert(userId, x, y, {
      userId,
      socketId,
      profile,
      muted,
    });

    this.socketToUser.set(socketId, { officeId, userId });

    logger.debug('User added to proximity engine', { officeId, userId, socketId });
    return this.calculateProximityTransitions(officeId, userId);
  }

  /**
   * Update user position with speed and boundary validation
   */
  updatePosition(officeId, userId, newX, newY, bounds = { width: 1600, height: 1200 }, options = {}) {
    const office = this.offices.get(officeId);
    if (!office) return null;

    const userState = office.users.get(userId);
    if (!userState) return null;

    // 1. Boundary clamping
    const clampedX = Math.max(20, Math.min(bounds.width - 20, newX));
    const clampedY = Math.max(20, Math.min(bounds.height - 20, newY));

    // 2. Velocity validation (prevent unrealistic speed hacks)
    const now = Date.now();
    const dt = Math.max(0.001, (now - userState.lastUpdated) / 1000); // seconds
    const dist = calculateDistance(userState.x, userState.y, clampedX, clampedY);
    const speed = dist / dt; // pixels per second
    const MAX_ALLOWED_SPEED = 1200; // pixels per second (normal walk is 200-300)

    let finalX = clampedX;
    let finalY = clampedY;

    if (options.validateSpeed !== false && speed > MAX_ALLOWED_SPEED && dist > 150) {
      // Teleportation attempt or excessive lag spike: clamp movement towards target
      const angle = Math.atan2(clampedY - userState.y, clampedX - userState.x);
      const maxDist = MAX_ALLOWED_SPEED * dt;
      finalX = userState.x + Math.cos(angle) * maxDist;
      finalY = userState.y + Math.sin(angle) * maxDist;
    }

    userState.x = finalX;
    userState.y = finalY;
    userState.lastUpdated = now;

    office.grid.update(userId, finalX, finalY, {
      userId,
      socketId: userState.socketId,
      profile: userState.profile,
      muted: userState.muted,
    });

    // 3. Compute proximity enter/leave transitions with hysteresis
    return this.calculateProximityTransitions(officeId, userId);
  }

  /**
   * Calculate proximity transitions (enter, leave, update) using hysteresis
   */
  calculateProximityTransitions(officeId, userId) {
    const office = this.offices.get(officeId);
    if (!office) return null;

    const userState = office.users.get(userId);
    if (!userState) return null;

    // Find all users within disconnection radius (the outer boundary)
    const candidates = office.grid.getNearby(
      userState.x,
      userState.y,
      this.disconnectionRadius,
      userId
    );

    const candidatesById = new Map();
    for (const c of candidates) {
      candidatesById.set(c.id, c);
    }

    const enters = []; // Peers to connect to
    const leaves = []; // Peers to disconnect from
    const activePeers = []; // All currently connected peers with updated coordinates and distance

    // Check existing connections to see if any have exceeded disconnectionRadius
    for (const peerId of Array.from(userState.connectedPeers)) {
      const candidate = candidatesById.get(peerId);
      const peerState = office.users.get(peerId);

      if (!candidate || !peerState || candidate.distance > this.disconnectionRadius) {
        // Exceeded disconnectionRadius (hysteresis threshold) -> LEAVE
        userState.connectedPeers.delete(peerId);
        if (peerState) {
          peerState.connectedPeers.delete(userId);
        }
        leaves.push({
          userId: userState.userId,
          socketId: userState.socketId,
          peerId,
          peerSocketId: peerState?.socketId,
        });
      } else {
        // Still connected and within disconnectionRadius
        const dist = candidate.distance;
        activePeers.push({
          peerId,
          peerSocketId: peerState.socketId,
          x: peerState.x,
          y: peerState.y,
          distance: dist,
          canHear: dist <= this.audioRadius,
          muted: peerState.muted,
          profile: peerState.profile,
        });
      }
    }

    // Check nearby candidates to see if any new peer has entered connectionRadius
    for (const candidate of candidates) {
      const peerId = candidate.id;
      if (userState.connectedPeers.has(peerId)) continue; // Already connected

      if (candidate.distance <= this.connectionRadius) {
        // Entered connectionRadius -> ENTER
        const peerState = office.users.get(peerId);
        if (!peerState) continue;

        userState.connectedPeers.add(peerId);
        peerState.connectedPeers.add(userId);

        enters.push({
          userId: userState.userId,
          socketId: userState.socketId,
          peerId,
          peerSocketId: peerState.socketId,
          distance: candidate.distance,
          canHear: candidate.distance <= this.audioRadius,
          peerState: {
            userId: peerState.userId,
            socketId: peerState.socketId,
            x: peerState.x,
            y: peerState.y,
            profile: peerState.profile,
            muted: peerState.muted,
          },
        });

        activePeers.push({
          peerId,
          peerSocketId: peerState.socketId,
          x: peerState.x,
          y: peerState.y,
          distance: candidate.distance,
          canHear: candidate.distance <= this.audioRadius,
          muted: peerState.muted,
          profile: peerState.profile,
        });
      }
    }

    return {
      userId,
      socketId: userState.socketId,
      x: userState.x,
      y: userState.y,
      enters,
      leaves,
      activePeers,
    };
  }

  updateMuteState(officeId, userId, muted) {
    const office = this.offices.get(officeId);
    if (!office) return;
    const userState = office.users.get(userId);
    if (userState) {
      userState.muted = Boolean(muted);
      office.grid.update(userId, userState.x, userState.y, { muted: userState.muted });
    }
  }

  removeUser(officeId, userId) {
    const office = this.offices.get(officeId);
    if (!office) return null;

    const userState = office.users.get(userId);
    if (!userState) return null;

    // Disconnect from all connected peers
    const disconnectedPeers = [];
    for (const peerId of userState.connectedPeers) {
      const peerState = office.users.get(peerId);
      if (peerState) {
        peerState.connectedPeers.delete(userId);
        disconnectedPeers.push({
          peerId,
          peerSocketId: peerState.socketId,
        });
      }
    }

    office.grid.remove(userId);
    office.users.delete(userId);
    this.socketToUser.delete(userState.socketId);

    if (office.users.size === 0) {
      this.offices.delete(officeId);
    }

    return {
      userId,
      socketId: userState.socketId,
      disconnectedPeers,
    };
  }

  removeUserBySocketId(socketId) {
    const record = this.socketToUser.get(socketId);
    if (!record) return null;
    return this.removeUser(record.officeId, record.userId);
  }

  getUser(officeId, userId) {
    return this.offices.get(officeId)?.users.get(userId) || null;
  }

  getUserBySocketId(socketId) {
    const record = this.socketToUser.get(socketId);
    if (!record) return null;
    return this.getUser(record.officeId, record.userId);
  }

  getAllUsersInOffice(officeId) {
    const office = this.offices.get(officeId);
    if (!office) return [];
    return Array.from(office.users.values()).map((u) => ({
      userId: u.userId,
      socketId: u.socketId,
      x: u.x,
      y: u.y,
      profile: u.profile,
      muted: u.muted,
    }));
  }

  cleanupStaleSessions(maxInactivityMs = 60000) {
    const now = Date.now();
    for (const [officeId, office] of this.offices.entries()) {
      for (const [userId, userState] of office.users.entries()) {
        if (now - userState.lastUpdated > maxInactivityMs) {
          logger.info('Evicting stale user session', { officeId, userId });
          this.removeUser(officeId, userId);
        }
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.offices.clear();
    this.socketToUser.clear();
  }
}

import { Server } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/auth.middleware.js';
import { ProximityEngine } from '../proximity/ProximityEngine.js';
import { OfficeService } from '../services/office.service.js';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function setupSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  const proximityEngine = new ProximityEngine();

  // Handshake authentication
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const userId = socket.user.userId;
    logger.info('Socket connected and authenticated', { socketId: socket.id, userId });

    let currentOfficeId = null;
    let lastMoveTime = 0;
    let moveCounter = 0;
    let moveWindowStart = Date.now();

    // 1. Join Office
    socket.on('office:join', async (payload, callback = () => {}) => {
      try {
        const { officeId } = payload || {};
        if (!officeId) {
          return callback({ success: false, error: 'officeId is required' });
        }

        let office = await OfficeService.getOfficeByIdOrCode(officeId);
        if (!office && officeId.toUpperCase() === 'HQ1') {
          office = await OfficeService.getOrCreateDefaultOffice(userId);
        }
        if (!office) {
          return callback({ success: false, error: 'Office not found' });
        }

        const isAuthorized = await OfficeService.isUserAuthorizedForOffice(office._id, userId);
        if (!isAuthorized) {
          logger.warn('Unauthorized office join attempt', { userId, officeId: office._id });
          return callback({ success: false, error: 'Unauthorized to join this office' });
        }

        // Leave previous office if any
        if (currentOfficeId) {
          socket.leave(`office_${currentOfficeId}`);
          handleLeave(currentOfficeId, userId, socket.id);
        }

        currentOfficeId = office._id.toString();
        socket.join(`office_${currentOfficeId}`);

        // Fetch user profile from DB
        const userDoc = await User.findById(userId);
        const userProfile = userDoc ? userDoc.toSafeJSON() : { id: userId, name: 'User' };

        // Register in proximity engine at office spawn point
        const spawn = office.layout?.spawnPoint || { x: 800, y: 600 };
        // Add a slight random offset to prevent avatars from stacking exactly on top of each other
        const initialX = spawn.x + (Math.random() * 40 - 20);
        const initialY = spawn.y + (Math.random() * 40 - 20);

        const transitions = proximityEngine.addUser(currentOfficeId, {
          userId,
          socketId: socket.id,
          x: initialX,
          y: initialY,
          profile: userProfile,
          muted: false,
        });

        // Get all users currently in the office
        const allUsers = proximityEngine.getAllUsersInOffice(currentOfficeId);

        // Notify client that they successfully joined
        callback({
          success: true,
          office: {
            id: office._id,
            name: office.name,
            code: office.code,
            layout: office.layout,
          },
          self: {
            userId,
            x: initialX,
            y: initialY,
            profile: userProfile,
          },
          users: allUsers,
          webrtc: {
            iceServers: config.webrtc.iceServers,
          },
          proximityConfig: {
            audioRadius: config.proximity.audioRadius,
            connectionRadius: config.proximity.connectionRadius,
            disconnectionRadius: config.proximity.disconnectionRadius,
          },
        });

        // Broadcast to other users in this office that a new user joined
        socket.to(`office_${currentOfficeId}`).emit('office:user_joined', {
          userId,
          socketId: socket.id,
          x: initialX,
          y: initialY,
          profile: userProfile,
          muted: false,
        });

        // Handle initial proximity transitions if peers are right at spawn
        if (transitions?.enters?.length > 0) {
          for (const enter of transitions.enters) {
            socket.emit('proximity:enter', {
              peerId: enter.peerId,
              peer: enter.peerState,
              distance: enter.distance,
              canHear: enter.canHear,
            });

            if (enter.peerSocketId) {
              io.to(enter.peerSocketId).emit('proximity:enter', {
                peerId: userId,
                peer: {
                  userId,
                  socketId: socket.id,
                  x: initialX,
                  y: initialY,
                  profile: userProfile,
                  muted: false,
                },
                distance: enter.distance,
                canHear: enter.canHear,
              });
            }
          }
        }
      } catch (err) {
        logger.error('Error in office:join handler', { error: err.message });
        callback({ success: false, error: 'Internal server error while joining office' });
      }
    });

    // 2. Player Movement with rate limiting and validation
    socket.on('player:move', (coords) => {
      if (!currentOfficeId) return;

      const { x, y } = coords || {};
      if (typeof x !== 'number' || typeof y !== 'number') return;

      // Rate limit movement events to max 35 updates/sec per socket
      const now = Date.now();
      if (now - moveWindowStart >= 1000) {
        moveWindowStart = now;
        moveCounter = 0;
      }
      moveCounter++;
      if (moveCounter > 35) {
        return; // Throttled
      }

      const transitions = proximityEngine.updatePosition(currentOfficeId, userId, x, y);
      if (!transitions) return;

      // Broadcast position to all office occupants for visual rendering
      socket.to(`office_${currentOfficeId}`).emit('player:moved', {
        userId,
        x: transitions.x,
        y: transitions.y,
      });

      // Send proximity update with current distances to the moving player
      socket.emit('proximity:update', {
        activePeers: transitions.activePeers,
      });

      // Dispatch enter events (create new WebRTC peer connections)
      for (const enter of transitions.enters) {
        socket.emit('proximity:enter', {
          peerId: enter.peerId,
          peer: enter.peerState,
          distance: enter.distance,
          canHear: enter.canHear,
        });

        if (enter.peerSocketId) {
          const localUser = proximityEngine.getUser(currentOfficeId, userId);
          io.to(enter.peerSocketId).emit('proximity:enter', {
            peerId: userId,
            peer: localUser
              ? {
                  userId: localUser.userId,
                  socketId: localUser.socketId,
                  x: localUser.x,
                  y: localUser.y,
                  profile: localUser.profile,
                  muted: localUser.muted,
                }
              : null,
            distance: enter.distance,
            canHear: enter.canHear,
          });
        }
      }

      // Dispatch leave events (destroy WebRTC peer connections)
      for (const leave of transitions.leaves) {
        socket.emit('proximity:leave', { peerId: leave.peerId });
        if (leave.peerSocketId) {
          io.to(leave.peerSocketId).emit('proximity:leave', { peerId: userId });
        }
      }
    });

    // 3. WebRTC Signaling with strict authorization and proximity validation
    socket.on('rtc:signal', (payload) => {
      if (!currentOfficeId) return;

      const { recipientId, signal } = payload || {};
      if (!recipientId || !signal) return;

      // Security check: Both sender and recipient must be in the same office
      const recipient = proximityEngine.getUser(currentOfficeId, recipientId);
      if (!recipient) {
        logger.warn('Signaling rejected: recipient not in office', {
          senderId: userId,
          recipientId,
          officeId: currentOfficeId,
        });
        return;
      }

      const sender = proximityEngine.getUser(currentOfficeId, userId);
      if (!sender) return;

      // Validate that recipient is within connection proximity or in active connected peers
      if (!sender.connectedPeers.has(recipientId)) {
        logger.warn('Signaling rejected: peer is not in connected proximity', {
          senderId: userId,
          recipientId,
        });
        return;
      }

      // Forward signaling payload directly to recipient's socket
      io.to(recipient.socketId).emit('rtc:signal', {
        senderId: userId,
        signal,
      });
    });

    // 4. Mute State Change
    socket.on('user:mute_state', (payload) => {
      if (!currentOfficeId) return;
      const muted = Boolean(payload?.muted);
      proximityEngine.updateMuteState(currentOfficeId, userId, muted);

      socket.to(`office_${currentOfficeId}`).emit('user:mute_state', {
        userId,
        muted,
      });
    });

    // 5. Office Leave
    socket.on('office:leave', () => {
      if (currentOfficeId) {
        socket.leave(`office_${currentOfficeId}`);
        handleLeave(currentOfficeId, userId, socket.id);
        currentOfficeId = null;
      }
    });

    // 6. Socket Disconnection
    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { socketId: socket.id, userId });
      if (currentOfficeId) {
        handleLeave(currentOfficeId, userId, socket.id);
        currentOfficeId = null;
      } else {
        proximityEngine.removeUserBySocketId(socket.id);
      }
    });

    function handleLeave(officeId, uId, sId) {
      const removal = proximityEngine.removeUser(officeId, uId);
      socket.to(`office_${officeId}`).emit('office:user_left', { userId: uId });

      if (removal?.disconnectedPeers) {
        for (const peer of removal.disconnectedPeers) {
          if (peer.peerSocketId) {
            io.to(peer.peerSocketId).emit('proximity:leave', { peerId: uId });
          }
        }
      }
    }
  });

  return { io, proximityEngine };
}

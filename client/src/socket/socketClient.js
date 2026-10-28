import { io } from 'socket.io-client';
import { getAccessToken } from '../services/api.js';

let socketInstance = null;

export function getSocket() {
  return socketInstance;
}

export function initSocket() {
  const token = getAccessToken();

  if (socketInstance) {
    if (token && socketInstance.auth?.token !== token) {
      socketInstance.auth = { token };
      if (!socketInstance.connected) {
        socketInstance.connect();
      }
    }
    return socketInstance;
  }

  // Connect directly to backend port in development to bypass Vite proxy websocket issues
  const socketUrl = window.location.port === '5173' ? 'http://localhost:5001' : '/';

  socketInstance = io(socketUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    autoConnect: Boolean(token),
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
  });

  socketInstance.on('connect', () => {
    console.log('[Socket] Connected to ProxiSpeak server:', socketInstance.id);
  });

  socketInstance.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

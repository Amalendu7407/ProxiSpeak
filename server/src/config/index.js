import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5001', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/proxispeak',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_min_32_characters_for_proxispeak_auth',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_min_32_characters_for_proxispeak_auth',
    issuer: process.env.JWT_ISSUER || 'proxispeak-auth',
    audience: process.env.JWT_AUDIENCE || 'proxispeak-app',
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
    refreshTtlDays: 7,
  },

  allowedEmailDomain: (process.env.ALLOWED_EMAIL_DOMAIN || 'infotact.com').trim().toLowerCase(),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    isConfigured: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  },

  webrtc: {
    iceServers: [
      ...(process.env.STUN_SERVER_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
        .split(',')
        .map((url) => ({ urls: url.trim() }))
        .filter((entry) => Boolean(entry.urls)),
      ...(process.env.TURN_SERVER_URL
        ? [
            {
              urls: process.env.TURN_SERVER_URL,
              username: process.env.TURN_SERVER_USERNAME,
              credential: process.env.TURN_SERVER_CREDENTIAL,
            },
          ]
        : []),
    ],
  },

  proximity: {
    audioRadius: parseFloat(process.env.PROXIMITY_AUDIO_RADIUS || '250'),
    connectionRadius: parseFloat(process.env.PROXIMITY_CONNECTION_RADIUS || '300'),
    disconnectionRadius: parseFloat(process.env.PROXIMITY_DISCONNECTION_RADIUS || '360'),
    gridCellSize: 150,
  },
};

import { config } from '../config/index.js';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'authorization', 'cookie'];

function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitize(meta);
  const logObject = {
    timestamp,
    level,
    message,
    ...(Object.keys(sanitizedMeta).length > 0 ? { data: sanitizedMeta } : {}),
  };
  return JSON.stringify(logObject);
}

export const logger = {
  info: (message, meta) => {
    console.log(formatLog('INFO', message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatLog('WARN', message, meta));
  },
  error: (message, meta) => {
    console.error(formatLog('ERROR', message, meta));
  },
  debug: (message, meta) => {
    if (!config.isProduction) {
      console.debug(formatLog('DEBUG', message, meta));
    }
  },
};

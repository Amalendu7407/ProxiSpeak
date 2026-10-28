import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let isConnected = false;
let memoryServerInstance = null;

export async function connectDatabase(customUri) {
  if (isConnected) {
    return mongoose.connection;
  }

  const uri = customUri || config.mongodbUri;

  try {
    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB connection lost');
    });

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    isConnected = true;
    return mongoose.connection;
  } catch (err) {
    if (!config.isProduction && !customUri) {
      logger.warn('Local MongoDB connection failed. Starting in-memory MongoDB fallback for local development...', {
        error: err.message,
      });

      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServerInstance = await MongoMemoryServer.create();
        const memUri = memoryServerInstance.getUri();
        await mongoose.connect(memUri);
        isConnected = true;
        logger.info(`In-memory MongoDB running seamlessly at ${memUri}`);
        return mongoose.connection;
      } catch (memErr) {
        logger.error('Failed to start in-memory MongoDB fallback', { error: memErr.message });
        throw err;
      }
    }

    logger.error('Failed to connect to MongoDB', { error: err.message });
    throw err;
  }
}

export async function disconnectDatabase() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected');
  }
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
}

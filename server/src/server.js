import http from 'http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { setupSocketServer } from './socket/index.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    // 1. Connect database
    await connectDatabase();

    // 2. Create Express app and HTTP server
    const app = createApp();
    const httpServer = http.createServer(app);

    // 3. Setup Socket.IO
    const { io, proximityEngine } = setupSocketServer(httpServer);

    // 4. Start listening
    const server = httpServer.listen(config.port, () => {
      logger.info(`ProxiSpeak Server running in ${config.env} mode on http://localhost:${config.port}`);
      logger.info(`Allowed email registration domain: @${config.allowedEmailDomain}`);
      logger.info(`Client origin allowed: ${config.clientOrigin}`);
    });

    // 5. Graceful shutdown handler
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close sockets
          io.close();
          // Destroy proximity engine
          proximityEngine.destroy();
          // Disconnect database
          await disconnectDatabase();
          logger.info('Graceful shutdown completed successfully');
          process.exit(0);
        } catch (err) {
          logger.error('Error during graceful shutdown', { error: err.message });
          process.exit(1);
        }
      });

      // Force shutdown after 10s if hanging
      setTimeout(() => {
        logger.error('Shutdown timed out. Forcing process exit.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start ProxiSpeak server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();

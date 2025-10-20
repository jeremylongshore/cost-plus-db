/**
 * CostPlusDB Backend - Main Entry Point
 *
 * Initializes the Express server, database connections, and starts listening
 * for incoming requests.
 *
 * @module index
 */

import 'dotenv/config';
import 'express-async-errors';
import { app } from './api/app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initializeDatabase } from './database/index.js';

/**
 * Start the application server
 */
async function startServer() {
  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    await initializeDatabase();
    logger.info('Database connection established');

    // Start Express server
    const PORT = config.PORT;
    app.listen(PORT, () => {
      logger.info(`CostPlusDB Backend started successfully`, {
        port: PORT,
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
      });

      logger.info(`API available at: ${config.API_BASE_URL}`);
      logger.info(`Health check: ${config.API_BASE_URL}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    // TODO: Close database connections
    // TODO: Complete pending requests
    // TODO: Close external service connections

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Setup shutdown handlers
setupGracefulShutdown();

// Start the server
startServer();

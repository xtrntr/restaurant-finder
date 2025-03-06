import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import config from './config';
import { connectToDatabase } from './utils/database';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import restaurantRoutes from './routes/restaurantRoutes';

async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Create Express app
    const app = express();

    // Basic security middleware
    app.use(helmet());

    // CORS middleware
    app.use(cors({
      origin: config.cors.origin,
      credentials: true
    }));

    // Request logging
    app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

    // JSON body parser
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    app.use(rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests, please try again later.'
    }));

    // API routes
    app.use('/api/restaurants', restaurantRoutes);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ 
        success: false,
        message: 'API endpoint not found' 
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    // Start the server
    const server = app.listen(config.server.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.server.port}`);
    }).on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        logger.error(`Port ${config.server.port} is already in use`);
        logger.info('Try running: lsof -i :4000 | grep LISTEN | awk \'{print $2}\' | xargs kill -9');
        process.exit(1);
      } else {
        logger.error(`Server error: ${e.message}`);
        process.exit(1);
      }
    });

    // Handle signals for graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      
      // Force close if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // For ts-node-dev restart support
    if (process.env.TS_NODE_DEV) {
      process.on('SIGUSR2', () => {
        logger.info('Received SIGUSR2, shutting down for restart');
        server.close(() => {
          process.kill(process.pid, 'SIGUSR2');
        });
      });
    }

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      logger.error(`Unhandled Promise Rejection: ${err.message}`);
      logger.error(err.stack || '');
      
      // Gracefully close the server and exit
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

startServer(); 
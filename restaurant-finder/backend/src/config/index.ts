import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
  },
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-finder',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  logs: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config; 
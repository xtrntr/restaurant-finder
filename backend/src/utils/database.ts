import mongoose from 'mongoose';
import config from '../config';
import logger from './logger';

export async function connectToDatabase() {
  try {
    logger.info(`Connecting to MongoDB at ${config.db.uri}`);
    
    await mongoose.connect(config.db.uri);
    
    // Add index creation and other DB setup here if needed
    
    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error}`);
    process.exit(1);
  }
}

export async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error(`Error disconnecting from MongoDB: ${error}`);
  }
}

// Configure mongoose
mongoose.set('debug', config.env === 'development');

// Handle connection events
mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  logger.info('MongoDB disconnected');
});

// Handle app termination
process.on('SIGINT', async () => {
  await disconnectFromDatabase();
  process.exit(0);
});

export default mongoose; 
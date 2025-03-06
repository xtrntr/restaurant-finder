import dotenv from 'dotenv';
import path from 'node:path';
import ScraperCoordinator from './services/ScraperCoordinator.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

async function main() {
  try {
    const coordinatesFile = process.env.COORDINATES_FILE || '../data/coordinates.csv';
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-finder';
    const requestDelayMs = parseInt(process.env.REQUEST_DELAY_MS || '2000', 10);
    const maxRetries = parseInt(process.env.MAX_RETRIES || '5', 10);
    const concurrentRequests = parseInt(process.env.CONCURRENT_REQUESTS || '2', 10);
    
    logger.info('Starting Grab restaurants scraper...');
    logger.info(`Configuration: Request delay: ${requestDelayMs}ms, Max retries: ${maxRetries}, Concurrent requests: ${concurrentRequests}`);
    
    const coordinator = new ScraperCoordinator(
      path.resolve(coordinatesFile),
      mongoUri,
      requestDelayMs,
      maxRetries,
      concurrentRequests
    );
    
    await coordinator.run();
    
    logger.info('Scraper completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Scraper failed: ${error}`);
    process.exit(1);
  }
}

main(); 
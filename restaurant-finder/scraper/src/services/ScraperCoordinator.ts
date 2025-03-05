import fs from 'fs-extra';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import GrabScraper from './GrabScraper';
import logger from '../utils/logger';

interface Coordinate {
  name: string;
  latitude: string;
  longitude: string;
}

export default class ScraperCoordinator {
  private readonly coordinatesFilePath: string;
  private readonly mongoUri: string;
  private readonly scraper: GrabScraper;

  constructor(
    coordinatesFilePath: string,
    mongoUri: string,
    requestDelayMs = 2000,
    maxRetries = 5,
    concurrentRequests = 2
  ) {
    this.coordinatesFilePath = coordinatesFilePath;
    this.mongoUri = mongoUri;
    this.scraper = new GrabScraper(requestDelayMs, maxRetries, concurrentRequests);
  }

  async run(): Promise<void> {
    try {
      await this.connectToMongo();
      const coordinates = await this.readCoordinatesFile();
      
      for (const coord of coordinates) {
        try {
          logger.info(`Processing area: ${coord.name}`);
          await this.scraper.fetchRestaurants(
            parseFloat(coord.latitude),
            parseFloat(coord.longitude),
            coord.name
          );
          logger.info(`Completed scraping for area: ${coord.name}`);
        } catch (error) {
          logger.error(`Error processing area ${coord.name}: ${error}`);
        }
      }
      
      logger.info('Scraping completed for all areas');
    } catch (error) {
      logger.error(`Scraper coordinator error: ${error}`);
      throw error;
    } finally {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    }
  }

  private async connectToMongo(): Promise<void> {
    try {
      logger.info(`Connecting to MongoDB at ${this.mongoUri}`);
      await mongoose.connect(this.mongoUri);
      logger.info('Connected to MongoDB');
    } catch (error) {
      logger.error(`Failed to connect to MongoDB: ${error}`);
      throw error;
    }
  }

  private async readCoordinatesFile(): Promise<Coordinate[]> {
    try {
      logger.info(`Reading coordinates from ${this.coordinatesFilePath}`);
      
      // Check if file exists
      if (!await fs.pathExists(this.coordinatesFilePath)) {
        throw new Error(`Coordinates file not found: ${this.coordinatesFilePath}`);
      }
      
      const coordinates: Coordinate[] = [];
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(this.coordinatesFilePath)
          .pipe(csv())
          .on('data', (data: Coordinate) => {
            if (data.name && data.latitude && data.longitude) {
              coordinates.push(data);
            } else {
              logger.warn(`Skipping invalid row in CSV: ${JSON.stringify(data)}`);
            }
          })
          .on('end', () => {
            logger.info(`Loaded ${coordinates.length} coordinates from CSV`);
            resolve(coordinates);
          })
          .on('error', (error) => {
            logger.error(`Error reading CSV: ${error}`);
            reject(error);
          });
      });
    } catch (error) {
      logger.error(`Failed to read coordinates file: ${error}`);
      throw error;
    }
  }
} 
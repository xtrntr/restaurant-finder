import fs from 'fs-extra';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import GrabScraper from './GrabScraper.js';
import logger from '../utils/logger.js';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

interface Coordinate {
  name: string;
  latitude: string;
  longitude: string;
}

interface CoordinatePair {
  latitude: number;
  longitude: number;
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
      
      // Determine file format and read accordingly
      const fileExt = this.coordinatesFilePath.split('.').pop()?.toLowerCase();
      let coordinates: CoordinatePair[];
      
      if (fileExt === 'csv') {
        // Check if it's the legacy format or new format
        const isLegacyFormat = await this.isLegacyCsvFormat();
        
        if (isLegacyFormat) {
          const legacyCoords = await this.readLegacyCoordinatesFile();
          coordinates = legacyCoords.map(coord => ({
            latitude: parseFloat(coord.latitude),
            longitude: parseFloat(coord.longitude)
          }));
        } else {
          coordinates = await this.readNewCoordinatesFile();
        }
      } else {
        throw new Error(`Unsupported file format: ${fileExt}`);
      }
      
      // Process each coordinate
      let coordCount = 0;
      for (const coord of coordinates) {
        try {
          const areaName = `Area_${coordCount++}`;
          logger.info(`Processing coordinates: ${coord.latitude},${coord.longitude} as ${areaName}`);
          await this.scraper.fetchRestaurants(
            coord.latitude,
            coord.longitude,
            areaName
          );
          logger.info(`Completed scraping for ${areaName}`);
        } catch (error) {
          logger.error(`Error processing coordinates ${coord.latitude},${coord.longitude}: ${error}`);
        }
      }
      
      logger.info('Scraping completed for all coordinates');
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

  private async isLegacyCsvFormat(): Promise<boolean> {
    try {
      // Read the first line of the file to determine format
      return new Promise((resolve, reject) => {
        const fileStream = createReadStream(this.coordinatesFilePath);
        const rl = createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });
        
        rl.on('line', (line) => {
          rl.close();
          fileStream.close();
          
          // If first line contains name,latitude,longitude, it's legacy format
          if (line.includes('name,latitude,longitude') || 
              (line.includes(',') && !line.includes('[') && !line.includes(']'))) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        
        rl.on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      logger.warn(`Error checking file format, assuming legacy format: ${error}`);
      return true;
    }
  }

  private async readLegacyCoordinatesFile(): Promise<Coordinate[]> {
    try {
      logger.info(`Reading legacy coordinates from ${this.coordinatesFilePath}`);
      
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
            logger.info(`Loaded ${coordinates.length} coordinates from legacy CSV`);
            resolve(coordinates);
          })
          .on('error', (error) => {
            logger.error(`Error reading CSV: ${error}`);
            reject(error);
          });
      });
    } catch (error) {
      logger.error(`Failed to read legacy coordinates file: ${error}`);
      throw error;
    }
  }

  private async readNewCoordinatesFile(): Promise<CoordinatePair[]> {
    try {
      logger.info(`Reading coordinates from ${this.coordinatesFilePath}`);
      
      // Check if file exists
      if (!await fs.pathExists(this.coordinatesFilePath)) {
        throw new Error(`Coordinates file not found: ${this.coordinatesFilePath}`);
      }
      
      const coordinates: CoordinatePair[] = [];
      
      // Read the file line by line
      const fileContent = await fs.readFile(this.coordinatesFilePath, 'utf8');
      const lines = fileContent.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          // Parse the coordinate in format [latitude,longitude],
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith('[') || !cleanLine.includes(']')) continue;
          
          // Extract the content between square brackets
          const match = cleanLine.match(/\[(.*?)\]/);
          if (!match || !match[1]) {
            logger.warn(`Skipping invalid coordinate format: ${line}`);
            continue;
          }
          
          const [latStr, lngStr] = match[1].split(',');
          const latitude = parseFloat(latStr.trim());
          const longitude = parseFloat(lngStr.trim());
          
          if (isNaN(latitude) || isNaN(longitude)) {
            logger.warn(`Skipping invalid coordinate values: ${line}`);
            continue;
          }
          
          coordinates.push({ latitude, longitude });
        } catch (err) {
          logger.warn(`Skipping invalid row in CSV: ${JSON.stringify(line)}`);
        }
      }
      
      logger.info(`Loaded ${coordinates.length} coordinates from CSV`);
      return coordinates;
    } catch (error) {
      logger.error(`Failed to read coordinates file: ${error}`);
      throw error;
    }
  }
} 
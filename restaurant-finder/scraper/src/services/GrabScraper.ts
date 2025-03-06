import axios from 'axios';
import pRetry from 'p-retry';
import pLimit from 'p-limit';
import { GrabApiRequest, GrabApiResponse, GrabRestaurant } from '../types/grabApi.js';
import logger from '../utils/logger.js';
import Restaurant from '../models/Restaurant.js';
import { IRestaurant } from '../models/Restaurant.js';

// We'll define an interface for pRetry to use before it's loaded
interface RetryOptions {
  retries: number;
  onFailedAttempt: (error: any) => void;
}

export default class GrabScraper {
  private readonly baseUrl = 'https://portal.grab.com/foodweb/v2/search';
  private readonly pageSize = 32;
  private readonly requestDelayMs: number;
  private readonly maxRetries: number;
  private readonly concurrentRequests: number;

  constructor(
    requestDelayMs = 2000,
    maxRetries = 5,
    concurrentRequests = 2
  ) {
    this.requestDelayMs = requestDelayMs;
    this.maxRetries = maxRetries;
    this.concurrentRequests = concurrentRequests;
  }

  async fetchRestaurants(latitude: number, longitude: number, area: string, keyword = ''): Promise<IRestaurant[]> {
    logger.info(`Fetching restaurants for coordinates: ${latitude},${longitude} in area: ${area}`);
    
    const limit = pLimit(this.concurrentRequests);
    let offset = 0;
    let allRestaurants: GrabRestaurant[] = [];
    let hasMoreResults = true;
    
    while (hasMoreResults) {
      try {
        const restaurants = await this.fetchPage(latitude, longitude, keyword, offset);
        logger.info(`Fetched ${restaurants.length} restaurants from offset ${offset}`);
        
        if (restaurants.length === 0) {
          hasMoreResults = false;
        } else {
          allRestaurants = [...allRestaurants, ...restaurants];
          offset += this.pageSize;
          
          // Sleep to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, this.requestDelayMs));
        }
      } catch (error) {
        logger.error(`Failed to fetch restaurants at offset ${offset}: ${error}`);
        hasMoreResults = false;
      }
    }
    
    // Transform Grab restaurants to our model format
    const processedRestaurants = allRestaurants.map(restaurant => 
      this.transformRestaurant(restaurant, area)
    );
    
    // Save to database
    const savePromises = processedRestaurants.map(restaurant => 
      limit(() => this.saveRestaurant(restaurant))
    );
    
    await Promise.all(savePromises);
    logger.info(`Saved ${processedRestaurants.length} restaurants for area: ${area}`);
    
    return processedRestaurants;
  }
  
  private async fetchPage(
    latitude: number, 
    longitude: number, 
    keyword: string, 
    offset: number
  ): Promise<GrabRestaurant[]> {
    const request: GrabApiRequest = {
      latlng: `${latitude},${longitude}`,
      keyword,
      offset,
      pageSize: this.pageSize,
      countryCode: 'SG'
    };
    
    return pRetry(
      async () => {
        try {
          const response = await axios.post<GrabApiResponse>(
            this.baseUrl,
            request,
            {
              headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'X-Country-Code': 'SG'
              },
              timeout: 10000
            }
          );
          
          return response.data.searchResult.searchMerchants || [];
        } catch (error: any) {
          if (error.response?.status === 429) {
            logger.warn('Rate limited, retrying after delay...');
            await new Promise(resolve => setTimeout(resolve, this.requestDelayMs * 5));
            throw new Error('Rate limited');
          }
          
          if (error.response?.status >= 400) {
            logger.error(`API error: ${error.response?.status} - ${error.response?.statusText}`);
            throw new Error(`API error: ${error.response?.status}`);
          }
          
          logger.error(`Network error: ${error.message}`);
          throw error;
        }
      },
      {
        retries: this.maxRetries,
        onFailedAttempt: error => {
          logger.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        }
      }
    );
  }
  
  private transformRestaurant(grabRestaurant: GrabRestaurant, area: string): IRestaurant {
    const { id, address, latlng, estimatedDeliveryTime, merchantBrief } = grabRestaurant;
    
    // Extract the restaurant name and location parts if possible
    // The format is typically "Restaurant Name - Location"
    const nameText = merchantBrief.displayInfo.primaryText;
    let name = nameText;
    let locationAddress = '';
    
    const dashIndex = nameText.indexOf(' - ');
    if (dashIndex > 0) {
      name = nameText.substring(0, dashIndex).trim();
      locationAddress = nameText.substring(dashIndex + 3).trim();
    }
    
    return new Restaurant({
      grabId: id,
      name: name,
      location: {
        type: 'Point',
        coordinates: [latlng.longitude, latlng.latitude] // MongoDB expects [longitude, latitude]
      },
      address: locationAddress || address.name, // Use extracted location or fallback to address.name
      cuisines: merchantBrief.cuisine || [],
      priceLevel: merchantBrief.priceTag,
      rating: merchantBrief.rating,
      reviewCount: merchantBrief.vote_count,
      photoUrl: merchantBrief.photoHref,
      isOpen: merchantBrief.openHours.open,
      openingHours: {
        displayedHours: merchantBrief.openHours.displayedHours,
        sun: merchantBrief.openHours.sun,
        mon: merchantBrief.openHours.mon,
        tue: merchantBrief.openHours.tue,
        wed: merchantBrief.openHours.wed,
        thu: merchantBrief.openHours.thu,
        fri: merchantBrief.openHours.fri,
        sat: merchantBrief.openHours.sat
      },
      distanceInKm: merchantBrief.distanceInKm,
      estimatedDeliveryTime,
      area
    });
  }
  
  private async saveRestaurant(restaurant: IRestaurant): Promise<IRestaurant> {
    try {
      // Convert to plain object to avoid _id issues with Mongoose
      const restaurantData = restaurant.toObject();
      
      // Remove _id field to avoid updating immutable field
      delete restaurantData._id;
      
      // Use upsert to update if exists, or create if doesn't exist
      const result = await Restaurant.findOneAndUpdate(
        { grabId: restaurant.grabId },
        restaurantData,
        { upsert: true, new: true }
      );
      
      return result;
    } catch (error: any) {
      logger.error(`Failed to save restaurant ${restaurant.grabId}: ${error.message}`);
      throw error;
    }
  }
} 
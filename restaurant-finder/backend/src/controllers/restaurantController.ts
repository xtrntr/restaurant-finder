import { Request, Response, NextFunction } from 'express';
import Restaurant, { IRestaurant } from '../models/Restaurant';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Get all restaurants with pagination
 */
export const getAllRestaurants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Simple indicator to verify when code changes take effect
    console.log('\n⭐ Controller loaded:', new Date().toISOString());
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const skip = (page - 1) * limit;
    const sort = (req.query.sort as string) || '-rating';
    
    // Initialize the filter object
    let filter: any = {};
    
    // Log raw query parameters for debugging
    console.log('Raw query params:', JSON.stringify(req.query));
    
    // 1. Parse and apply text search filters
    const name = req.query.name as string;
    if (name && name.trim() !== '') {
      // Use regex for partial and case-insensitive matching on name
      filter.name = { $regex: name, $options: 'i' };
      logger.info(`Added filter: name contains "${name}"`);
    }
    
    const address = req.query.address as string;
    if (address && address.trim() !== '') {
      // Use regex for partial and case-insensitive matching on address
      filter.address = { $regex: address, $options: 'i' };
      logger.info(`Added filter: address contains "${address}"`);
    }
    
    // General text search query
    const searchQuery = req.query.q as string;
    if (searchQuery && searchQuery.trim() !== '') {
      filter.$text = { $search: searchQuery };
      logger.info(`Added filter: text search for "${searchQuery}"`);
    }
    
    // 2. Parse and apply categorical filters
    const area = req.query.area as string;
    if (area && area.trim() !== '') {
      filter.area = area;
      logger.info(`Added filter: area = "${area}"`);
    }
    
    // 3. Handle array fields with $in operator
    const cuisines = req.query.cuisines as string;
    if (cuisines && cuisines.trim() !== '') {
      // Split comma-separated cuisines and create an $in query
      const cuisineArray = cuisines.split(',').map(c => c.trim());
      filter.cuisines = { $in: cuisineArray };
      logger.info(`Added filter: cuisines in [${cuisineArray.join(', ')}]`);
    }
    
    // 4. Parse and apply numeric filters
    const priceLevel = parseInt(req.query.priceLevel as string, 10);
    if (!isNaN(priceLevel)) {
      filter.priceLevel = priceLevel;
      logger.info(`Added filter: priceLevel = ${priceLevel}`);
    }
    
    const exactRating = parseFloat(req.query.rating as string);
    if (!isNaN(exactRating)) {
      filter.rating = exactRating;
      logger.info(`Added filter: rating = ${exactRating}`);
    }
    
    // 5. Parse and apply range-based filters
    const minRating = parseFloat(req.query.minRating as string);
    if (!isNaN(minRating)) {
      filter.rating = { ...filter.rating, $gte: minRating };
      logger.info(`Added filter: rating >= ${minRating}`);
    }
    
    const maxRating = parseFloat(req.query.maxRating as string);
    if (!isNaN(maxRating)) {
      filter.rating = { ...filter.rating, $lte: maxRating };
      logger.info(`Added filter: rating <= ${maxRating}`);
    }
    
    const minPrice = parseInt(req.query.minPrice as string, 10);
    if (!isNaN(minPrice)) {
      filter.priceLevel = { ...filter.priceLevel, $gte: minPrice };
      logger.info(`Added filter: priceLevel >= ${minPrice}`);
    }
    
    const maxPrice = parseInt(req.query.maxPrice as string, 10);
    if (!isNaN(maxPrice)) {
      filter.priceLevel = { ...filter.priceLevel, $lte: maxPrice };
      logger.info(`Added filter: priceLevel <= ${maxPrice}`);
    }
    
    const minDistance = parseFloat(req.query.minDistance as string);
    if (!isNaN(minDistance)) {
      filter.distanceInKm = { ...filter.distanceInKm, $gte: minDistance };
      logger.info(`Added filter: distanceInKm >= ${minDistance}`);
    }
    
    const maxDistance = parseFloat(req.query.maxDistance as string);
    if (!isNaN(maxDistance)) {
      filter.distanceInKm = { ...filter.distanceInKm, $lte: maxDistance };
      logger.info(`Added filter: distanceInKm <= ${maxDistance}`);
    }
    
    const minReviews = parseInt(req.query.minReviews as string, 10);
    if (!isNaN(minReviews)) {
      filter.reviewCount = { $gte: minReviews };
      logger.info(`Added filter: reviewCount >= ${minReviews}`);
    }
    
    // Process delivery time filter
    const deliveryUnder30 = req.query.deliveryUnder30 === 'true';
    if (deliveryUnder30) {
      filter.estimatedDeliveryTime = { $lte: 30 };
      logger.info('Added filter: deliveryUnder30');
    }
    
    // Process isOpen filter - only apply when explicitly provided
    if (req.query.isOpen !== undefined) {
      const isOpen = req.query.isOpen === 'true';
      filter.isOpen = isOpen;
      logger.info(`Added filter: isOpen = ${isOpen}`);
    }
    
    // 6. Log the final filter object for debugging
    logger.info('Final MongoDB query filter:', JSON.stringify(filter));
    console.log('MONGODB QUERY FILTER:', JSON.stringify(filter, null, 2));
    
    let restaurants;
    let total;
    
    // Handle openNow filter separately as it requires special processing
    const openNow = req.query.openNow === 'true';
    
    if (openNow) {
      // Processing for openNow filter (keeping the existing implementation)
      logger.info(`Applying openNow filter, current time: ${new Date().toISOString()}`);
      
      // Get current day and time for filtering
      const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const now = new Date();
      const currentDay = daysOfWeek[now.getDay()]; 
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const formattedTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      logger.info(`Current day: ${currentDay}, Current time: ${formattedTime}`);
      
      // 7. Use Restaurant.find(filter) with the constructed filter
      restaurants = await Restaurant.find(filter)
        .sort(filter.$text ? { score: { $meta: 'textScore' }, [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } : sort)
        .limit(10000) // Get a large batch to filter
        .select('-__v');
      
      // Post-processing filter for openNow
      restaurants = restaurants.filter(restaurant => {
        try {
          // Get opening hours for the current day
          const hours = restaurant.openingHours[currentDay as keyof typeof restaurant.openingHours];
          
          // Skip closed restaurants
          if (!hours || hours === 'Closed') {
            return false;
          }
          
          // Parse opening hours (format: "HH:MM-HH:MM")
          const [openTime, closeTime] = hours.split('-');
          const [openHour, openMinute] = openTime.split(':').map(Number);
          const [closeHour, closeMinute] = closeTime.split(':').map(Number);
          
          // Convert to minutes for easier comparison
          const openMinutes = openHour * 60 + openMinute;
          const closeMinutes = closeHour * 60 + closeMinute;
          const currentMinutes = currentHour * 60 + currentMinute;
          
          // Check if the restaurant is open
          return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
        } catch (error) {
          logger.error(`Error processing opening hours for restaurant ${restaurant.name}:`, error);
          return false; // Exclude on error
        }
      });
      
      // Apply pagination after filtering
      total = restaurants.length;
      restaurants = restaurants.slice(skip, skip + limit);
      
      logger.info(`After openNow filtering: ${total} restaurants match, showing ${restaurants.length}`);
    } else {
      // Regular query without openNow
      logger.info('Using regular find with filters:', JSON.stringify(filter));
      
      // 7. Use Restaurant.find(filter) with the constructed filter
      restaurants = await Restaurant.find(filter)
        .sort(filter.$text ? { score: { $meta: 'textScore' }, [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } : sort)
        .skip(skip)
        .limit(limit)
        .select('-__v');
      total = await Restaurant.countDocuments(filter);
    }
    
    logger.info(`Query returned ${restaurants.length} restaurants, total: ${total}`);
    
    // 8. Return the filtered list of restaurants as JSON
    res.status(200).json({
      success: true,
      count: restaurants.length,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
      data: restaurants
    });
  } catch (error) {
    logger.error('Error in getAllRestaurants:', error);
    next(error);
  }
};

/**
 * Get restaurant by ID
 */
export const getRestaurantById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('-__v');
    
    if (!restaurant) {
      throw new ApiError(404, `Restaurant not found with id ${req.params.id}`);
    }
    
    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search restaurants by name, cuisine, or area
 */
export const searchRestaurants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
      return;
    }
    
    // Search using the text index
    const restaurants = await Restaurant.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(50)
    .select('-__v');
    
    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get restaurants by area
 */
export const getRestaurantsByArea = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const area = req.params.area;
    
    const restaurants = await Restaurant.find({ area })
      .sort('-rating')
      .limit(50)
      .select('-__v');
    
    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get restaurants near a location
 */
export const getRestaurantsNearLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { longitude, latitude, maxDistance = 2000 } = req.query;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const skip = (page - 1) * limit;
    
    if (!longitude || !latitude) {
      res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude'
      });
      return;
    }
    
    const lng = parseFloat(longitude as string);
    const lat = parseFloat(latitude as string);
    const distance = parseInt(maxDistance as string, 10);
    
    if (isNaN(lng) || isNaN(lat)) {
      res.status(400).json({
        success: false,
        message: 'Invalid longitude or latitude'
      });
      return;
    }
    
    // Build additional match filters for our query
    const matchFilters: any = {};
    
    // Handle openNow filter
    const openNow = req.query.openNow === 'true';
    if (openNow) {
      matchFilters.isOpen = true;
    }
    
    // Handle maxDeliveryTime filter (for delivery under 30 mins)
    const maxDeliveryTime = parseInt(req.query.maxDeliveryTime as string, 10);
    if (!isNaN(maxDeliveryTime)) {
      matchFilters.estimatedDeliveryTime = { $lte: maxDeliveryTime };
    }
    
    // Handle minRating filter (for minimum star rating)
    const minRating = parseFloat(req.query.minRating as string);
    if (!isNaN(minRating)) {
      matchFilters.rating = { $gte: minRating };
      console.log(`Setting minRating filter: rating >= ${minRating}`);
    }
    
    // Handle minReviews filter (for minimum number of reviews)
    const minReviews = parseInt(req.query.minReviews as string, 10);
    if (!isNaN(minReviews)) {
      matchFilters.reviewCount = { $gte: minReviews };
      console.log(`Setting minReviews filter: reviewCount >= ${minReviews}`);
    }
    
    console.log('Match filters:', JSON.stringify(matchFilters));
    
    // Create base geoNear stage that will be used for both count and results
    const geoNearStage = {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng, lat]
        },
        distanceField: "distanceInMeters",
        maxDistance: distance,
        spherical: true,
        // *** Add query to geoNear stage to fix filtering issue ***
        query: Object.keys(matchFilters).length > 0 ? matchFilters : {}
      }
    };
    
    // Now get the paginated results
    let restaurants = [];
    let total = 0;
    
    try {
      // First, get the total count
      const countPipeline: any[] = [
        geoNearStage,
        { $count: "total" }
      ];
      
      const countResult = await Restaurant.aggregate(countPipeline);
      total = countResult.length > 0 ? countResult[0].total : 0;
      console.log(`Total matched documents: ${total}`);
      
      // Then get the results with pagination
      const resultsPipeline: any[] = [
        geoNearStage,
        {
          $addFields: {
            distanceInKm: { $divide: ["$distanceInMeters", 1000] }
          }
        },
        { $skip: skip },
        { $limit: limit }
      ];
      
      restaurants = await Restaurant.aggregate(resultsPipeline);
      console.log(`Retrieved ${restaurants.length} restaurants for page ${page}`);
    } catch (error) {
      logger.error(`Error in getRestaurantsNearLocation: ${error}`);
      console.error('Full error:', error);
      // Return empty array on error
      restaurants = [];
    }
    
    res.status(200).json({
      success: true,
      count: total,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: restaurants,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available cuisines
 */
export const getAvailableCuisines = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Aggregate to get distinct cuisines
    const cuisines = await Restaurant.aggregate([
      { $unwind: '$cuisines' },
      { $group: { _id: '$cuisines' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: '$_id' } }
    ]);
    
    res.status(200).json({
      success: true,
      count: cuisines.length,
      data: cuisines
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available areas
 */
export const getAvailableAreas = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get distinct areas
    const areas = await Restaurant.distinct('area');
    
    res.status(200).json({
      success: true,
      count: areas.length,
      data: areas.sort()
    });
  } catch (error) {
    next(error);
  }
}; 
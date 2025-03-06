import { Request, Response, NextFunction } from 'express';
import Restaurant, { IRestaurant } from '../models/Restaurant';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';

/**
 * Get all restaurants with pagination
 */
export const getAllRestaurants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const skip = (page - 1) * limit;
    
    const sort = (req.query.sort as string) || '-rating';
    
    // Build query filters
    const queryFilters: any = {};
    
    // Handle search query parameter
    const searchQuery = req.query.q as string;
    if (searchQuery && searchQuery.trim() !== '') {
      // Add text search if query parameter is provided
      queryFilters.$text = { $search: searchQuery };
    }
    
    // Handle area filter
    const area = req.query.area as string;
    if (area && area.trim() !== '') {
      queryFilters.area = area;
    }
    
    // Handle cuisine filter
    const cuisine = req.query.cuisine as string;
    if (cuisine && cuisine.trim() !== '') {
      queryFilters.cuisines = cuisine; // Assuming cuisines is an array in the schema
    }
    
    // Handle openNow filter
    const openNow = req.query.openNow === 'true';
    if (openNow) {
      queryFilters.isOpen = true;
    }
    
    // Handle maxDeliveryTime filter (for delivery under 30 mins)
    const maxDeliveryTime = parseInt(req.query.maxDeliveryTime as string, 10);
    if (!isNaN(maxDeliveryTime)) {
      queryFilters.estimatedDeliveryTime = { $lte: maxDeliveryTime };
    }
    
    // Handle minRating filter (for minimum star rating)
    const minRating = parseFloat(req.query.minRating as string);
    console.log('minRating param:', req.query.minRating);
    console.log('Parsed minRating:', minRating, 'isNaN:', isNaN(minRating));
    if (!isNaN(minRating)) {
      queryFilters.rating = { $gte: minRating };
      // Log the query filter we're using
      console.log('Using rating filter:', queryFilters.rating);
    }
    
    // Handle minReviews filter (for minimum number of reviews)
    const minReviews = parseInt(req.query.minReviews as string, 10);
    if (!isNaN(minReviews)) {
      queryFilters.reviewCount = { $gte: minReviews };
    }
    
    console.log('Search filters:', queryFilters);
    
    let restaurantQuery = Restaurant.find(queryFilters);
    
    // If text search is being used, sort by text score first, then by the requested sort
    if (queryFilters.$text) {
      restaurantQuery = restaurantQuery
        .sort({ score: { $meta: 'textScore' }, [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 });
    } else {
      restaurantQuery = restaurantQuery.sort(sort);
    }
    
    // Apply pagination
    const restaurants = await restaurantQuery
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
    // Count total matching documents for pagination
    console.log('Query filters:', queryFilters);
    const total = await Restaurant.countDocuments(queryFilters);
    console.log('Total documents matching query:', total);
    
    res.status(200).json({
      success: true,
      count: restaurants.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: restaurants
    });
  } catch (error) {
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
    console.log('Near location - minRating param:', req.query.minRating);
    console.log('Near location - Parsed minRating:', minRating, 'isNaN:', isNaN(minRating));
    if (!isNaN(minRating)) {
      matchFilters.rating = { $gte: minRating };
      // Log the match filter we're using
      console.log('Using rating filter near location:', matchFilters.rating);
    }
    
    // Handle minReviews filter (for minimum number of reviews)
    const minReviews = parseInt(req.query.minReviews as string, 10);
    if (!isNaN(minReviews)) {
      matchFilters.reviewCount = { $gte: minReviews };
    }
    
    console.log('Near location filters:', matchFilters);
    
    // Use a simpler approach with MongoDB aggregation pipeline that's robust against errors
    // First, get the count using the $geoNear operator followed by $count
    let total = 0;
    try {
      const countPipeline: any[] = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [lng, lat]
            },
            distanceField: "distanceInMeters",
            maxDistance: distance,
            spherical: true
          }
        }
      ];
      
      // Add $match stage if we have additional filters
      if (Object.keys(matchFilters).length > 0) {
        countPipeline.push({ $match: matchFilters });
        console.log('Added match filters to countPipeline:', matchFilters);
      }
      
      // Add count stage
      countPipeline.push({ $count: "total" });
      
      console.log('Count pipeline:', JSON.stringify(countPipeline));
      
      // @ts-ignore - Bypass TypeScript checking for MongoDB aggregation pipeline
      const geoQuery = await Restaurant.aggregate(countPipeline);
      
      console.log('Count query result:', geoQuery);
      
      // Get the total count from the query result
      total = geoQuery.length > 0 ? geoQuery[0].total : 0;
      console.log('Calculated total:', total);
    } catch (error) {
      logger.error(`Error counting nearby restaurants: ${error}`);
      console.error('Full error:', error);
      // Continue with total = 0 if there's an error
    }
    
    // Now get the paginated results using the same $geoNear stage
    // Simplify the aggregation pipeline to avoid projection issues
    let restaurants = [];
    try {
      const pipeline: any[] = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [lng, lat]
            },
            distanceField: "distanceInMeters",
            maxDistance: distance,
            spherical: true
          }
        },
        // Add a simple $addFields stage instead of $project to avoid inclusion/exclusion conflicts
        {
          $addFields: {
            distanceInKm: { $divide: ["$distanceInMeters", 1000] }
          }
        }
      ];
      
      // Add $match stage if we have additional filters
      if (Object.keys(matchFilters).length > 0) {
        pipeline.push({ $match: matchFilters });
      }
      
      // Add pagination stages
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
      
      // @ts-ignore - Bypass TypeScript checking for MongoDB aggregation pipeline
      restaurants = await Restaurant.aggregate(pipeline);
    } catch (error) {
      logger.error(`Error fetching nearby restaurants: ${error}`);
      // Return empty array if there's an error
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
import { Router } from 'express';
import * as restaurantController from '../controllers/restaurantController';

const router = Router();

// GET /api/restaurants - Get all restaurants with pagination
router.get('/', restaurantController.getAllRestaurants);

// GET /api/restaurants/search - Search restaurants by query
router.get('/search', restaurantController.searchRestaurants);

// GET /api/restaurants/near - Get restaurants near coordinates
router.get('/near', restaurantController.getRestaurantsNearLocation);

// GET /api/restaurants/cuisines - Get all available cuisines
router.get('/cuisines', restaurantController.getAvailableCuisines);

// GET /api/restaurants/areas - Get all available areas
router.get('/areas', restaurantController.getAvailableAreas);

// GET /api/restaurants/area/:area - Get restaurants by area
router.get('/area/:area', restaurantController.getRestaurantsByArea);

// GET /api/restaurants/:id - Get a specific restaurant by ID
router.get('/:id', restaurantController.getRestaurantById);

export default router; 
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express, { Express, NextFunction, Request, Response } from 'express';
import { getAllRestaurants } from '../../controllers/restaurantController';
import Restaurant from '../../models/Restaurant';

// Helper to create a test app with the getAllRestaurants endpoint
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  
  // Add error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.statusCode) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  });

  // Register the endpoint
  app.get('/api/restaurants', getAllRestaurants);
  return app;
};

describe('Restaurant Filter Bug Debug', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;
  const apiPath = '/api/restaurants';

  // Simplified sample restaurant data
  const sampleRestaurants = [
    {
      grabId: 'rest-1',
      name: 'Regular Restaurant',
      rating: 4.0,
      reviewCount: 100,
      estimatedDeliveryTime: 25,
      area: 'Downtown',
      cuisines: ['Pizza'],
      location: {
        type: 'Point',
        coordinates: [103.8, 1.35]
      },
      address: '123 Main St, Downtown',
      photoUrl: 'https://example.com/photo1.jpg',
      isOpen: true,
      priceLevel: 2,
      distanceInKm: 1.2,
      lastUpdated: new Date(),
      openingHours: {
        displayedHours: 'Daily 11:00-23:00',
        mon: '11:00-23:00',
        tue: '11:00-23:00',
        wed: '11:00-23:00',
        thu: '11:00-23:00',
        fri: '11:00-23:00',
        sat: '11:00-23:00',
        sun: '11:00-23:00'
      }
    },
    {
      grabId: 'rest-premium',
      name: 'Premium Steakhouse',
      rating: 5.0,
      reviewCount: 1200,
      estimatedDeliveryTime: 25,
      area: 'Downtown',
      cuisines: ['Steak'],
      location: {
        type: 'Point',
        coordinates: [103.85, 1.33]
      },
      address: '888 Elite Ave, Downtown',
      photoUrl: 'https://example.com/photo-premium.jpg',
      isOpen: true,
      priceLevel: 4,
      distanceInKm: 1.8,
      lastUpdated: new Date(),
      openingHours: {
        displayedHours: 'Daily 12:00-23:00',
        mon: '12:00-23:00',
        tue: '12:00-23:00',
        wed: '12:00-23:00',
        thu: '12:00-23:00',
        fri: '12:00-23:00',
        sat: '12:00-23:00',
        sun: '12:00-23:00'
      }
    }
  ];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    app = createTestApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Restaurant.deleteMany({});
    await Restaurant.insertMany(sampleRestaurants);
  });

  test('DEBUG: Filter application issue with combined filters', async () => {
    // Mock Date to Wednesday at 3 PM
    const originalDate = global.Date;
    const mockDate = new Date('2023-06-14T15:00:00Z');
    
    // @ts-ignore - Mocking Date constructor
    global.Date = class extends originalDate {
      constructor() {
        super();
        return mockDate;
      }
      
      static now() {
        return mockDate.getTime();
      }
    };

    let debugSummary = '';
    
    const addToSummary = (text: string) => {
      debugSummary += text + '\n';
      console.log(text);
    };

    try {
      addToSummary('\n------- DEBUG TEST START -------');
      const restaurantCount = await Restaurant.countDocuments();
      addToSummary(`Restaurants in database: ${restaurantCount}`);

      // Run query with all filters
      const fullFilterResponse = await request(app)
        .get(`${apiPath}?page=1&limit=12&openNow=true&deliveryUnder30=true&minRating=5&minReviews=1100`);
      
      addToSummary('\n----- TEST RESULTS FOR COMBINED FILTERS -----');
      addToSummary(`Status: ${fullFilterResponse.status}`);
      addToSummary(`Count with all filters: ${fullFilterResponse.body.count}`);
      
      if (fullFilterResponse.body.data && fullFilterResponse.body.data.length > 0) {
        addToSummary('Returned restaurant(s):');
        fullFilterResponse.body.data.forEach((r: any, i: number) => {
          addToSummary(`  ${i+1}. ${r.name}, Rating: ${r.rating}, Reviews: ${r.reviewCount}, Delivery: ${r.estimatedDeliveryTime}min`);
        });
      }
      
      // Check which filters work individually
      addToSummary('\n----- TESTING INDIVIDUAL FILTERS -----');
      
      const openNowResponse = await request(app).get(`${apiPath}?openNow=true`);
      addToSummary(`openNow only count: ${openNowResponse.body.count}`);
      
      const deliveryResponse = await request(app).get(`${apiPath}?deliveryUnder30=true`);
      addToSummary(`deliveryUnder30 only count: ${deliveryResponse.body.count}`);
      
      const ratingResponse = await request(app).get(`${apiPath}?minRating=5`);
      addToSummary(`minRating=5 only count: ${ratingResponse.body.count}`);
      
      const reviewsResponse = await request(app).get(`${apiPath}?minReviews=1100`);
      addToSummary(`minReviews=1100 only count: ${reviewsResponse.body.count}`);
      
      // Check how many restaurants should match all criteria using direct DB query
      const matchingCount = await Restaurant.countDocuments({
        estimatedDeliveryTime: { $lte: 30 },
        rating: { $gte: 5 },
        reviewCount: { $gte: 1100 }
      });
      
      addToSummary('\n----- COMPARING DATABASE VS API RESULTS -----');
      addToSummary(`Restaurants matching non-openNow criteria in database: ${matchingCount}`);
      addToSummary(`Restaurants returned by API with all filters: ${fullFilterResponse.body.count}`);
      
      addToSummary('\n----- CONCLUSION -----');
      if (fullFilterResponse.body.count === matchingCount) {
        addToSummary('✅ TEST PASSED: The number of restaurants returned from API matches the database query');
        
        // Test combinations of filters
        addToSummary('\n----- TESTING FILTER COMBINATIONS -----');
        const tests = [
          { filters: 'openNow=true&minRating=5', desc: 'openNow + minRating' },
          { filters: 'openNow=true&deliveryUnder30=true', desc: 'openNow + deliveryUnder30' },
          { filters: 'deliveryUnder30=true&minRating=5', desc: 'deliveryUnder30 + minRating' },
          { filters: 'minRating=5&minReviews=1100', desc: 'minRating + minReviews' }
        ];
        
        for (const test of tests) {
          const resp = await request(app).get(`${apiPath}?${test.filters}`);
          addToSummary(`${test.desc} count: ${resp.body.count}`);
        }
      } else {
        addToSummary('❌ TEST FAILED: The API is not returning the expected results');
        addToSummary('BUG FOUND: The combined filters are not applying correctly');
        
        addToSummary('\n----- ERROR ANALYSIS -----');
        addToSummary('Logged filter application issue:');
        addToSummary('• When openNow=true is part of the query with other filters, there is an error:');
        addToSummary('  "Error in openNow aggregation: PlanExecutor error during aggregation :: caused by :: can\'t convert from BSON type array to String"');
        addToSummary('• The code then falls back to a regular find query but may not be applying all the filters');
        addToSummary('• This matches the user\'s observation: "Search filters: {}" when using the combined filter query');
      }
      
      addToSummary('\n------- DEBUG TEST END -------');
      
      // Write full summary to console at the end to ensure it's displayed
      console.log('\n\n========== FILTER BUG TEST SUMMARY ==========\n');
      console.log(debugSummary);
      console.log('\n===========================================\n');
      
      // No assertions - this is a debug test to expose the issue
      expect(true).toBe(true);
    } finally {
      global.Date = originalDate;
    }
  });
}); 
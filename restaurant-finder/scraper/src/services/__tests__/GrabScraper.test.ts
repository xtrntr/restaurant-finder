import axios from 'axios';
import mongoose from 'mongoose';
import GrabScraper from '../GrabScraper';
import Restaurant from '../../models/Restaurant';

// Mock axios and mongoose
jest.mock('axios');
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  models: { Restaurant: {} },
  model: jest.fn().mockReturnValue({
    findOneAndUpdate: jest.fn()
  })
}));

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('GrabScraper', () => {
  let scraper: GrabScraper;
  
  beforeEach(() => {
    jest.clearAllMocks();
    scraper = new GrabScraper(100, 1, 1); // Fast settings for testing
  });
  
  describe('fetchPage', () => {
    it('should fetch restaurants for a given coordinate', async () => {
      // Setup mock response
      const mockRestaurants = [
        {
          id: 'SGDD04944',
          address: { name: "McDonald's - Boat Quay" },
          latlng: { latitude: 1.2857211372800634, longitude: 103.84982956837393 },
          estimatedDeliveryTime: 30,
          merchantBrief: {
            cuisine: ['Burger', 'Fast Food', 'Halal'],
            photoHref: 'https://example.com/photo.jpg',
            smallPhotoHref: 'https://example.com/small.jpg',
            iconHref: 'https://example.com/icon.jpg',
            isIntegrated: true,
            openHours: {
              open: true,
              displayedHours: '00:01-03:45 04:00-10:50 11:00-23:59',
              mon: '00:01-03:45 04:00-10:50 11:00-23:59'
            },
            distanceInKm: 1.542,
            rating: 4.1,
            vote_count: 4951,
            promo: {},
            deliverBy: 'GRAB',
            displayInfo: {
              primaryText: "McDonald's - Boat Quay"
            },
            priceTag: 1,
            deliverOptions: 'DELIVERY_DINEIN'
          },
          businessType: 'FOOD'
        }
      ];
      
      mockAxios.post.mockResolvedValueOnce({
        data: {
          searchResult: {
            searchMerchants: mockRestaurants
          }
        }
      });
      
      // Access the private method using any type casting
      const result = await (scraper as any).fetchPage(1.287953, 103.851784, '', 0);
      
      // Assertions
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://portal.grab.com/foodweb/v2/search',
        {
          latlng: '1.287953,103.851784',
          keyword: '',
          offset: 0,
          pageSize: 32,
          countryCode: 'SG'
        },
        expect.any(Object)
      );
      
      expect(result).toEqual(mockRestaurants);
    });
    
    it('should handle rate limiting (429 responses)', async () => {
      // Setup mocks
      mockAxios.post.mockRejectedValueOnce({
        response: { status: 429 }
      }).mockResolvedValueOnce({
        data: {
          searchResult: {
            searchMerchants: []
          }
        }
      });
      
      // Call the method (it will retry after the first 429)
      const result = await (scraper as any).fetchPage(1.287953, 103.851784, '', 0);
      
      // Verify the retry
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });
  });
  
  describe('transformRestaurant', () => {
    it('should transform GrabRestaurant to our data model', () => {
      const grabRestaurant = {
        id: 'SGDD04944',
        address: { name: "McDonald's - Boat Quay" },
        latlng: { latitude: 1.2857211372800634, longitude: 103.84982956837393 },
        estimatedDeliveryTime: 30,
        merchantBrief: {
          cuisine: ['Burger', 'Fast Food', 'Halal'],
          photoHref: 'https://example.com/photo.jpg',
          smallPhotoHref: 'https://example.com/small.jpg',
          iconHref: 'https://example.com/icon.jpg',
          isIntegrated: true,
          openHours: {
            open: true,
            displayedHours: '00:01-03:45 04:00-10:50 11:00-23:59',
            mon: '00:01-03:45 04:00-10:50 11:00-23:59'
          },
          distanceInKm: 1.542,
          rating: 4.1,
          vote_count: 4951,
          promo: {},
          deliverBy: 'GRAB',
          displayInfo: {
            primaryText: "McDonald's - Boat Quay"
          },
          priceTag: 1,
          deliverOptions: 'DELIVERY_DINEIN'
        },
        businessType: 'FOOD'
      };
      
      const area = 'Central';
      
      // Call the private method
      const result = (scraper as any).transformRestaurant(grabRestaurant, area);
      
      // Assertions for correct transformation
      expect(result).toMatchObject({
        grabId: 'SGDD04944',
        name: "McDonald's - Boat Quay",
        location: {
          type: 'Point',
          coordinates: [103.84982956837393, 1.2857211372800634]
        },
        address: "McDonald's - Boat Quay",
        cuisines: ['Burger', 'Fast Food', 'Halal'],
        priceLevel: 1,
        rating: 4.1,
        reviewCount: 4951,
        photoUrl: 'https://example.com/photo.jpg',
        isOpen: true,
        area: 'Central'
      });
    });
  });
}); 
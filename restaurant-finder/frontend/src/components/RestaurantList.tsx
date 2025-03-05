import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Restaurant, ApiResponse, SearchParams } from '../types';
import { geocodeAddress } from '../services/GeocodeService';
import RestaurantMap from './RestaurantMap';

// Step 3.1: Adding search functionality
const RestaurantList: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [totalRestaurants, setTotalRestaurants] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [searchingNearby, setSearchingNearby] = useState<boolean>(false);
  const [locationSearched, setLocationSearched] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([1.3521, 103.8198]); // Default Singapore center
  const [mapZoom, setMapZoom] = useState<number>(12);
  
  // Use ref to track if initial load has happened
  const initialLoadDone = useRef(false);
  // Use ref to track if page change is from URL or user action
  const isManualPageChange = useRef(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  // Create refs for restaurant list container and restaurant cards
  const restaurantListRef = useRef<HTMLDivElement>(null);
  const restaurantRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Parse and set up search parameters from URL (using useCallback to fix dependency issue)
  const getSearchParams = useCallback((): SearchParams => {
    return {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
      q: searchParams.get('q') || undefined,
      lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
      lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined,
      distance: searchParams.get('distance') ? parseFloat(searchParams.get('distance')!) : undefined
    };
  }, [searchParams]);
  
  // Function to check if a search query might be a location or postal code
  const isLocationSearch = (query: string): boolean => {
    // Check for Singapore postal code pattern (6 digits)
    if (/^\d{6}$/.test(query)) {
      return true;
    }
    
    // Common location keywords for Singapore
    const locationKeywords = [
      'road', 'street', 'ave', 'avenue', 'drive', 'lane', 'place', 'way',
      'clementi', 'jurong', 'tampines', 'bedok', 'woodlands', 'yishun',
      'hougang', 'sengkang', 'punggol', 'pasir', 'bukit', 'choa', 'ang',
      'geylang', 'kallang', 'toa', 'queenstown', 'central', 'marina', 'changi',
      'downtown', 'orchard', 'novena', 'bugis', 'boon'
    ];
    
    const lowerQuery = query.toLowerCase();
    return locationKeywords.some(keyword => lowerQuery.includes(keyword));
  };
  
  // Handle search submission
  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Get current params and create a new params object
    const currentParams = getSearchParams();
    let newParams: SearchParams = {
      ...currentParams,
      page: 1
    };
    
    setSearchingNearby(false);
    setLocationSearched(null);
    
    // Check if this might be a location search
    if (isLocationSearch(inputValue)) {
      console.log("Detected possible location search:", inputValue);
      setSearchingNearby(true);
      
      // Try to geocode the location using the GeocodeService
      const result = await geocodeAddress(inputValue);
      if (result) {
        console.log("Geocoded to coordinates:", result);
        // If we have a formatted address, use it instead of the original query
        if (result.formattedAddress) {
          console.log("Using formatted address:", result.formattedAddress);
          setLocationSearched(result.formattedAddress);
          
          // If we have a place type, add it to the location info display
          if (result.placeType) {
            setLocationSearched(`${result.formattedAddress} (${result.placeType})`);
          }
          
          // For postal codes, add specific messaging
          if (result.placeType === 'postcode') {
            setLocationSearched(`Postal code ${inputValue} (${result.displayName || 'Singapore'})`);
          }
        }
        
        // Adjust the search radius based on the type of location
        let searchRadius = 2000; // default 2km
        
        if (result.placeType === 'suburb' || result.placeType === 'quarter') {
          searchRadius = 3000; // 3km for larger areas
        } else if (result.placeType === 'postcode') {
          searchRadius = 1500; // 1.5km for postal codes (more precise)
        } else if (result.placeType === 'road') {
          searchRadius = 1000; // 1km for roads (more precise)
        }
        
        newParams = {
          ...newParams,
          lat: result.lat,
          lng: result.lng,
          distance: searchRadius,
          q: undefined // Clear any text search
        };
        setLocationSearched(inputValue);
      } else {
        // Fall back to text search if geocoding fails
        newParams.q = inputValue;
      }
    } else {
      // Regular restaurant name search
      newParams.q = inputValue;
      // Clear any location params
      newParams.lat = undefined;
      newParams.lng = undefined;
      newParams.distance = undefined;
    }
    
    // Update searchQuery state to match what we're searching for
    setSearchQuery(inputValue);
    
    // Build new URL
    const newSearchParams = new URLSearchParams();
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined) {
        newSearchParams.set(key, String(value));
      }
    });
    
    // Update URL and trigger data fetch
    navigate(`/restaurants?${newSearchParams.toString()}`);
    fetchRestaurants(newParams);
  };
  
  // Fetch restaurants with pagination
  const fetchRestaurants = useCallback(async (params: SearchParams) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.limit) queryParams.set('limit', params.limit.toString());
      if (params.q) queryParams.set('q', params.q);
      
      // Handle location-based search
      if (params.lat !== undefined && params.lng !== undefined) {
        queryParams.set('latitude', params.lat.toString());
        queryParams.set('longitude', params.lng.toString());
        if (params.distance) {
          queryParams.set('maxDistance', params.distance.toString());
        }
        
        // Use the /near endpoint for geospatial queries
        console.log('Fetching nearby restaurants:', queryParams.toString());
        const response = await fetch(`/api/restaurants/near?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch nearby restaurants');
        }
        
        const data = await response.json();
        console.log('Nearby API Response:', data);
        
        if (data.success) {
          const safeRestaurants = data.data.map((restaurant: any) => ({
            ...restaurant,
            name: String(restaurant.name || 'Unnamed Restaurant'),
            address: String(restaurant.address || 'No address'),
            cuisines: Array.isArray(restaurant.cuisines) ? restaurant.cuisines : []
          }));
          
          setRestaurants(safeRestaurants);
          
          // Use pagination data from the API response
          if (data.pagination) {
            setTotalRestaurants(data.pagination.total || data.count || 0);
            setCurrentPage(data.pagination.page || params.page || 1);
            setTotalPages(data.pagination.pages || 1);
          } else if (data.currentPage !== undefined && data.totalPages !== undefined) {
            // Use the root-level pagination properties if available
            setTotalRestaurants(data.count || 0);
            setCurrentPage(data.currentPage || params.page || 1);
            setTotalPages(data.totalPages || 1);
          } else {
            // Fallback to calculating from count
            setTotalRestaurants(data.count || 0);
            setCurrentPage(params.page || 1);
            const limit = params.limit || 12;
            const calculatedTotalPages = Math.ceil((data.count || 0) / limit) || 1;
            setTotalPages(calculatedTotalPages);
          }
        } else {
          setError('Failed to fetch nearby restaurants');
        }
        
        setLoading(false);
        return;
      }
      
      // Regular search
      console.log('Fetching with params:', queryParams.toString());
      const response = await fetch(`/api/restaurants?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch restaurants');
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        // Process each restaurant to ensure all fields are valid
        const safeRestaurants = data.data.map((restaurant: any) => ({
          ...restaurant,
          name: String(restaurant.name || 'Unnamed Restaurant'),
          address: String(restaurant.address || 'No address'),
          cuisines: Array.isArray(restaurant.cuisines) ? restaurant.cuisines : []
        }));
        
        setRestaurants(safeRestaurants);
        
        // The API returns count and pagination differently than we expected
        // Update to use the correct structure
        if (data.pagination) {
          setTotalRestaurants(data.pagination.total || data.count || 0);
          setCurrentPage(data.pagination.page || params.page || 1);
          setTotalPages(data.pagination.pages || 1);
        } else {
          setTotalRestaurants(data.count || 0);
          setCurrentPage(params.page || 1);
          
          // Calculate totalPages if not provided
          const limit = params.limit || 12;
          const calculatedTotalPages = Math.ceil((data.count || 0) / limit) || 1;
          setTotalPages(calculatedTotalPages);
        }
      } else {
        setError('Failed to fetch restaurants');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Handle page change - this is the only place we trigger data loading
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    const currentParams = getSearchParams();
    const isLocationSearch = currentParams.lat !== undefined && currentParams.lng !== undefined;
    
    console.log(`Changing to page ${newPage} of ${totalPages} (${isLocationSearch ? 'location search' : 'regular search'})`);
    
    // Update URL with new page
    const newParams = new URLSearchParams();
    
    // Copy all existing params
    Object.entries({
      ...currentParams,
      page: newPage
    }).forEach(([key, value]) => {
      if (value !== undefined) {
        newParams.set(key, String(value));
      }
    });
    
    // Set flag to indicate manual page change
    isManualPageChange.current = true;
    
    // Navigate to new URL
    navigate(`/restaurants?${newParams.toString()}`);
    
    // Force fetch with the new page
    fetchRestaurants({
      ...currentParams,
      page: newPage
    });
  };
  
  // Load initial data and handle page changes from URL
  useEffect(() => {
    // Only react to URL changes if not triggered by handlePageChange
    if (!initialLoadDone.current) {
      // Initial load - initialize everything
      console.log('Initial load - fetching data');
      const params = getSearchParams();
      fetchRestaurants(params);
      initialLoadDone.current = true;
      
      // Initialize search input from URL
      const queryParam = searchParams.get('q') || '';
      setSearchQuery(queryParam);
      setInputValue(queryParam);
      
      // Check if we're doing a location search
      if (searchParams.get('lat') && searchParams.get('lng')) {
        setSearchingNearby(true);
      }
    } else if (!isManualPageChange.current) {
      // URL changed externally (like browser back/forward) - handle it
      console.log('URL changed externally, updating page');
      const pageParam = parseInt(searchParams.get('page') || '1');
      if (pageParam !== currentPage) {
        setCurrentPage(pageParam);
        const params = getSearchParams();
        fetchRestaurants(params);
      }
    }
    
    // Reset the manual page change flag
    isManualPageChange.current = false;
  }, [location.search, getSearchParams, fetchRestaurants, currentPage]);
  
  // Handle restaurant selection
  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    
    // If the restaurant has coordinates, center the map on it
    if (restaurant.location && restaurant.location.coordinates) {
      setMapCenter([
        restaurant.location.coordinates[1],
        restaurant.location.coordinates[0]
      ]);
      setMapZoom(15); // Zoom in when a restaurant is selected
    }
    
    // Scroll to the selected restaurant in the list
    setTimeout(() => {
      if (restaurantRefs.current[restaurant._id] && restaurantListRef.current) {
        const card = restaurantRefs.current[restaurant._id];
        const container = restaurantListRef.current;
        
        if (card) {
          // Calculate scroll position
          const cardTop = card.offsetTop;
          const containerScrollTop = container.scrollTop;
          const containerHeight = container.clientHeight;
          const cardHeight = card.clientHeight;
          
          // Check if card is outside visible area
          if (cardTop < containerScrollTop || cardTop + cardHeight > containerScrollTop + containerHeight) {
            // Scroll to make card visible in the middle of the container if possible
            container.scrollTo({
              top: cardTop - (containerHeight / 2) + (cardHeight / 2),
              behavior: 'smooth'
            });
          }
        }
      }
    }, 100);
  };

  // Update map center and zoom when doing location-based search
  useEffect(() => {
    const params = getSearchParams();
    if (params.lat && params.lng) {
      setMapCenter([params.lat, params.lng]);
      
      // Set appropriate zoom based on search distance
      if (params.distance) {
        // Rough approximation: smaller zoom for larger distances
        if (params.distance > 5000) setMapZoom(12);
        else if (params.distance > 2000) setMapZoom(13);
        else if (params.distance > 1000) setMapZoom(14);
        else setMapZoom(15);
      } else {
        setMapZoom(14); // Default zoom for location search
      }
    }
  }, [getSearchParams]);
  
  return (
    <div className="restaurant-list-container">
      <h1>Restaurants</h1>
      
      {/* Search section */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search by restaurant name or location (e.g., Clementi, Orchard, 120115)"
            className="search-input"
          />
          <button type="submit" className="search-button">
            Search
          </button>
        </form>
        <div className="search-help">
          <small>
            Try searching for a restaurant name or location (e.g., "Pizza", "Clementi", or a postal code like "120115")
          </small>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Loading restaurants...</div>
      ) : (
        <>
          <div className="results-summary">
            {searchingNearby && locationSearched ? (
              <>Found {totalRestaurants} restaurants near {locationSearched}
                {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
              </>
            ) : (
              <>
                Found {totalRestaurants} restaurants
                {searchParams.get('q') && ` matching "${searchParams.get('q')}"`}
                {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
              </>
            )}
          </div>
          
          <div className="restaurant-view-container">
            <div className="restaurant-list-side" ref={restaurantListRef}>
              <div className="restaurant-list-enhanced">
                {restaurants.length > 0 ? (
                  <div className="restaurant-cards">
                    {restaurants.map((restaurant) => (
                      <div
                        key={restaurant._id}
                        ref={el => restaurantRefs.current[restaurant._id] = el}
                        className={`restaurant-card ${selectedRestaurant?._id === restaurant._id ? 'selected' : ''}`}
                        onClick={() => handleRestaurantSelect(restaurant)}
                      >
                        <div className="restaurant-photo">
                          <img 
                            src={restaurant.photoUrl || 'https://via.placeholder.com/120x120?text=No+Image'} 
                            alt={restaurant.name} 
                          />
                        </div>
                        <div className="restaurant-info">
                          <div>
                            <h3>{restaurant.name}</h3>
                            <p className="restaurant-cuisines">{restaurant.cuisines.join(', ')}</p>
                            <p className="restaurant-address">{restaurant.address}</p>
                          </div>
                          <div>
                            <div className="restaurant-details">
                              {restaurant.rating !== undefined && (
                                <span className="restaurant-rating">★ {restaurant.rating.toFixed(1)}</span>
                              )}
                              <span 
                                className={`restaurant-status ${restaurant.isOpen ? 'open' : 'closed'}`}
                              >
                                {restaurant.isOpen ? 'Open' : 'Closed'}
                              </span>
                              {restaurant.distanceInKm !== undefined && (
                                <span className="restaurant-distance">{restaurant.distanceInKm.toFixed(1)} km</span>
                              )}
                            </div>
                            <a 
                              href={`/restaurant/${restaurant._id}`} 
                              className="view-details" 
                              onClick={(e) => e.stopPropagation()} 
                            >
                              View Details
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-results">No restaurants found.</div>
                )}
              </div>
            </div>
            
            <div className="restaurant-map-side">
              <div className="restaurant-map-container">
                <RestaurantMap 
                  restaurants={restaurants}
                  selectedRestaurant={selectedRestaurant}
                  onRestaurantSelect={handleRestaurantSelect}
                  center={mapCenter}
                  zoom={mapZoom}
                  height="100%"
                />
              </div>
            </div>
          </div>
          
          {/* Pagination controls - Show for all searches with multiple pages */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RestaurantList; 
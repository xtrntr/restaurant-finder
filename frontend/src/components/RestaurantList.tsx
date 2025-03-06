// RestaurantList.tsx - Updated
// Simplified restaurant-card rendering to:
// - Use fixed dimensions (160px height) for consistency.
// - Ensure photo fills full height without truncation or overflow.
// - Prevent text truncation/overflow in restaurant-info-lines.
// - Avoid regression bugs by removing dynamic sizing logic.

// The restaurant cards use a CSS Grid layout for consistent display:
// - Each card has a 2-column grid (fixed width photo + flexible text content)
// - Photos are constrained to their grid cell, preventing overflow issues
// - Text content is arranged in a vertical stack with proper overflow handling
// - All information is displayed without truncation or omission

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Restaurant, ApiResponse, SearchParams } from '../types';
import { geocodeAddress } from '../services/GeocodeService';
import RestaurantMap from './RestaurantMap';
import FilterOptions from './FilterOptions';

// Helper function to format date as "X time ago"
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const updatedDate = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - updatedDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
};

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
  const [fitBoundsFlag, setFitBoundsFlag] = useState<number>(0);
  // Filter state
  const [filters, setFilters] = useState({
    openNow: false,
    deliveryUnder30: false,
    minRating: null as number | null,
    minReviews: null as number | null
  });
  // We still need the ref for the cleanup, but we use it less frequently
  const fitBoundsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  
  // Parse and set up search parameters from URL (using useCallback to fix dependency issue)
  const getSearchParams = useCallback((): SearchParams => {
    return {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
      q: searchParams.get('q') || undefined,
      lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
      lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined,
      distance: searchParams.get('distance') ? parseFloat(searchParams.get('distance')!) : undefined,
      // Add filter parameters
      openNow: searchParams.get('openNow') === 'true',
      deliveryUnder30: searchParams.get('deliveryUnder30') === 'true',
      minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
      minReviews: searchParams.get('minReviews') ? parseInt(searchParams.get('minReviews')!, 10) : undefined
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
      
      // Add filter parameters to query
      if (params.openNow) queryParams.set('openNow', 'true');
      if (params.deliveryUnder30) queryParams.set('deliveryUnder30', 'true');
      if (params.minRating !== undefined && params.minRating !== null) {
        queryParams.set('minRating', params.minRating.toString());
      }
      if (params.minReviews !== undefined && params.minReviews !== null) {
        queryParams.set('minReviews', params.minReviews.toString());
      }
      
      // Define a function to update the state with fetched restaurants
      // and trigger bounds fitting with a proper delay
      const updateRestaurantsAndFitBounds = (restaurants: Restaurant[]) => {
        console.log('Step 4 [RestaurantList]: Setting restaurants, count:', restaurants.length);
        
        // Simply update restaurants state - the map will react to this change directly
        setRestaurants(restaurants);
        
        // Increment fitBoundsFlag for completeness (the imperative MapBoundsEffect will handle this)
        setFitBoundsFlag(prevFlag => prevFlag + 1);
      };

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
          
          // Update restaurants and fit bounds
          updateRestaurantsAndFitBounds(safeRestaurants);
          
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
        
        // Update restaurants and fit bounds
        updateRestaurantsAndFitBounds(safeRestaurants);
        
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
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    
    // Set loading state first to provide immediate feedback
    setLoading(true);
    
    const currentParams = getSearchParams();
    const isLocationSearch = currentParams.lat !== undefined && currentParams.lng !== undefined;
    
    console.log(`Step 4 [RestaurantList]: Changing to page ${newPage} of ${totalPages} (${isLocationSearch ? 'location search' : 'regular search'})`);
    
    // Update URL with new page
    const newParams = new URLSearchParams();
    
    // Copy all existing params, including filter parameters
    Object.entries({
      ...currentParams,
      page: newPage
    }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
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
    
    // Scroll to top of the list for better user experience
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
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
      
      // Initialize filter states from URL
      setFilters({
        openNow: searchParams.get('openNow') === 'true',
        deliveryUnder30: searchParams.get('deliveryUnder30') === 'true',
        minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null,
        minReviews: searchParams.get('minReviews') ? parseInt(searchParams.get('minReviews')!, 10) : null
      });
    } else if (!isManualPageChange.current) {
      // URL changed externally (like browser back/forward) - handle it
      console.log('URL changed externally, updating page');
      const pageParam = parseInt(searchParams.get('page') || '1');
      if (pageParam !== currentPage) {
        setCurrentPage(pageParam);
        const params = getSearchParams();
        fetchRestaurants(params);
        
        // Update filter states from URL
        setFilters({
          openNow: searchParams.get('openNow') === 'true',
          deliveryUnder30: searchParams.get('deliveryUnder30') === 'true',
          minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null,
          minReviews: searchParams.get('minReviews') ? parseInt(searchParams.get('minReviews')!, 10) : null
        });
      }
    }
    
    // Reset the manual page change flag
    isManualPageChange.current = false;
  }, [location.search, getSearchParams, fetchRestaurants, currentPage]);
  
  // Handle restaurant selection
  const handleRestaurantSelect = (restaurant: Restaurant) => {
    // Don't do anything if this restaurant is already selected
    if (selectedRestaurant && selectedRestaurant._id === restaurant._id) {
      return;
    }
    
    // First update the selected restaurant state to highlight the marker
    setSelectedRestaurant(restaurant);
    
    // If the restaurant has coordinates, center the map on it
    if (restaurant.location && restaurant.location.coordinates) {
      // Update the center to move the map to the selected restaurant
      // Only update the center, don't change zoom
      setMapCenter([
        restaurant.location.coordinates[1],
        restaurant.location.coordinates[0]
      ]);
      
      // We don't change the zoom here to maintain the current zoom level
      console.log(`Centering map on restaurant: ${restaurant.name} at ${restaurant.location.coordinates[1]}, ${restaurant.location.coordinates[0]} (keeping current zoom)`);
    }
    
    // Ensure the selected restaurant card is visible in the list
    const card = restaurantRefs.current[restaurant._id];
    if (card && restaurantListRef.current) {
      // Ensure smooth scrolling to the selected card
      setTimeout(() => {
        card.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 50);
    }
  };

  // Update map center and zoom when doing location-based search
  useEffect(() => {
    const params = getSearchParams();
    if (params.lat && params.lng) {
      // Only update the center if it actually changed
      const newCenter: [number, number] = [params.lat, params.lng];
      if (newCenter[0] !== mapCenter[0] || newCenter[1] !== mapCenter[1]) {
        setMapCenter(newCenter);
      }
      
      // Only update zoom for a new location search, not for other URL changes
      if (searchParams.get('q') !== searchQuery || !initialLoadDone.current) {
        // Set appropriate zoom based on search distance
        let newZoom = 14; // Default zoom for location search
        
        if (params.distance) {
          // Rough approximation: smaller zoom for larger distances
          if (params.distance > 5000) newZoom = 12;
          else if (params.distance > 2000) newZoom = 13;
          else if (params.distance > 1000) newZoom = 14;
          else newZoom = 15;
        }
        
        setMapZoom(newZoom);
      }
    }
  }, [getSearchParams, mapCenter, searchQuery, searchParams, initialLoadDone]);
  
  // Handle map zoom changes
  const handleZoomChange = (newZoom: number) => {
    // Only update zoom state if it actually changed
    if (mapZoom !== newZoom) {
      setMapZoom(newZoom);
    }
  };

  // Handle manually fitting bounds to all markers
  const handleFitBounds = () => {
    console.log('Manual fit bounds requested');
    
    // Check if we have restaurants with valid coordinates
    const hasValidCoordinates = restaurants.some(r => 
      r?.location?.coordinates && 
      Array.isArray(r.location.coordinates) && 
      r.location.coordinates.length === 2
    );
    
    if (hasValidCoordinates) {
      console.log('Manually triggering fit bounds with valid coordinates');
      setFitBoundsFlag(prev => prev + 1);
    } else {
      console.warn('Cannot fit bounds: no restaurants with valid coordinates');
      // Could show a toast or notification here
    }
  };

  // Clean up timeouts on component unmount
  useEffect(() => {
    console.log('Step 4 [RestaurantList]: Setting up cleanup');
    return () => {
      // Clear any pending fit bounds timeouts
      if (fitBoundsTimeoutRef.current) {
        clearTimeout(fitBoundsTimeoutRef.current);
        fitBoundsTimeoutRef.current = null;
      }
      console.log('Step 4 [RestaurantList]: Cleanup performed');
    };
  }, []);

  // Handle filter changes
  const handleFilterChange = (filterName: string, value: any) => {
    console.log(`Filter changed: ${filterName} = ${value} (type: ${typeof value})`);
    
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value
    }));
    
    // Apply filters immediately
    const currentParams = getSearchParams();
    
    // Create new search parameters with current filters
    const newParams: SearchParams = {
      ...currentParams,
      page: 1, // Reset to first page when filters change
    };
    
    // Apply the updated filter
    if (filterName === 'openNow') {
      newParams.openNow = value;
    } else if (filterName === 'deliveryUnder30') {
      newParams.deliveryUnder30 = value;
    } else if (filterName === 'minRating') {
      console.log('Setting minRating param to:', value);
      newParams.minRating = value;
    } else if (filterName === 'minReviews') {
      newParams.minReviews = value;
    }
    
    // Build URL parameters
    const urlParams = new URLSearchParams();
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        console.log(`Setting URL param: ${key} = ${value}`);
        urlParams.set(key, String(value));
      }
    });
    
    // Update URL and trigger fetch
    navigate(`/restaurants?${urlParams.toString()}`);
    fetchRestaurants(newParams);
  };

  return (
    <div className="restaurant-list-container">
      {/* Search section */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-row">
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search restaurants or locations"
                className="search-input"
              />
            </form>
          
            {/* Add filter options component next to search bar */}
            <FilterOptions 
              filters={filters} 
              onFilterChange={handleFilterChange} 
            />
          </div>
          
          <div className="search-help">
            <small>
              Try searching for restaurant names, cuisine types, or locations
            </small>
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Loading restaurants...</div>
      ) : (
        <>
          <div className="restaurant-view-container">
            <div className="restaurant-list-side">
              <div className="results-header">
                <h2>{totalRestaurants} restaurants found</h2>
                
                {/* Add pagination inside results-header */}
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    &gt;
                  </button>
                </div>
              </div>
              
              <div className="restaurant-list-enhanced">
                <div className="restaurant-cards">
                  {restaurants.length > 0 ? (
                    restaurants.map((restaurant) => (
                      <div
                        key={restaurant._id}
                        className={`restaurant-card ${selectedRestaurant?._id === restaurant._id ? 'selected' : ''}`}
                        onClick={() => handleRestaurantSelect(restaurant)}
                        ref={el => {
                          restaurantRefs.current[restaurant._id] = el;
                          if (selectedRestaurant?._id === restaurant._id) {
                            selectedCardRef.current = el;
                          }
                        }}
                      >
                        {/* Photo grid cell - full height */}
                        <div className="restaurant-photo">
                          <img 
                            src={restaurant.photoUrl || '/images/default-restaurant.jpg'} 
                            alt={restaurant.name}
                          />
                        </div>
                        
                        {/* Info grid cell - structured information */}
                        <div className="restaurant-info-lines">
                          {/* Line 1: Restaurant name - address (bolded) */}
                          <div className="info-line-1">
                            {restaurant.name}{restaurant.address && ` - ${restaurant.address}`}
                          </div>
                          
                          {/* Line 2: Opening hours as centered text, not an indicator */}
                          {restaurant.openingHours && (
                            <div className="info-line-2">
                              Hours: {(() => {
                                const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                                const today = days[new Date().getDay()];
                                return restaurant.openingHours[today as keyof typeof restaurant.openingHours] || restaurant.openingHours.displayedHours;
                              })()}
                            </div>
                          )}
                          
                          {/* Line 3: All indicators in one line (rating+reviews combined, price, combined distance+time, updated) */}
                          <div className="info-line-3">
                            {restaurant.rating !== undefined && (
                              <span className="restaurant-rating">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={(i < Math.round(restaurant.rating || 0)) ? 'star-filled' : 'star-unfilled'}>
                                    {(i < Math.round(restaurant.rating || 0)) ? '★' : '☆'}
                                  </span>
                                ))}
                                {restaurant.reviewCount !== undefined && (
                                  <span className="reviews-count"> {restaurant.reviewCount} reviews</span>
                                )}
                              </span>
                            )}
                            
                            {restaurant.priceLevel !== undefined && (
                              <span className="restaurant-price-level">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={(i < (restaurant.priceLevel || 0)) ? 'price-filled' : 'price-unfilled'}>
                                    $
                                  </span>
                                ))}
                              </span>
                            )}
                            
                            {/* Combined distance and delivery time indicator */}
                            {(restaurant.distanceInKm !== undefined || restaurant.estimatedDeliveryTime) && (
                              <span className="restaurant-location-time">
                                {restaurant.distanceInKm !== undefined && restaurant.distanceInKm >= 0.1 && (
                                  <span className="distance-value">🏃 {restaurant.distanceInKm.toFixed(1)} km</span>
                                )}
                                {restaurant.distanceInKm !== undefined && restaurant.distanceInKm >= 0.1 && restaurant.estimatedDeliveryTime && ', '}
                                {restaurant.estimatedDeliveryTime && (
                                  <span className="time-value">
                                    <span className="delivery-icon">🕒 </span> {restaurant.estimatedDeliveryTime} min
                                  </span>
                                )}
                              </span>
                            )}
                            
                            {/* Fixed lastUpdated display */}
                            {restaurant.lastUpdated && (
                              <span className="restaurant-updated">
                                Updated: {formatTimeAgo(restaurant.lastUpdated)}
                              </span>
                            )}
                          </div>
                          
                          {/* Line 4: Cuisine tags - one indicator per cuisine */}
                          {restaurant.cuisines && restaurant.cuisines.length > 0 && (
                            <div className="info-line-4">
                              {restaurant.cuisines.map((cuisine, index) => (
                                <span key={index} className="restaurant-cuisine">{cuisine}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No restaurants found. Try a different search term.</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="restaurant-map-side">
              <RestaurantMap
                restaurants={restaurants}
                selectedRestaurant={selectedRestaurant}
                onRestaurantSelect={handleRestaurantSelect}
                center={mapCenter}
                zoom={mapZoom}
                onZoomChange={handleZoomChange}
                fitBoundsFlag={fitBoundsFlag}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RestaurantList; 
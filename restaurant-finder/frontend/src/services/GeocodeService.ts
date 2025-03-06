/**
 * GeocodeService - Handles geocoding using OpenStreetMap Nominatim API
 * 
 * This service converts addresses and location names to coordinates
 * using the free OpenStreetMap Nominatim API.
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
  boundingBox?: [number, number, number, number]; // [minLat, maxLat, minLng, maxLng]
  displayName?: string;
  placeType?: string;
}

/**
 * Geocode an address or location name to coordinates using OpenStreetMap Nominatim API
 * 
 * @param address The address or location name to geocode
 * @param region The region bias (default: 'sg' for Singapore)
 * @returns Promise with the geocoding result containing lat and lng
 */
export const geocodeAddress = async (
  address: string,
  region: string = 'sg'
): Promise<GeocodingResult | null> => {
  try {
    // Ensure we have a value to geocode
    if (!address.trim()) {
      return null;
    }

    // Add Singapore context if not already present
    let searchQuery = address;
    if (!address.toLowerCase().includes('singapore')) {
      searchQuery += ', Singapore';
    }

    // Create the URL with the proper format for Nominatim
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json`;
    
    // Set a user agent as required by Nominatim Usage Policy
    const headers = {
      'User-Agent': 'RestaurantFinderApp/1.0'
    };

    console.log(`Geocoding "${searchQuery}" using Nominatim API`);
    
    // Make the API request
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Check if we got a valid result
    if (!data || data.length === 0) {
      console.warn(`No geocoding results for: ${address}`);
      return null;
    }

    // Extract the coordinates from the first result
    const result = data[0];
    
    // Parse coordinates
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Check if the coordinates are valid numbers
    if (isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid coordinates received from Nominatim API');
      return null;
    }
    
    // Extract bounding box if available
    let boundingBox = undefined;
    if (result.boundingbox && result.boundingbox.length === 4) {
      boundingBox = [
        parseFloat(result.boundingbox[0]), // minLat
        parseFloat(result.boundingbox[1]), // maxLat
        parseFloat(result.boundingbox[2]), // minLng
        parseFloat(result.boundingbox[3])  // maxLng
      ] as [number, number, number, number];
    }
    
    return {
      lat,
      lng,
      formattedAddress: result.display_name,
      displayName: result.display_name,
      placeType: result.type,
      boundingBox
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    
    // Fall back to mock geocoding for demonstration purposes
    return fallbackGeocoding(address);
  }
};

/**
 * Fallback geocoding function for when the API fails
 * This is just for demonstration purposes in the prototype
 */
const fallbackGeocoding = (address: string): GeocodingResult | null => {
  console.log('Using fallback geocoding for:', address);
  
  // Mock data for common Singapore locations
  const mockGeoData: Record<string, GeocodingResult> = {
    'clementi': { 
      lat: 1.3140256, 
      lng: 103.7624098,
      displayName: "Clementi, Southwest, Singapore",
      placeType: "suburb"
    },
    'jurong': { 
      lat: 1.3329, 
      lng: 103.7436,
      displayName: "Jurong, Southwest, Singapore",
      placeType: "suburb"
    },
    'orchard': { 
      lat: 1.3036, 
      lng: 103.8318,
      displayName: "Orchard Road, Downtown Core, Singapore, Central, Singapore",
      placeType: "road"
    },
    'tampines': { 
      lat: 1.3524, 
      lng: 103.9440,
      displayName: "Tampines, East Region, Singapore",
      placeType: "suburb"
    },
    'sengkang': { 
      lat: 1.3868, 
      lng: 103.8914,
      displayName: "Sengkang, Northeast, Singapore",
      placeType: "suburb"
    },
  };
  
  const normalizedQuery = address.toLowerCase();
  for (const [key, coords] of Object.entries(mockGeoData)) {
    if (normalizedQuery.includes(key)) {
      return coords;
    }
  }
  
  // If it's a postal code, return a fixed location
  if (/^\d{6}$/.test(address)) {
    return { 
      lat: 1.3237362, 
      lng: 103.7712417,
      displayName: `${address}, Singapore`,
      placeType: "postcode"
    };
  }
  
  return null;
}; 
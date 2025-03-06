export interface Restaurant {
  _id: string;
  grabId: string;
  name: string;
  address: string;
  area: string;
  cuisines: string[];
  photoUrl: string;
  isOpen?: boolean;
  priceLevel?: number;
  rating?: number;
  reviewCount?: number;
  estimatedDeliveryTime?: number;
  distanceInKm?: number;
  openingHours?: {
    displayedHours: string;
    sun: string;
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
  };
  location?: {
    type: string;
    coordinates: [number, number];
  };
  lastUpdated: string;
  score?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  count: number;
  data: T[];
  currentPage?: number;
  totalPages?: number;
}

export interface SearchParams {
  page?: number;
  limit?: number;
  area?: string;
  cuisine?: string;
  q?: string;
  // Location-based search parameters
  lat?: number;
  lng?: number;
  distance?: number;
  // New filter parameters
  openNow?: boolean;
  maxDeliveryTime?: number;
  minRating?: number;
  minReviews?: number;
} 
export interface GrabApiRequest {
  latlng: string;
  keyword: string;
  offset: number;
  pageSize: number;
  countryCode: string;
}

export interface GrabApiResponse {
  searchResult: {
    searchMerchants: GrabRestaurant[];
  };
}

export interface GrabRestaurant {
  id: string;
  address: {
    name: string;
  };
  latlng: {
    latitude: number;
    longitude: number;
  };
  estimatedDeliveryTime: number;
  merchantBrief: {
    cuisine: string[];
    photoHref: string;
    smallPhotoHref: string;
    iconHref: string;
    isIntegrated: boolean;
    openHours: {
      open: boolean;
      displayedHours: string;
      sun?: string;
      mon?: string;
      tue?: string;
      wed?: string;
      thu?: string;
      fri?: string;
      sat?: string;
    };
    distanceInKm: number;
    rating: number;
    vote_count: number;
    promo: object;
    deliverBy: string;
    displayInfo: {
      primaryText: string;
    };
    priceTag: number;
    deliverOptions: string;
  };
  chainID?: string;
  chainName?: string;
  businessType: string;
} 
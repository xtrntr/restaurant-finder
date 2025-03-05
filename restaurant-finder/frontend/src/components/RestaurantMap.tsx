import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Restaurant } from '../types';
import 'leaflet/dist/leaflet.css';

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

// Create a custom icon for restaurants
const restaurantIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Create a highlighted icon for selected restaurant
const selectedRestaurantIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [30, 46], // Slightly larger
  iconAnchor: [15, 46],
  popupAnchor: [1, -34],
  className: 'selected-marker-icon', // Custom class for additional styling
});

// Props interface
interface RestaurantMapProps {
  restaurants: Restaurant[];
  selectedRestaurant?: Restaurant | null;
  onRestaurantSelect?: (restaurant: Restaurant) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  onZoomChange?: (newZoom: number) => void;
  fitBoundsFlag?: number;
}

// MapMarkers component to handle marker creation and updates
const MapMarkers = ({ 
  restaurants, 
  selectedRestaurant, 
  onRestaurantSelect 
}: { 
  restaurants: Restaurant[], 
  selectedRestaurant?: Restaurant | null, 
  onRestaurantSelect: (restaurant: Restaurant) => void 
}) => {
  const map = useMap();
  const markersRef = useRef<{[key: string]: L.Marker}>({});
  const popupsRef = useRef<{[key: string]: L.Popup}>({});

  useEffect(() => {
    console.log('Step 1 [MapMarkers]: Updating markers for', restaurants.length, 'restaurants');
    const startTime = performance.now();

    const existingMarkerIds = Object.keys(markersRef.current);
    const currentMarkerIds: string[] = [];

    restaurants.forEach(restaurant => {
      if (!restaurant._id || !restaurant.location?.coordinates) return;

      currentMarkerIds.push(restaurant._id);
      const isSelected = selectedRestaurant?._id === restaurant._id;
      const icon = isSelected ? selectedRestaurantIcon : restaurantIcon;
      const position: [number, number] = [restaurant.location.coordinates[1], restaurant.location.coordinates[0]];

      let marker = markersRef.current[restaurant._id];
      if (marker) {
        marker.setIcon(icon);
        marker.setLatLng(position);
        marker.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        marker = L.marker(position, { icon, zIndexOffset: isSelected ? 1000 : 0 }).addTo(map);
        marker.on('click', () => onRestaurantSelect(restaurant));

        const popup = L.popup({ closeOnClick: false }).setContent(`
          <div class="restaurant-popup">
            <h3>${restaurant.name}</h3>
            <p>${restaurant.address}</p>
            <p>${restaurant.cuisines.join(', ')}</p>
            <div class="popup-details">
              ${restaurant.priceLevel ? `<span class="popup-price">${'$'.repeat(restaurant.priceLevel)}</span>` : ''}
              ${restaurant.rating ? `<span class="popup-rating">★ ${restaurant.rating.toFixed(1)} ${restaurant.reviewCount ? ` (${restaurant.reviewCount})` : ''}</span>` : ''}
            </div>
            ${restaurant.openingHours ? `<p class="popup-hours"><strong>Hours today:</strong> ${(() => {
              const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
              const today = days[new Date().getDay()];
              return restaurant.openingHours[today as keyof typeof restaurant.openingHours] || restaurant.openingHours.displayedHours || 'N/A';
            })()}</p>` : ''}
            ${restaurant.estimatedDeliveryTime ? `<p class="popup-delivery"><span>🕒</span> ${restaurant.estimatedDeliveryTime} min</p>` : ''}
            ${restaurant.isOpen !== undefined ? `<p class="popup-status ${restaurant.isOpen ? 'open' : 'closed'}">${restaurant.isOpen ? 'Open Now' : 'Closed'}</p>` : ''}
            <p class="popup-updated">Last updated: ${formatTimeAgo(restaurant.lastUpdated)}</p>
            <a href="/restaurant/${restaurant._id}">View Details</a>
          </div>
        `);
        marker.bindPopup(popup);
        markersRef.current[restaurant._id] = marker;
        popupsRef.current[restaurant._id] = popup;

        marker.on('popupopen', () => {
          if (selectedRestaurant?._id !== restaurant._id) onRestaurantSelect(restaurant);
        });
      }
    });

    existingMarkerIds.forEach(id => {
      if (!currentMarkerIds.includes(id)) {
        markersRef.current[id]?.remove();
        delete markersRef.current[id];
        delete popupsRef.current[id];
      }
    });

    console.log('Step 1 [MapMarkers]: Marker update complete in', (performance.now() - startTime).toFixed(2), 'ms');
  }, [restaurants, selectedRestaurant, map, onRestaurantSelect]);

  // Open popup for selected restaurant
  useEffect(() => {
    if (selectedRestaurant?._id && markersRef.current[selectedRestaurant._id]) {
      setTimeout(() => {
        markersRef.current[selectedRestaurant._id].openPopup();
      }, 200);
    }
  }, [selectedRestaurant]);

  return null;
};

// MapBounds component to handle map bounds fitting
const MapBounds = ({ 
  restaurants, 
  fitBoundsFlag, 
  onZoomChange 
}: { 
  restaurants: Restaurant[], 
  fitBoundsFlag: number, 
  onZoomChange?: (zoom: number) => void 
}) => {
  const map = useMap();
  const isAnimatingRef = useRef(false);

  const createBoundsFromRestaurants = (restaurantList: Restaurant[]): L.LatLngBounds => {
    console.log('Step 2 [MapBounds]: Creating bounds from', restaurantList.length, 'restaurants');
    const validRestaurants = restaurantList.filter(
      r => r?.location?.coordinates?.length === 2 && 
           typeof r.location.coordinates[0] === 'number' && 
           typeof r.location.coordinates[1] === 'number' && 
           !isNaN(r.location.coordinates[0]) && 
           !isNaN(r.location.coordinates[1])
    );

    if (validRestaurants.length === 0) {
      console.warn('Step 2 [MapBounds]: No valid coordinates, using default');
      return L.latLngBounds([1.2521, 103.7198], [1.4521, 103.9198]);
    }

    const bounds = L.latLngBounds([]);
    validRestaurants.forEach(r => {
      // Since we already filtered for valid coordinates, we can safely assert that location exists
      if (r.location && r.location.coordinates) {
        bounds.extend([r.location.coordinates[1], r.location.coordinates[0]]);
      }
    });

    const center = bounds.getCenter();
    const minSize = 0.01;
    if (bounds.getNorth() - bounds.getSouth() < minSize || bounds.getEast() - bounds.getWest() < minSize) {
      bounds.extend([center.lat - minSize/2, center.lng - minSize/2]);
      bounds.extend([center.lat + minSize/2, center.lng + minSize/2]);
    }

    console.log('Step 2 [MapBounds]: Bounds:', bounds.toBBoxString());
    return bounds;
  };

  useEffect(() => {
    if (!map || isAnimatingRef.current) {
      console.log('Step 2 [MapBounds]: Map not ready or animating, skipping');
      return;
    }

    console.log('Step 2 [MapBounds]: Fitting bounds, restaurants:', restaurants.length, 'fitBoundsFlag:', fitBoundsFlag);
    isAnimatingRef.current = true;

    const bounds = createBoundsFromRestaurants(restaurants);
    if (restaurants.length > 1) {
      // Multi-restaurant case: 80x80 in 100x100 (10% padding all around)
      const { clientWidth, clientHeight } = map.getContainer();
      const padX = clientWidth * 0.1;  // 10% padding on left and right
      const padY = clientHeight * 0.1; // 10% padding on top and bottom
      console.log(`Step 2 [MapBounds]: Using 10% padding for 80x80 markers in 100x100 view: ${padX}x${padY} pixels`);
      map.fitBounds(bounds, { padding: [padY, padX], animate: true, duration: 0.5, maxZoom: 15 });
    } else if (restaurants.length === 1 && restaurants[0].location?.coordinates) {
      // Single restaurant: center without padding
      // Add additional check for location and coordinates
      const coordinates = restaurants[0].location.coordinates;
      const center: [number, number] = [coordinates[1], coordinates[0]];
      map.setView(center, 15, { animate: true, duration: 0.5 });
    }

    const timeout = setTimeout(() => {
      isAnimatingRef.current = false;
      if (onZoomChange) onZoomChange(map.getZoom());
      console.log('Step 2 [MapBounds]: Fit complete, center:', map.getCenter());
    }, 600);

    return () => clearTimeout(timeout);
  }, [map, restaurants, fitBoundsFlag, onZoomChange]);

  return null;
};

// Main component
const RestaurantMap: React.FC<RestaurantMapProps> = ({
  restaurants,
  selectedRestaurant = null,
  onRestaurantSelect = () => {},
  center = [1.3521, 103.8198],
  zoom = 12,
  height = '500px',
  onZoomChange,
  fitBoundsFlag = 0,
}) => {
  const [showNoMarkers, setShowNoMarkers] = useState(false);

  useEffect(() => {
    const validRestaurants = restaurants.filter(
      r => r?.location?.coordinates?.length === 2 && 
           typeof r.location.coordinates[0] === 'number' && 
           typeof r.location.coordinates[1] === 'number'
    );
    setShowNoMarkers(restaurants.length > 0 && validRestaurants.length === 0);
  }, [restaurants]);

  return (
    <div className="restaurant-map-container" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ZoomControl position="topright" />
        <MapMarkers 
          restaurants={restaurants}
          selectedRestaurant={selectedRestaurant}
          onRestaurantSelect={onRestaurantSelect}
        />
        <MapBounds 
          restaurants={restaurants}
          fitBoundsFlag={fitBoundsFlag}
          onZoomChange={onZoomChange}
        />
      </MapContainer>
      {showNoMarkers && (
        <div className="map-notification">
          No valid coordinates found for current restaurants
        </div>
      )}
    </div>
  );
};

export default React.memo(RestaurantMap);
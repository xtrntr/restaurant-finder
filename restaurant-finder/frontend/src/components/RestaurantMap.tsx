import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Component to update the map view when center/zoom props change
// Use a gentler approach with flyTo instead of setView for smoother transitions
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    // Only fly to the location - don't force a specific zoom level
    // This keeps the current zoom level when centering on a restaurant
    map.flyTo(center, map.getZoom(), {
      duration: 0.75 // Shorter animation duration
    });
  }, [center, map]);
  
  return null;
};

interface RestaurantMapProps {
  restaurants: Restaurant[];
  selectedRestaurant?: Restaurant | null;
  onRestaurantSelect?: (restaurant: Restaurant) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

const RestaurantMap: React.FC<RestaurantMapProps> = ({
  restaurants,
  selectedRestaurant = null,
  onRestaurantSelect = () => {},
  center = [1.3521, 103.8198], // Default center on Singapore
  zoom = 12,
  height = '500px',
}) => {
  // Keep track of open popups
  const markerRefs = React.useRef<{[key: string]: L.Marker | null}>({});
  const popupRefs = React.useRef<{[key: string]: L.Popup | null}>({});
  
  // Fix Leaflet's default icon paths
  React.useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);

  // Open popup for selected restaurant
  React.useEffect(() => {
    if (selectedRestaurant && selectedRestaurant._id && markerRefs.current[selectedRestaurant._id]) {
      const marker = markerRefs.current[selectedRestaurant._id];
      if (marker) {
        // Use setTimeout to ensure the marker is properly added to the map
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    }
  }, [selectedRestaurant]);

  // Filter out restaurants without valid location data
  const validRestaurants = restaurants.filter(
    restaurant => restaurant && restaurant.location && 
    Array.isArray(restaurant.location.coordinates) && 
    restaurant.location.coordinates.length === 2
  );

  const getMarkerIcon = (isSelected: boolean): L.Icon => {
    return isSelected ? selectedRestaurantIcon : restaurantIcon;
  };

  return (
    <div className="restaurant-map-container">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <MapUpdater center={center} zoom={zoom} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {restaurants.map((restaurant) => {
          if (!restaurant.location || !restaurant.location.coordinates) return null;
          
          const isSelected = selectedRestaurant ? selectedRestaurant._id === restaurant._id : false;
          
          return (
            <Marker
              key={restaurant._id}
              ref={(marker) => { markerRefs.current[restaurant._id] = marker; }}
              position={[restaurant.location.coordinates[1], restaurant.location.coordinates[0]]}
              icon={getMarkerIcon(isSelected)}
              eventHandlers={{
                click: () => onRestaurantSelect(restaurant)
              }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup
                ref={(popup) => { popupRefs.current[restaurant._id] = popup; }}
                closeOnClick={false}
                eventHandlers={{
                  popupopen: () => {
                    if (selectedRestaurant?._id !== restaurant._id) {
                      onRestaurantSelect(restaurant);
                    }
                  }
                }}
              >
                <div className="restaurant-popup">
                  <h3>{restaurant.name}</h3>
                  <p>{restaurant.address}</p>
                  <p>{restaurant.cuisines.join(', ')}</p>
                  
                  {/* Add price level and rating with review count */}
                  <div className="popup-details">
                    {restaurant.priceLevel && (
                      <span className="popup-price">{'$'.repeat(restaurant.priceLevel)}</span>
                    )}
                    {restaurant.rating && (
                      <span className="popup-rating">
                        ★ {restaurant.rating.toFixed(1)}
                        {restaurant.reviewCount && <span> ({restaurant.reviewCount})</span>}
                      </span>
                    )}
                  </div>
                  
                  {/* Add opening hours for current day */}
                  {restaurant.openingHours && (
                    <p className="popup-hours">
                      <strong>Hours today:</strong> {(() => {
                        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                        const today = days[new Date().getDay()];
                        return restaurant.openingHours[today as keyof typeof restaurant.openingHours] || restaurant.openingHours.displayedHours;
                      })()}
                    </p>
                  )}
                  
                  {/* Add estimated delivery time */}
                  {restaurant.estimatedDeliveryTime && (
                    <p className="popup-delivery">
                      <span>🕒</span> {restaurant.estimatedDeliveryTime} min delivery
                    </p>
                  )}
                  
                  {/* Display open/closed status */}
                  {restaurant.isOpen !== undefined && (
                    <p className={`popup-status ${restaurant.isOpen ? 'open' : 'closed'}`}>
                      {restaurant.isOpen ? 'Open Now' : 'Closed'}
                    </p>
                  )}
                  
                  {/* Add last updated date */}
                  <p className="popup-updated">
                    Last updated: {formatTimeAgo(restaurant.lastUpdated)}
                  </p>
                  
                  <a href={`/restaurant/${restaurant._id}`}>View Details</a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default RestaurantMap; 
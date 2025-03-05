import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Restaurant } from '../types';
import 'leaflet/dist/leaflet.css';

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

// MapUpdater component to handle center and zoom changes
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
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
                  {restaurant.rating && <p>Rating: {restaurant.rating.toFixed(1)}</p>}
                  {restaurant.isOpen !== undefined && (
                    <p>{restaurant.isOpen ? 'Open Now' : 'Closed'}</p>
                  )}
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
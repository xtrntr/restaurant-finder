import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Restaurant } from '../types';
import RestaurantMap from './RestaurantMap';

const RestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/restaurants/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant details');
        }
        
        const data = await response.json();
        setRestaurant(data.data);
        setError(null);
      } catch (err) {
        setError('An error occurred while fetching restaurant details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurant();
    }
  }, [id]);

  if (loading) {
    return <div className="loading">Loading restaurant details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!restaurant) {
    return <div className="not-found">Restaurant not found</div>;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="restaurant-detail">
      <div className="back-link">
        <Link to="/restaurants">&larr; Back to Restaurants</Link>
      </div>
      
      <div className="restaurant-header">
        {restaurant.photoUrl && (
          <div className="restaurant-image">
            <img src={restaurant.photoUrl} alt={restaurant.name} />
          </div>
        )}
        <div className="restaurant-title">
          <h1>{restaurant.name}</h1>
          <p className="restaurant-cuisines">{restaurant.cuisines.join(', ')}</p>
          <div className="restaurant-meta">
            {restaurant.rating && (
              <span className="rating">
                ★ {restaurant.rating.toFixed(1)}
                {restaurant.reviewCount && (
                  <span className="review-count"> ({restaurant.reviewCount} reviews)</span>
                )}
              </span>
            )}
            {restaurant.priceLevel && (
              <span className="price-level">
                {'$'.repeat(restaurant.priceLevel)}
              </span>
            )}
            {restaurant.isOpen !== undefined && (
              <span className={`open-status ${restaurant.isOpen ? 'open' : 'closed'}`}>
                {restaurant.isOpen ? 'Open Now' : 'Closed'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="restaurant-content">
        <div className="restaurant-info-panel">
          <div className="info-section">
            <h2>Location</h2>
            <p className="address">{restaurant.address}</p>
            <p className="area">Area: {restaurant.area}</p>
            {restaurant.distanceInKm !== undefined && (
              <p className="distance">Distance: {restaurant.distanceInKm.toFixed(1)} km</p>
            )}
            {restaurant.location && (
              <div className="map-container" style={{ height: '300px', marginTop: '20px' }}>
                <RestaurantMap 
                  restaurants={[restaurant]} 
                  center={[restaurant.location.coordinates[1], restaurant.location.coordinates[0]]}
                  zoom={15}
                  height="300px"
                />
              </div>
            )}
          </div>
          
          {restaurant.estimatedDeliveryTime && (
            <div className="info-section">
              <h2>Delivery</h2>
              <p className="delivery-time">Estimated Delivery Time: {restaurant.estimatedDeliveryTime} minutes</p>
            </div>
          )}
          
          {restaurant.openingHours && (
            <div className="info-section">
              <h2>Opening Hours</h2>
              <p className="hours-today">{restaurant.openingHours.displayedHours}</p>
              <div className="hours-all">
                <div className="day-row">
                  <span className="day">Monday:</span>
                  <span className="hours">{restaurant.openingHours.mon || 'Closed'}</span>
                </div>
                <div className="day-row">
                  <span className="day">Tuesday:</span>
                  <span className="hours">{restaurant.openingHours.tue || 'Closed'}</span>
                </div>
                <div className="day-row">
                  <span className="day">Wednesday:</span>
                  <span className="hours">{restaurant.openingHours.wed || 'Closed'}</span>
                </div>
                <div className="day-row">
                  <span className="day">Thursday:</span>
                  <span className="hours">{restaurant.openingHours.thu || 'Closed'}</span>
                </div>
                <div className="day-row">
                  <span className="day">Friday:</span>
                  <span className="hours">{restaurant.openingHours.fri || 'Closed'}</span>
                </div>
                <div className="day-row">
                  <span className="day">Saturday:</span>
                  <span className="hours">{restaurant.openingHours.sat || 'Closed'}</span>
                </div>
                <div className="day-row">
                  <span className="day">Sunday:</span>
                  <span className="hours">{restaurant.openingHours.sun || 'Closed'}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="info-section">
            <h2>Additional Info</h2>
            <p className="last-updated">Last Updated: {formatDate(restaurant.lastUpdated)}</p>
            <p className="grab-id">ID: {restaurant.grabId}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetail; 
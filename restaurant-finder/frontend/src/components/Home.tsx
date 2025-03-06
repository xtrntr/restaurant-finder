import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div>
      <section className="hero">
        <h1>Find the Perfect Restaurant</h1>
        <p>
          Discover amazing restaurants around Singapore. Filter by cuisine,
          location, and more to find your next favorite place to eat.
        </p>
        <Link to="/restaurants" className="cta-button">
          Explore Restaurants
        </Link>
      </section>

      <section className="container">
        <h2>Popular Cuisines</h2>
        <div className="restaurant-grid">
          <div className="restaurant-card">
            <h3>Chinese</h3>
            <p>Explore authentic Chinese dishes from across regions</p>
            <Link to="/restaurants?cuisine=Chinese">View Chinese Restaurants</Link>
          </div>
          <div className="restaurant-card">
            <h3>Japanese</h3>
            <p>Discover sushi, ramen, and more Japanese favorites</p>
            <Link to="/restaurants?cuisine=Japanese">View Japanese Restaurants</Link>
          </div>
          <div className="restaurant-card">
            <h3>Italian</h3>
            <p>Find the best pizza, pasta, and Italian cuisine</p>
            <Link to="/restaurants?cuisine=Italian">View Italian Restaurants</Link>
          </div>
          <div className="restaurant-card">
            <h3>Local &amp; Malaysian</h3>
            <p>Try delicious local dishes and Malaysian flavors</p>
            <Link to="/restaurants?cuisine=Local%20%26%20Malaysian">View Local Restaurants</Link>
          </div>
        </div>
      </section>

      <section className="container">
        <h2>Popular Areas</h2>
        <div className="restaurant-grid">
          <div className="restaurant-card">
            <h3>Orchard</h3>
            <p>Explore dining options in Singapore's shopping district</p>
            <Link to="/restaurants?area=Orchard">View Restaurants in Orchard</Link>
          </div>
          <div className="restaurant-card">
            <h3>Chinatown</h3>
            <p>Discover authentic flavors in the heart of Chinatown</p>
            <Link to="/restaurants?area=Chinatown">View Restaurants in Chinatown</Link>
          </div>
          <div className="restaurant-card">
            <h3>Jurong East</h3>
            <p>Find great dining options in the western region</p>
            <Link to="/restaurants?area=Jurong%20East">View Restaurants in Jurong East</Link>
          </div>
          <div className="restaurant-card">
            <h3>Tampines</h3>
            <p>Explore restaurants in the eastern part of Singapore</p>
            <Link to="/restaurants?area=Tampines">View Restaurants in Tampines</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import RestaurantList from './components/RestaurantList';
import RestaurantDetail from './components/RestaurantDetail';

function App() {
  return (
    <Router>
      <div className="App">
        <main className="container">
          <Routes>
            <Route path="/" element={<Navigate to="/restaurants" replace />} />
            <Route path="/restaurants" element={<RestaurantList />} />
            <Route path="/restaurants/:id" element={<RestaurantDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 
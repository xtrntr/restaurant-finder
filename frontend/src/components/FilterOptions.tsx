import React from 'react';

interface FilterOptionsProps {
  filters: {
    openNow: boolean;
    deliveryUnder30: boolean;
    minRating: number | null;
    minReviews: number | null;
  };
  onFilterChange: (filterName: string, value: any) => void;
}

const FilterOptions: React.FC<FilterOptionsProps> = ({ filters, onFilterChange }) => {
  // Rating options for dropdown with string values to avoid potential issues with HTML forms
  const ratingOptions = [
    { value: '', label: 'Any Rating' },
    { value: '2', label: '2+ ★' },
    { value: '2.5', label: '2.5+ ★' },
    { value: '3', label: '3+ ★' },
    { value: '3.5', label: '3.5+ ★' },
    { value: '4', label: '4+ ★' },
    { value: '4.5', label: '4.5+ ★' },
    { value: '5', label: '5 ★' }
  ];

  return (
    <div className="filter-options-inline">
      <div className="filter-buttons-inline">
        <button 
          type="button"
          className={`filter-toggle ${filters.openNow ? 'active' : ''}`}
          onClick={() => onFilterChange('openNow', !filters.openNow)}
        >
          <span className="filter-icon">🕒</span> Open Now
        </button>
        
        <button 
          type="button"
          className={`filter-toggle ${filters.deliveryUnder30 ? 'active' : ''}`}
          onClick={() => onFilterChange('deliveryUnder30', !filters.deliveryUnder30)}
        >
          <span className="filter-icon">🚚</span> Under 30 mins
        </button>
      
        <div className="filter-dropdown-inline">
          <select 
            id="minRating"
            value={filters.minRating === null ? '' : filters.minRating}
            onChange={(e) => {
              console.log('Rating selected:', e.target.value);
              console.log('Parsed rating:', e.target.value ? parseFloat(e.target.value) : null);
              onFilterChange('minRating', e.target.value ? parseFloat(e.target.value) : null);
            }}
            aria-label="Minimum Rating"
          >
            {ratingOptions.map(option => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-dropdown-inline">
          <input 
            type="number" 
            id="minReviews"
            min="0"
            value={filters.minReviews === null ? '' : filters.minReviews}
            onChange={(e) => onFilterChange('minReviews', e.target.value ? parseInt(e.target.value, 10) : null)}
            placeholder="Min Reviews"
            aria-label="Minimum Reviews"
            className="min-reviews-input"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterOptions; 
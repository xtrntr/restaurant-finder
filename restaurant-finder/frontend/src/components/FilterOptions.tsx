import React from 'react';

interface FilterOptionsProps {
  filters: {
    openNow: boolean;
    maxDeliveryTime: boolean;
    minRating: number | null;
    minReviews: number | null;
  };
  onFilterChange: (filterName: string, value: any) => void;
}

const FilterOptions: React.FC<FilterOptionsProps> = ({ filters, onFilterChange }) => {
  // Rating options for dropdown
  const ratingOptions = [
    { value: null, label: 'Any Rating' },
    { value: 2, label: '2+ ★' },
    { value: 2.5, label: '2.5+ ★' },
    { value: 3, label: '3+ ★' },
    { value: 3.5, label: '3.5+ ★' },
    { value: 4, label: '4+ ★' },
    { value: 4.5, label: '4.5+ ★' }
  ];

  return (
    <div className="filter-options">
      <div className="filter-buttons">
        <button 
          type="button"
          className={`filter-toggle ${filters.openNow ? 'active' : ''}`}
          onClick={() => onFilterChange('openNow', !filters.openNow)}
        >
          <span className="filter-icon">🕒</span> Open Now
        </button>
        
        <button 
          type="button"
          className={`filter-toggle ${filters.maxDeliveryTime ? 'active' : ''}`}
          onClick={() => onFilterChange('maxDeliveryTime', !filters.maxDeliveryTime)}
        >
          <span className="filter-icon">🚚</span> Under 30 mins
        </button>
      </div>
      
      <div className="filter-dropdowns">
        <div className="filter-group">
          <label htmlFor="minRating">Minimum Rating:</label>
          <select 
            id="minRating"
            value={filters.minRating === null ? '' : filters.minRating}
            onChange={(e) => onFilterChange('minRating', e.target.value ? parseFloat(e.target.value) : null)}
          >
            {ratingOptions.map(option => (
              <option key={option.label} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="minReviews">Minimum Reviews:</label>
          <input 
            type="number" 
            id="minReviews"
            min="0"
            value={filters.minReviews === null ? '' : filters.minReviews}
            onChange={(e) => onFilterChange('minReviews', e.target.value ? parseInt(e.target.value, 10) : null)}
            placeholder="Any"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterOptions; 
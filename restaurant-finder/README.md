# Restaurant Finder

A full-stack application that displays restaurants on a map with filtering and search capabilities. This project consists of three main components:

1. **Scraper**: A Node.js service that periodically collects restaurant data from the Grab Food API.
2. **Backend**: A RESTful API that serves restaurant data with advanced search and geospatial filtering.
3. **Frontend**: A React application that displays restaurants in both a list and on a map.

## Project Structure

```
restaurant-finder/
├── scraper/        # Data collection service
├── backend/        # API server
├── frontend/       # React web application
├── data/           # Shared data files
└── docker-compose.yml  # Docker Compose configuration
```

## Features

- Interactive map with restaurant pins
- Synchronized list and map views
- Click interaction between list and map
- Search by location or restaurant name
- Popup information for restaurants
- Periodic data scraping with API rate limit handling
- Geospatial database queries

## Tech Stack

### Backend
- Node.js with Express
- MongoDB with geospatial indexing
- TypeScript

### Frontend
- React with TypeScript
- Leaflet for maps
- TailwindCSS for styling

### Infrastructure
- Docker for containerization
- MongoDB for database

## Getting Started

### Prerequisites

- Node.js v16+
- MongoDB (local or remote)
- Docker and Docker Compose (for containerized deployment)

### Running with Docker Compose

The easiest way to run the entire application is using Docker Compose:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Running Locally

Each component can also be run locally. See the README in each component directory for detailed instructions.

## Development

See the individual README files in each component directory for specific development instructions:

- [Scraper README](./scraper/README.md)
- [Backend README](./backend/README.md)
- Frontend README (coming soon)

## License

MIT 
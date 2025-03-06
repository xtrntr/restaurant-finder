# Restaurant Finder - Backend API

A RESTful API for the Restaurant Finder application that serves restaurant data with advanced search and geospatial capabilities.

## Features

- RESTful API for restaurant data
- MongoDB with geospatial indexing
- Text search for restaurant names, cuisines, and areas
- Location-based searching (find restaurants near coordinates)
- Area-based filtering
- Comprehensive error handling
- Rate limiting
- Security measures (CORS, Helmet)

## Prerequisites

- Node.js v16+
- MongoDB
- Docker (optional, for containerized deployment)

## Installation

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```
   # Server Configuration
   PORT=4000
   NODE_ENV=development

   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/restaurant-finder

   # API Rate Limiting
   RATE_LIMIT_WINDOW_MS=15000
   RATE_LIMIT_MAX=100

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

3. Ensure your MongoDB instance is running.

## Usage

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Running Tests

```bash
npm test
```

## Docker Deployment

You can build and run the backend using Docker:

```bash
docker build -t restaurant-finder-backend .
docker run -p 4000:4000 -e MONGODB_URI=mongodb://host.docker.internal:27017/restaurant-finder restaurant-finder-backend
```

Or using docker-compose from the parent directory:

```bash
docker-compose up -d backend
```

## API Endpoints

### Restaurants

- `GET /api/restaurants` - Get all restaurants with pagination
- `GET /api/restaurants/:id` - Get a specific restaurant by ID
- `GET /api/restaurants/search?q=query` - Search restaurants by name, cuisine, or area
- `GET /api/restaurants/near?latitude=1.2&longitude=103.8&maxDistance=2000` - Get restaurants near location
- `GET /api/restaurants/area/:area` - Get restaurants by area
- `GET /api/restaurants/cuisines` - Get all available cuisines
- `GET /api/restaurants/areas` - Get all available areas

## License

MIT 
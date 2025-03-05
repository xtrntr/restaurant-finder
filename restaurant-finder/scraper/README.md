# Restaurant Finder - Scraper

A scraper service for fetching restaurant data from Grab Food API.

## Features

- Fetches restaurants from the Grab Food API based on geographical coordinates
- Supports paginated fetching to get all restaurants
- Handles rate limiting (429 responses) with exponential backoff
- Concurrent processing with configurable limits
- Stores restaurant data in MongoDB with geospatial indexing
- CSV-based coordinates input
- Detailed logging

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
   # API Configuration
   REQUEST_DELAY_MS=2000
   MAX_RETRIES=5
   CONCURRENT_REQUESTS=2

   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/restaurant-finder

   # Input/Output
   COORDINATES_FILE=../data/coordinates.csv
   ```

3. Ensure your MongoDB instance is running.

4. Prepare your coordinates CSV file with the following structure:
   ```
   name,latitude,longitude
   Location1,1.123456,103.123456
   Location2,1.234567,103.234567
   ```

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

You can build and run the scraper using Docker:

```bash
docker build -t restaurant-finder-scraper .
docker run -e MONGODB_URI=mongodb://host.docker.internal:27017/restaurant-finder restaurant-finder-scraper
```

Or using docker-compose from the parent directory:

```bash
docker-compose up -d scraper
```

## Configuration

The following environment variables can be configured:

| Variable | Description | Default |
|----------|-------------|---------|
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/restaurant-finder |
| COORDINATES_FILE | Path to the CSV file with coordinates | ../data/coordinates.csv |
| REQUEST_DELAY_MS | Delay between API requests in milliseconds | 2000 |
| MAX_RETRIES | Maximum number of retries for failed requests | 5 |
| CONCURRENT_REQUESTS | Number of concurrent operations | 2 |

## License

MIT 
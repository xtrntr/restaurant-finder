FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build TypeScript files
RUN npm run build

# Create logs directory
RUN mkdir -p logs

# Set environment variables
ENV NODE_ENV=production

# Run the scraper
CMD ["node", "dist/index.js"] 
# Build stage for React frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm install

# Copy client source
COPY client/ ./

# Build the React app
RUN npm run build

# Build stage for the full application
FROM node:18-alpine

WORKDIR /app

# Copy server package files
COPY package*.json ./

# Install server dependencies only (production)
RUN npm install --only=production

# Copy server source
COPY server/ ./server/

# Copy built React app from frontend-build stage
COPY --from=frontend-build /app/client/build ./client/build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/index.js"]

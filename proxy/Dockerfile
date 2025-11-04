# Stage 1: Build React app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build the React app
RUN npm run build

# Stage 2: Nginx
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY proxy/nginx.conf /etc/nginx/conf.d/

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create uploads directory
RUN mkdir -p /usr/share/nginx/html/uploads

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

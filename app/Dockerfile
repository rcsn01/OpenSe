FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the Vite development port
EXPOSE 5173

# Start the app with host binding so it's accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]
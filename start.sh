#!/bin/bash

echo "🚀 Starting Fill The Shelf Application..."
echo ""

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null
then
    echo "❌ docker-compose could not be found. Please install Docker and Docker Compose first."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Build and start the containers
echo "📦 Building and starting containers..."
docker-compose up --build -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Application started successfully!"
    echo ""
    echo "📱 Access the application at: http://localhost:3000"
    echo ""
    echo "📝 Sample QR codes to test:"
    echo "   - product-01"
    echo "   - product-02"
    echo "   - product-03"
    echo ""
    echo "🛑 To stop the application, run: docker-compose down"
    echo ""
    echo "📊 To view logs, run: docker-compose logs -f"
else
    echo ""
    echo "❌ Failed to start the application"
    exit 1
fi
